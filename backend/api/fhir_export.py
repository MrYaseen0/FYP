"""
Healtheon — FHIR R4 Export Router

Exports case summaries as HL7 FHIR R4 Bundles — the healthcare
interoperability standard. Makes the platform EHR-compatible.
"""
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from backend.auth import get_current_user, TokenData
from backend.db.database import get_db
from backend.db.models import Case, CaseSummary, InvestigationSuggestion, Message

router = APIRouter(prefix="/api/fhir", tags=["fhir"])
logger = logging.getLogger("healtheon.fhir")


def _build_fhir_bundle(case, summary, investigations, messages) -> dict:
    """
    Construct a FHIR R4 Bundle (type: document) from a Healtheon case.
    """
    now = datetime.now(timezone.utc).isoformat()

    entries = []

    # ── Composition (the main document wrapper) ──────────────────────────
    composition_section_text = ""
    if summary:
        # Convert markdown to simple HTML for FHIR div
        md = summary.summary_markdown or ""
        composition_section_text = f"<div xmlns='http://www.w3.org/1999/xhtml'>{md}</div>"

    composition = {
        "fullUrl": f"urn:uuid:composition-{case.id}",
        "resource": {
            "resourceType": "Composition",
            "id": f"composition-{case.id}",
            "status": "final",
            "type": {
                "coding": [{
                    "system": "http://loinc.org",
                    "code": "11506-3",
                    "display": "Progress note"
                }],
                "text": "AI Clinical Analysis Report"
            },
            "subject": {"reference": f"Patient/{case.id}"},
            "author": [{"display": "Healtheon AI Multi-Agent System"}],
            "date": case.created_at.isoformat() if case.created_at else now,
            "title": f"Healtheon Clinical Analysis — {case.chief_complaint}",
            "section": [{
                "title": "AI Clinical Analysis Report",
                "text": {"div": composition_section_text}
            }]
        }
    }
    if summary and summary.latency_seconds:
        composition["resource"]["section"][0]["text"]["div"] += (
            f"<p>Pipeline latency: {summary.latency_seconds}s | "
            f"Agent rounds: {summary.total_rounds or 'N/A'}</p>"
        )
    entries.append(composition)

    # ── Patient ──────────────────────────────────────────────────────────
    patient_resource = {
        "fullUrl": f"urn:uuid:patient-{case.id}",
        "resource": {
            "resourceType": "Patient",
            "id": f"patient-{case.id}",
        }
    }
    # Add patient demographics from case fields
    if case.past_medical_history:
        patient_resource["resource"]["note"] = [{
            "text": f"Medical History: {case.past_medical_history}"
        }]
    entries.append(patient_resource)

    # ── Observation: Chief Complaint ─────────────────────────────────────
    entries.append({
        "fullUrl": f"urn:uuid:obs-complaint-{case.id}",
        "resource": {
            "resourceType": "Observation",
            "id": f"obs-complaint-{case.id}",
            "status": "preliminary",
            "category": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                    "code": "survey",
                    "display": "Survey"
                }]
            }],
            "code": {
                "coding": [{
                    "system": "http://snomed.info/sct",
                    "code": "42343007",
                    "display": "Chief complaint"
                }],
                "text": "Chief Complaint"
            },
            "valueString": case.chief_complaint,
            "effectiveDateTime": case.created_at.isoformat() if case.created_at else now,
        }
    })

    # ── Observation: Severity ────────────────────────────────────────────
    if case.severity is not None:
        entries.append({
            "fullUrl": f"urn:uuid:obs-severity-{case.id}",
            "resource": {
                "resourceType": "Observation",
                "id": f"obs-severity-{case.id}",
                "status": "preliminary",
                "code": {
                    "coding": [{
                        "system": "http://snomed.info/sct",
                        "code": "273249006",
                        "display": "Severity"
                    }],
                    "text": "Pain Severity"
                },
                "valueQuantity": {
                    "value": case.severity,
                    "unit": "/10",
                    "system": "http://unitsofmeasure.org"
                },
                "effectiveDateTime": case.created_at.isoformat() if case.created_at else now,
            }
        })

    # ── Observation: Onset ───────────────────────────────────────────────
    if case.onset:
        entries.append({
            "fullUrl": f"urn:uuid:obs-onset-{case.id}",
            "resource": {
                "resourceType": "Observation",
                "id": f"obs-onset-{case.id}",
                "status": "preliminary",
                "code": {
                    "coding": [{
                        "system": "http://snomed.info/sct",
                        "code": "252416005",
                        "display": "Onset date"
                    }],
                    "text": "Onset"
                },
                "valueString": case.onset,
                "effectiveDateTime": case.created_at.isoformat() if case.created_at else now,
            }
        })

    # ── Observation: Associated Symptoms ─────────────────────────────────
    if case.associated_symptoms:
        entries.append({
            "fullUrl": f"urn:uuid:obs-symptoms-{case.id}",
            "resource": {
                "resourceType": "Observation",
                "id": f"obs-symptoms-{case.id}",
                "status": "preliminary",
                "code": {
                    "coding": [{
                        "system": "http://snomed.info/sct",
                        "code": "418792008",
                        "display": "Finding of symptom"
                    }],
                    "text": "Associated Symptoms"
                },
                "valueString": case.associated_symptoms,
                "effectiveDateTime": case.created_at.isoformat() if case.created_at else now,
            }
        })

    # ── Observation: Allergies ───────────────────────────────────────────
    if case.allergies:
        entries.append({
            "fullUrl": f"urn:uuid:obs-allergies-{case.id}",
            "resource": {
                "resourceType": "AllergyIntolerance",
                "id": f"obs-allergies-{case.id}",
                "clinicalStatus": {
                    "coding": [{"system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", "code": "active"}]
                },
                "verificationStatus": {
                    "coding": [{"system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification", "code": "unconfirmed"}]
                },
                "type": "allergy",
                "code": {"text": case.allergies},
                "recordedDate": case.created_at.isoformat() if case.created_at else now,
            }
        })

    # ── Observation: Current Medications ─────────────────────────────────
    if case.current_medications:
        entries.append({
            "fullUrl": f"urn:uuid:obs-meds-{case.id}",
            "resource": {
                "resourceType": "Observation",
                "id": f"obs-meds-{case.id}",
                "status": "preliminary",
                "code": {
                    "coding": [{
                        "system": "http://snomed.info/sct",
                        "code": "182922004",
                        "display": "Current medication"
                    }],
                    "text": "Current Medications"
                },
                "valueString": case.current_medications,
                "effectiveDateTime": case.created_at.isoformat() if case.created_at else now,
            }
        })

    # ── DRS Score Observation ────────────────────────────────────────────
    if summary and summary.drs_score_json:
        try:
            drs = json.loads(summary.drs_score_json)
            entries.append({
                "fullUrl": f"urn:uuid:obs-drs-{case.id}",
                "resource": {
                    "resourceType": "Observation",
                    "id": f"obs-drs-{case.id}",
                    "status": "final",
                    "category": [{
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "laboratory",
                            "display": "Laboratory"
                        }]
                    }],
                    "code": {
                        "coding": [{
                            "system": "http://healtheon.local",
                            "code": "drs-score",
                            "display": "Diagnostic Reasoning Score"
                        }],
                        "text": "Diagnostic Reasoning Score"
                    },
                    "valueQuantity": {
                        "value": drs.get("overall", 0),
                        "unit": "/100",
                        "system": "http://unitsofmeasure.org"
                    },
                    "component": [
                        {
                            "code": {"text": dim},
                            "valueQuantity": {"value": drs.get(dim, 0), "unit": "/100"}
                        }
                        for dim in ["differentials", "evidence_use", "bias_avoidance", "completeness", "urgency_detection"]
                    ]
                }
            })
        except (json.JSONDecodeError, TypeError):
            pass

    # ── ServiceRequest: Investigation Suggestions ────────────────────────
    for inv in investigations:
        priority = "stat" if inv.urgency and inv.urgency.value == "STAT" else "routine"
        entries.append({
            "fullUrl": f"urn:uuid:sr-{inv.id}",
            "resource": {
                "resourceType": "ServiceRequest",
                "id": f"sr-{inv.id}",
                "status": "active",
                "intent": "plan",
                "code": {"text": inv.test_name},
                "priority": priority,
                "reasonCode": [{"text": inv.rationale or ""}],
                "subject": {"reference": f"Patient/{case.id}"},
                "authoredOn": case.created_at.isoformat() if case.created_at else now,
            }
        })

    # ── DocumentReference: Agent Transcript ──────────────────────────────
    if messages:
        transcript_text = "\n\n".join(
            f"**{m.agent_name}** (step {m.sequence_order}):\n{m.content}"
            for m in sorted(messages, key=lambda x: x.sequence_order)
        )
        entries.append({
            "fullUrl": f"urn:uuid:doc-transcript-{case.id}",
            "resource": {
                "resourceType": "DocumentReference",
                "id": f"doc-transcript-{case.id}",
                "status": "current",
                "type": {
                    "coding": [{
                        "system": "http://loinc.org",
                        "code": "34133-9",
                        "display": "Summarization of Note"
                    }]
                },
                "content": [{
                    "attachment": {
                        "contentType": "text/markdown",
                        "data": transcript_text[:10000],  # FHIR has practical limits
                        "title": "Agent Conference Transcript"
                    }
                }],
                "context": {
                    "period": {
                        "start": case.created_at.isoformat() if case.created_at else now
                    }
                }
            }
        })

    # ── Build final Bundle ───────────────────────────────────────────────
    bundle = {
        "resourceType": "Bundle",
        "id": f"bundle-{case.id}",
        "type": "document",
        "timestamp": now,
        "meta": {
            "profile": ["http://hl7.org/fhir/StructureDefinition/Bundle"],
            "source": "Healtheon AI Clinical Platform",
            "versionId": "1.0"
        },
        "total": len(entries),
        "entry": entries,
    }

    return bundle


@router.get("/cases/{case_id}/fhir-bundle")
async def export_fhir_bundle(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """
    Export a case as a FHIR R4 Bundle (type: document).
    Returns JSON conforming to HL7 FHIR R4 specification.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    summary = db.query(CaseSummary).filter(CaseSummary.case_id == case_id).first()
    investigations = db.query(InvestigationSuggestion).filter(
        InvestigationSuggestion.case_id == case_id
    ).all()
    messages = db.query(Message).filter(Message.case_id == case_id).order_by(Message.sequence_order).all()

    bundle = _build_fhir_bundle(case, summary, investigations, messages)

    return JSONResponse(
        content=bundle,
        headers={
            "Content-Type": "application/fhir+json",
            "Content-Disposition": f'attachment; filename="healtheon-{case_id[:8]}.json"',
        }
    )


@router.get("/cases/{case_id}/fhir-bundle/download")
async def download_fhir_bundle(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Download FHIR Bundle as a JSON file."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    summary = db.query(CaseSummary).filter(CaseSummary.case_id == case_id).first()
    investigations = db.query(InvestigationSuggestion).filter(
        InvestigationSuggestion.case_id == case_id
    ).all()
    messages = db.query(Message).filter(Message.case_id == case_id).order_by(Message.sequence_order).all()

    bundle = _build_fhir_bundle(case, summary, investigations, messages)
    content = json.dumps(bundle, indent=2, default=str)

    return JSONResponse(
        content=json.loads(content),
        headers={
            "Content-Type": "application/fhir+json",
            "Content-Disposition": f'attachment; filename="healtheon-fhir-{case_id[:8]}.json"',
        }
    )
