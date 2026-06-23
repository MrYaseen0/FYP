"""
Healtheon — Patient API Router
Endpoints for patient-specific data: appointments, health metrics, records, prescriptions.
"""
from datetime import date
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.auth import get_current_user, TokenData
from backend.db.database import get_db
from backend.db.models import User
from backend.db.models_extended import Appointment, HealthMetric, MedicalRecord, Prescription

router = APIRouter(prefix="/api/patient", tags=["patient"])


class HealthMetricCreate(BaseModel):
    metric_type: str = Field(..., description="heart_rate, blood_pressure, weight, blood_sugar, temperature, oxygen_saturation")
    value: str = Field(..., description="Measurement value")
    unit: str = Field("", description="Unit of measurement")


class ProfileUpdate(BaseModel):
    full_name: str = Field(None, max_length=200)
    institution: str = Field(None, max_length=200)
    avatar: str = Field(None, max_length=10)


@router.get("/appointments")
def get_patient_appointments(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all appointments for the current patient."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    appointments = (
        db.query(Appointment)
        .filter(Appointment.patient_id == user.id)
        .order_by(desc(Appointment.appointment_date))
        .all()
    )
    return {"appointments": [a.to_dict() for a in appointments]}


@router.get("/health-metrics")
def get_health_metrics(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get latest health metrics for the current patient."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    metrics = (
        db.query(HealthMetric)
        .filter(HealthMetric.user_id == user.id)
        .order_by(desc(HealthMetric.recorded_at))
        .all()
    )
    return {"metrics": [m.to_dict() for m in metrics]}


@router.get("/medical-records")
def get_medical_records(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get medical records for the current patient."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    records = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.user_id == user.id)
        .order_by(desc(MedicalRecord.created_at))
        .all()
    )
    return {"records": [r.to_dict() for r in records]}


@router.get("/prescriptions")
def get_prescriptions(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get prescriptions for the current patient."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prescriptions = (
        db.query(Prescription)
        .filter(Prescription.patient_id == user.id)
        .order_by(desc(Prescription.created_at))
        .all()
    )
    return {"prescriptions": [p.to_dict() for p in prescriptions]}


@router.get("/profile")
def get_patient_profile(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get patient profile with aggregated data."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    appointments_count = db.query(Appointment).filter(Appointment.patient_id == user.id).count()
    records_count = db.query(MedicalRecord).filter(MedicalRecord.user_id == user.id).count()
    prescriptions_count = db.query(Prescription).filter(Prescription.patient_id == user.id).count()

    latest_metrics = (
        db.query(HealthMetric)
        .filter(HealthMetric.user_id == user.id)
        .order_by(desc(HealthMetric.recorded_at))
        .limit(10)
        .all()
    )

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
            "appointments": appointments_count,
            "medical_records": records_count,
            "prescriptions": prescriptions_count,
        },
        "health_metrics": [m.to_dict() for m in latest_metrics],
    }


@router.post("/health-metrics")
def log_health_metric(
    req: HealthMetricCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a new health metric (vitals) for the current patient."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    valid_types = ["heart_rate", "blood_pressure", "weight", "blood_sugar", "temperature", "oxygen_saturation"]
    if req.metric_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid metric type. Must be one of: {', '.join(valid_types)}")

    if not req.value or not req.value.strip():
        raise HTTPException(status_code=400, detail="Value is required")

    unit_map = {
        "heart_rate": "bpm",
        "blood_pressure": "mmHg",
        "weight": "kg",
        "blood_sugar": "mg/dL",
        "temperature": "°C",
        "oxygen_saturation": "%",
    }

    metric = HealthMetric(
        user_id=user.id,
        metric_type=req.metric_type,
        value=req.value.strip(),
        unit=req.unit or unit_map.get(req.metric_type, ""),
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)

    return {"metric": metric.to_dict()}


@router.put("/profile")
def update_patient_profile(
    req: ProfileUpdate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current patient's profile."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.full_name is not None:
        user.full_name = req.full_name.strip()
    if req.institution is not None:
        user.institution = req.institution.strip()
    if req.avatar is not None:
        user.avatar = req.avatar.strip()

    db.commit()
    db.refresh(user)

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
        }
    }
