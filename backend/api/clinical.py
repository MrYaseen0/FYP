"""
Healtheon — Clinical Notes & Lab Orders API Router
Endpoints for clinical notes, lab orders, and billing.
"""
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.auth import get_current_user, TokenData
from backend.db.database import get_db
from backend.db.models import User, Case
from backend.db.models_extended import MedicalRecord, Appointment, Prescription

router = APIRouter(prefix="/api/clinical", tags=["clinical"])


class ClinicalNoteCreate(BaseModel):
    patient_id: str = Field(..., description="Patient user ID")
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field("", max_length=5000)
    note_type: str = Field("progress_note", description="progress_note, soap_note, discharge_summary")


class LabOrderCreate(BaseModel):
    patient_id: str = Field(..., description="Patient user ID")
    test_name: str = Field(..., min_length=1, max_length=200)
    urgency: str = Field("routine", description="routine, urgent, stat")
    clinical_indication: str = Field("", max_length=1000)
    notes: str = Field("", max_length=500)


# ── Clinical Notes ─────────────────────────────────────────────────────────

@router.get("/notes")
def get_notes(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get clinical notes for the current user's patients (doctor) or own notes (patient)."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role in ("doctor", "admin"):
        records = (
            db.query(MedicalRecord)
            .filter(MedicalRecord.doctor_id == user.id)
            .filter(MedicalRecord.record_type.in_(["progress_note", "soap_note", "discharge_summary"]))
            .order_by(desc(MedicalRecord.created_at))
            .all()
        )
    else:
        records = (
            db.query(MedicalRecord)
            .filter(MedicalRecord.user_id == user.id)
            .filter(MedicalRecord.record_type.in_(["progress_note", "soap_note", "discharge_summary"]))
            .order_by(desc(MedicalRecord.created_at))
            .all()
        )

    return {"notes": [r.to_dict() for r in records]}


@router.post("/notes")
def create_note(
    req: ClinicalNoteCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new clinical note."""
    doctor = db.query(User).filter(User.username == current_user.username).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="User not found")

    patient = db.query(User).filter(User.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    valid_types = ["progress_note", "soap_note", "discharge_summary"]
    record_type = req.note_type if req.note_type in valid_types else "progress_note"

    from datetime import date as _date
    record = MedicalRecord(
        user_id=req.patient_id,
        doctor_id=doctor.id,
        record_type=record_type,
        title=req.title.strip(),
        description=req.content.strip(),
        date=_date.today().isoformat(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {"note": record.to_dict()}


# ── Lab Orders ─────────────────────────────────────────────────────────────

@router.get("/lab-orders")
def get_lab_orders(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get lab orders for the current user's patients (doctor) or own (patient)."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role in ("doctor", "admin"):
        records = (
            db.query(MedicalRecord)
            .filter(MedicalRecord.doctor_id == user.id)
            .filter(MedicalRecord.record_type == "lab_report")
            .order_by(desc(MedicalRecord.created_at))
            .all()
        )
    else:
        records = (
            db.query(MedicalRecord)
            .filter(MedicalRecord.user_id == user.id)
            .filter(MedicalRecord.record_type == "lab_report")
            .order_by(desc(MedicalRecord.created_at))
            .all()
        )

    return {"lab_orders": [r.to_dict() for r in records]}


@router.post("/lab-orders")
def create_lab_order(
    req: LabOrderCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new lab order."""
    doctor = db.query(User).filter(User.username == current_user.username).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="User not found")

    patient = db.query(User).filter(User.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    desc_text = f"Test: {req.test_name}"
    if req.clinical_indication:
        desc_text += f"\nIndication: {req.clinical_indication}"
    if req.notes:
        desc_text += f"\nNotes: {req.notes}"
    desc_text += f"\nUrgency: {req.urgency.upper()}"

    from datetime import date as _date
    record = MedicalRecord(
        user_id=req.patient_id,
        doctor_id=doctor.id,
        record_type="lab_report",
        title=req.test_name.strip(),
        description=desc_text,
        date=_date.today().isoformat(),
        status="pending",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {"lab_order": record.to_dict()}


@router.put("/lab-orders/{order_id}")
def update_lab_order_status(
    order_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update lab order status (e.g., mark as completed)."""
    record = db.query(MedicalRecord).filter(MedicalRecord.id == order_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Lab order not found")

    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if record.status == "pending":
        record.status = "completed"
    elif record.status == "completed":
        record.status = "active"
    else:
        record.status = "pending"

    db.commit()
    db.refresh(record)

    return {"lab_order": record.to_dict()}


# ── Billing (mock) ────────────────────────────────────────────────────────

@router.get("/billing")
def get_billing(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get billing summary for the current user."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role in ("doctor", "admin"):
        appointments = db.query(Appointment).filter(Appointment.doctor_id == user.id).all()
        prescriptions = db.query(Prescription).filter(Prescription.doctor_id == user.id).all()
        records = db.query(MedicalRecord).filter(MedicalRecord.doctor_id == user.id).all()
    else:
        appointments = db.query(Appointment).filter(Appointment.patient_id == user.id).all()
        prescriptions = db.query(Prescription).filter(Prescription.patient_id == user.id).all()
        records = db.query(MedicalRecord).filter(MedicalRecord.user_id == user.id).all()

    items = []
    total = 0.0

    for a in appointments:
        cost = 150.00 if a.appointment_type == "consultation" else 250.00
        items.append({
            "id": a.id,
            "description": f"Appointment — {a.appointment_type.replace('_', ' ').title()}",
            "date": a.appointment_date,
            "amount": cost,
            "status": "paid" if a.status == "completed" else "pending",
        })
        total += cost

    for p in prescriptions:
        cost = 45.00
        items.append({
            "id": p.id,
            "description": f"Prescription — {p.medication_name}",
            "date": p.prescribed_date,
            "amount": cost,
            "status": "paid",
        })
        total += cost

    for r in records:
        if r.record_type == "lab_report":
            cost = 120.00
        elif r.record_type == "imaging":
            cost = 350.00
        else:
            cost = 75.00
        items.append({
            "id": r.id,
            "description": f"{r.record_type.replace('_', ' ').title()} — {r.title}",
            "date": r.date,
            "amount": cost,
            "status": "paid" if r.status == "active" else "pending",
        })
        total += cost

    items.sort(key=lambda x: x["date"] or "", reverse=True)

    paid = sum(i["amount"] for i in items if i["status"] == "paid")
    pending = sum(i["amount"] for i in items if i["status"] == "pending")

    return {
        "items": items,
        "summary": {
            "total": round(total, 2),
            "paid": round(paid, 2),
            "pending": round(pending, 2),
            "item_count": len(items),
        },
    }
