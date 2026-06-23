"""
Healtheon — Learning API Router
Student prediction/guess-first endpoints with multi-step Socratic gating.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import List

from backend.auth import get_current_user, TokenData
from backend.db.database import get_db
from backend.db.models import Case
from backend.db.models_extended import StudentPrediction

router = APIRouter(prefix="/api/learning", tags=["learning"])


class PredictionInput(BaseModel):
    case_id: str
    step_number: int = Field(ge=1, le=3, description="1=after Intake, 2=after GP, 3=after Specialists")
    student_diagnosis: str = Field(..., min_length=1, max_length=500)
    student_urgency: str = Field(default="MODERATE", pattern="^(LOW|MODERATE|HIGH|CRITICAL)$")


@router.post("/cases/{case_id}/predict")
async def save_prediction(
    case_id: str,
    req: PredictionInput,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """
    Save a student's diagnostic prediction at a specific pipeline step.
    Returns status='unlocked' so the frontend can reveal the next AI step.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    # Upsert: update if same case+user+step, otherwise create new
    existing = db.query(StudentPrediction).filter(
        StudentPrediction.case_id == case_id,
        StudentPrediction.user_id == current_user.user_id,
        StudentPrediction.step_number == req.step_number,
    ).first()

    if existing:
        existing.student_diagnosis = req.student_diagnosis
        existing.student_urgency = req.student_urgency
    else:
        db.add(StudentPrediction(
            case_id=case_id,
            user_id=current_user.user_id,
            step_number=req.step_number,
            student_diagnosis=req.student_diagnosis,
            student_urgency=req.student_urgency,
        ))
    db.commit()

    return {"status": "unlocked", "case_id": case_id, "step_number": req.step_number}


@router.get("/cases/{case_id}/predictions")
async def get_predictions(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Fetch all predictions for a case by the current user (for comparison view)."""
    preds = db.query(StudentPrediction).filter(
        StudentPrediction.case_id == case_id,
        StudentPrediction.user_id == current_user.user_id,
    ).order_by(StudentPrediction.step_number).all()

    return {
        "predictions": [p.to_dict() for p in preds],
        "case_id": case_id,
    }


@router.get("/cases/{case_id}/predictions/all")
async def get_all_predictions(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Fetch all users' predictions for a case (admin/doctor view for teaching analytics)."""
    preds = db.query(StudentPrediction).filter(
        StudentPrediction.case_id == case_id,
    ).order_by(StudentPrediction.step_number, StudentPrediction.created_at).all()

    return {
        "predictions": [p.to_dict() for p in preds],
        "case_id": case_id,
        "total_students": len(set(p.user_id for p in preds)),
    }
