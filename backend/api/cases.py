"""
Healtheon — Cases API Router

Endpoints:
    POST   /api/cases              Create a new case and trigger background pipeline
    GET    /api/cases              List all cases (paginated, newest first)
    GET    /api/cases/{id}         Get full case details (transcript + summary + investigations)
    POST   /api/cases/{id}/run     Re-trigger the pipeline for a failed/pending case
    DELETE /api/cases/{id}         Soft delete a case (only if not processing)
"""
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from backend.auth import get_current_user, TokenData
from backend.db.database import get_db
from backend.db.models import Case, CaseStatus
from backend.db.models_extended import CaseFeedback
from backend.orchestration.runner import run_case_pipeline

router = APIRouter(prefix="/api/cases", tags=["cases"])
logger = logging.getLogger("healtheon.api.cases")


# ── Request / Response Schemas ─────────────────────────────────────────────

class CaseCreateRequest(BaseModel):
    chief_complaint: str = Field(..., min_length=3, max_length=500,
                                  description="Primary symptom or reason for visit")

    @validator('chief_complaint')
    def validate_chief_complaint(cls, v):
        if not v or not v.strip():
            raise ValueError('Chief complaint cannot be empty or whitespace only')
        return v.strip()
    onset: Optional[str] = Field(None, max_length=200)
    duration: Optional[str] = Field(None, max_length=200)
    severity: Optional[int] = Field(None, ge=1, le=10)
    associated_symptoms: Optional[str] = Field(None, max_length=1000)
    past_medical_history: Optional[str] = Field(None, max_length=1000)
    current_medications: Optional[str] = Field(None, max_length=1000)
    allergies: Optional[str] = Field(None, max_length=500)

    class Config:
        json_schema_extra = {
            "example": {
                "chief_complaint": "Severe crushing chest pain",
                "onset": "2 hours ago",
                "duration": "Ongoing",
                "severity": 9,
                "associated_symptoms": "Diaphoresis, nausea, left arm radiation",
                "past_medical_history": "Hypertension, Type 2 Diabetes Mellitus",
                "current_medications": "Metformin 500mg BD, Lisinopril 10mg OD",
                "allergies": "None known",
            }
        }


def _build_symptoms_prompt(req: CaseCreateRequest) -> str:
    """Converts the request into a natural-language summary for the Intake Agent."""
    parts = [f"Chief Complaint: {req.chief_complaint}"]
    if req.onset:
        parts.append(f"Onset: {req.onset}")
    if req.duration:
        parts.append(f"Duration: {req.duration}")
    if req.severity:
        parts.append(f"Severity: {req.severity}/10")
    if req.associated_symptoms:
        parts.append(f"Associated Symptoms: {req.associated_symptoms}")
    if req.past_medical_history:
        parts.append(f"Past Medical History: {req.past_medical_history}")
    if req.current_medications:
        parts.append(f"Current Medications: {req.current_medications}")
    if req.allergies:
        parts.append(f"Allergies: {req.allergies}")
    return " | ".join(parts)


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("", status_code=202)
async def create_case(
    req: CaseCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """
    Create a new case and kick off the AutoGen pipeline in the background.
    Returns immediately with a case_id and status='processing'.
    Poll GET /api/cases/{id} to check completion.
    """
    case_id = str(uuid.uuid4())
    symptoms_prompt = _build_symptoms_prompt(req)

    new_case = Case(
        id=case_id,
        chief_complaint=req.chief_complaint,
        onset=req.onset,
        duration=req.duration,
        severity=req.severity,
        associated_symptoms=req.associated_symptoms,
        past_medical_history=req.past_medical_history,
        current_medications=req.current_medications,
        allergies=req.allergies,
        status=CaseStatus.PENDING,
    )
    db.add(new_case)
    db.commit()

    # Trigger background task (runs AutoGen pipeline asynchronously)
    background_tasks.add_task(run_case_pipeline, case_id, symptoms_prompt)
    logger.info(f"Case {case_id} created. Pipeline queued.")

    return {
        "case_id": case_id,
        "status": "processing",
        "message": "Case received. AI agents are analyzing. Poll GET /api/cases/{id} for results.",
    }


@router.get("")
async def list_cases(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: TokenData = Depends(get_current_user),
):
    """List all cases, newest first. Supports pagination."""
    cases = (
        db.query(Case)
        .order_by(Case.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    total = db.query(Case).count()

    return {
        "total": total,
        "cases": [c.to_dict() for c in cases],
    }


@router.get("/{case_id}")
async def get_case(case_id: str, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """
    Retrieve full case details including the agent transcript, summary, and investigation suggestions.
    If status is 'processing', transcript will be empty — keep polling.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    result = case.to_dict()
    result["transcript"] = [m.to_dict() for m in case.messages]
    result["investigations"] = [i.to_dict() for i in case.investigations]
    result["summary"] = case.summary.to_dict() if case.summary else None
    return result


@router.post("/{case_id}/run", status_code=202)
async def rerun_case(
    case_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Re-trigger the pipeline for a FAILED or PENDING case."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")
    if case.status == CaseStatus.PROCESSING:
        raise HTTPException(status_code=409, detail="Case is already processing.")

    # Clear old transcript and mark as processing atomically
    from backend.db.models import Message, InvestigationSuggestion, CaseSummary
    db.query(Message).filter(Message.case_id == case_id).delete()
    db.query(InvestigationSuggestion).filter(InvestigationSuggestion.case_id == case_id).delete()
    db.query(CaseSummary).filter(CaseSummary.case_id == case_id).delete()
    case.status = CaseStatus.PROCESSING
    case.error_message = None
    db.commit()

    symptoms_prompt = _build_symptoms_prompt(CaseCreateRequest(
        chief_complaint=case.chief_complaint,
        onset=case.onset,
        duration=case.duration,
        severity=case.severity,
        associated_symptoms=case.associated_symptoms,
        past_medical_history=case.past_medical_history,
        current_medications=case.current_medications,
        allergies=case.allergies,
    ))

    background_tasks.add_task(run_case_pipeline, case_id, symptoms_prompt)
    return {"case_id": case_id, "status": "requeued"}


@router.delete("/{case_id}")
def delete_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Soft delete a case. Cannot delete cases that are currently processing."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    if case.status == CaseStatus.PROCESSING:
        raise HTTPException(status_code=409, detail="Cannot delete a case that is currently processing.")

    case.status = CaseStatus.FAILED
    case.error_message = "Deleted by user"
    db.commit()

    return {"detail": "Case deleted", "case_id": case_id}


@router.post("/{case_id}/feedback")
async def submit_feedback(
    case_id: str,
    was_helpful: bool,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Submit thumbs up/down feedback on AI analysis quality."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    # Check for existing feedback from this user on this case
    existing = db.query(CaseFeedback).filter(
        CaseFeedback.case_id == case_id,
        CaseFeedback.user_id == current_user.user_id,
    ).first()

    if existing:
        existing.was_helpful = was_helpful
    else:
        db.add(CaseFeedback(
            case_id=case_id,
            user_id=current_user.user_id,
            was_helpful=was_helpful,
        ))
    db.commit()

    return {"status": "saved", "was_helpful": was_helpful}
