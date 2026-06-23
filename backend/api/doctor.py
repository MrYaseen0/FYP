"""
Healtheon — Doctor API Router
Endpoints for doctor-specific data: patients, appointments, prescriptions, schedule.
"""
from datetime import date
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.auth import get_current_user, TokenData
from backend.db.database import get_db
from backend.db.models import User, Case
from backend.db.models_extended import Appointment, MedicalRecord, Prescription

router = APIRouter(prefix="/api/doctor", tags=["doctor"])


class PrescriptionCreate(BaseModel):
    patient_id: str = Field(..., description="Patient user ID")
    medication_name: str = Field(..., min_length=1, max_length=200)
    dosage: str = Field("", max_length=100)
    frequency: str = Field("", max_length=100)
    duration: str = Field("", max_length=100)
    instructions: str = Field("", max_length=1000)


class MedicalRecordCreate(BaseModel):
    patient_id: str = Field(..., description="Patient user ID")
    record_type: str = Field(..., description="lab_report, progress_note, discharge_summary, imaging")
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=2000)


class AppointmentCreate(BaseModel):
    patient_id: str = Field(..., description="Patient user ID")
    appointment_date: str = Field(..., description="YYYY-MM-DD")
    appointment_time: str = Field(..., description="HH:MM")
    appointment_type: str = Field("consultation", max_length=50)
    notes: str = Field("", max_length=500)


@router.get("/patients")
def get_doctor_patients(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all patients assigned to the current doctor."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    appointments = (
        db.query(Appointment)
        .filter(Appointment.doctor_id == user.id)
        .all()
    )
    patient_ids = list(set(a.patient_id for a in appointments))
    patients = db.query(User).filter(User.id.in_(patient_ids)).all() if patient_ids else []

    return {
        "patients": [
            {
                "id": p.id,
                "name": p.full_name,
                "email": p.email,
                "avatar": p.avatar,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in patients
        ]
    }


@router.get("/appointments")
def get_doctor_appointments(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all appointments for the current doctor."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    appointments = (
        db.query(Appointment)
        .filter(Appointment.doctor_id == user.id)
        .order_by(desc(Appointment.appointment_date))
        .all()
    )
    return {"appointments": [a.to_dict() for a in appointments]}


@router.get("/prescriptions")
def get_doctor_prescriptions(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get prescriptions written by the current doctor."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prescriptions = (
        db.query(Prescription)
        .filter(Prescription.doctor_id == user.id)
        .order_by(desc(Prescription.created_at))
        .all()
    )
    return {"prescriptions": [p.to_dict() for p in prescriptions]}


@router.get("/medical-records")
def get_doctor_medical_records(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get medical records created by the current doctor."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    records = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.doctor_id == user.id)
        .order_by(desc(MedicalRecord.created_at))
        .all()
    )
    return {"records": [r.to_dict() for r in records]}


@router.get("/cases")
def get_doctor_cases(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all cases in the system (for doctor review)."""
    cases = db.query(Case).order_by(desc(Case.created_at)).all()
    return {"cases": [c.to_dict() for c in cases]}


@router.get("/stats")
def get_doctor_stats(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get dashboard stats for the current doctor."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    patients_count = (
        db.query(Appointment)
        .filter(Appointment.doctor_id == user.id)
        .distinct(Appointment.patient_id)
        .count()
    )
    appointments_count = db.query(Appointment).filter(Appointment.doctor_id == user.id).count()
    prescriptions_count = db.query(Prescription).filter(Prescription.doctor_id == user.id).count()
    cases_count = db.query(Case).count()

    return {
        "total_patients": patients_count,
        "total_appointments": appointments_count,
        "total_prescriptions": prescriptions_count,
        "total_cases": cases_count,
    }


@router.get("/profile")
def get_doctor_profile(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get doctor profile."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    patients_count = (
        db.query(Appointment)
        .filter(Appointment.doctor_id == user.id)
        .distinct(Appointment.patient_id)
        .count()
    )
    appointments_count = db.query(Appointment).filter(Appointment.doctor_id == user.id).count()

    return {
        "user": {
            "id": user.id,
        "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "institution": user.institution,
            "avatar": user.avatar,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "stats": {
            "total_patients": patients_count,
            "total_appointments": appointments_count,
        },
    }


@router.post("/prescriptions")
def create_prescription(
    req: PrescriptionCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new prescription for a patient."""
    doctor = db.query(User).filter(User.username == current_user.username).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    patient = db.query(User).filter(User.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.role != "user":
        raise HTTPException(status_code=400, detail="Selected user is not a patient")

    if not req.medication_name or not req.medication_name.strip():
        raise HTTPException(status_code=400, detail="Medication name is required")

    rx = Prescription(
        patient_id=req.patient_id,
        doctor_id=doctor.id,
        medication_name=req.medication_name.strip(),
        dosage=req.dosage.strip(),
        frequency=req.frequency.strip(),
        duration=req.duration.strip(),
        instructions=req.instructions.strip(),
        prescribed_date=date.today().isoformat(),
    )
    db.add(rx)
    db.commit()
    db.refresh(rx)

    return {"prescription": rx.to_dict()}


@router.post("/medical-records")
def create_medical_record(
    req: MedicalRecordCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new medical record for a patient."""
    doctor = db.query(User).filter(User.username == current_user.username).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    patient = db.query(User).filter(User.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    valid_types = ["lab_report", "progress_note", "discharge_summary", "imaging"]
    if req.record_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid record type. Must be one of: {', '.join(valid_types)}")

    if not req.title or not req.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")

    record = MedicalRecord(
        user_id=req.patient_id,
        doctor_id=doctor.id,
        record_type=req.record_type,
        title=req.title.strip(),
        description=req.description.strip(),
        date=date.today().isoformat(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {"record": record.to_dict()}


@router.post("/appointments")
def book_appointment(
    req: AppointmentCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Book a new appointment (doctor books for a patient)."""
    doctor = db.query(User).filter(User.username == current_user.username).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    patient = db.query(User).filter(User.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if not req.appointment_date or not req.appointment_time:
        raise HTTPException(status_code=400, detail="Date and time are required")

    appt = Appointment(
        patient_id=req.patient_id,
        doctor_id=doctor.id,
        appointment_date=req.appointment_date.strip(),
        appointment_time=req.appointment_time.strip(),
        appointment_type=req.appointment_type.strip(),
        notes=req.notes.strip(),
        status="scheduled",
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    return {"appointment": appt.to_dict()}
