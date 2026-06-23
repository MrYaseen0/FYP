"""
Healtheon — Additional SQLAlchemy Models
Appointments, health metrics, medical records, notifications, messages, prescriptions.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.db.database import Base


def _now():
    return datetime.now(timezone.utc)


def _uuid():
    return str(uuid.uuid4())


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, default=_uuid)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(String, ForeignKey("users.id"), nullable=False)
    appointment_date = Column(String(50), nullable=False)
    appointment_time = Column(String(20), nullable=False)
    appointment_type = Column(String(50), default="consultation")
    status = Column(String(20), default="scheduled")  # scheduled | completed | cancelled | no-show
    notes = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=_now)

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "doctor_id": self.doctor_id,
            "patient_name": self.patient.full_name if self.patient else "",
            "doctor_name": self.doctor.full_name if self.doctor else "",
            "doctor_specialty": self.doctor.institution if self.doctor else "",
            "date": self.appointment_date,
            "time": self.appointment_time,
            "type": self.appointment_type,
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class HealthMetric(Base):
    __tablename__ = "health_metrics"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    metric_type = Column(String(50), nullable=False)  # heart_rate, blood_pressure, weight, blood_sugar, temperature, oxygen_saturation
    value = Column(String(50), nullable=False)
    unit = Column(String(20), default="")
    recorded_at = Column(DateTime(timezone=True), default=_now)

    user = relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.metric_type,
            "value": self.value,
            "unit": self.unit,
            "recorded_at": self.recorded_at.isoformat() if self.recorded_at else None,
        }


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(String, ForeignKey("users.id"), nullable=True)
    record_type = Column(String(50), nullable=False)  # lab_report, progress_note, discharge_summary, prescription, imaging
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    date = Column(String(50), nullable=False)
    status = Column(String(20), default="active")
    created_at = Column(DateTime(timezone=True), default=_now)

    user = relationship("User", foreign_keys=[user_id])
    doctor = relationship("User", foreign_keys=[doctor_id])

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.record_type,
            "title": self.title,
            "description": self.description,
            "date": self.date,
            "status": self.status,
            "doctor_name": self.doctor.full_name if self.doctor else "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="info")  # info, warning, success, appointment, lab_result, prescription
    is_read = Column(Boolean, default=False)
    link = Column(String(300), default="")
    created_at = Column(DateTime(timezone=True), default=_now)

    user = relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "type": self.notification_type,
            "is_read": self.is_read,
            "link": self.link,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=_uuid)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=_now)

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "sender_name": self.sender.full_name if self.sender else "",
            "receiver_name": self.receiver.full_name if self.receiver else "",
            "content": self.content,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(String, primary_key=True, default=_uuid)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(String, ForeignKey("users.id"), nullable=False)
    medication_name = Column(String(200), nullable=False)
    dosage = Column(String(100), default="")
    frequency = Column(String(100), default="")
    duration = Column(String(100), default="")
    instructions = Column(Text, default="")
    status = Column(String(20), default="active")  # active | completed | discontinued
    prescribed_date = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now)

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "doctor_id": self.doctor_id,
            "patient_name": self.patient.full_name if self.patient else "",
            "doctor_name": self.doctor.full_name if self.doctor else "",
            "medication": self.medication_name,
            "dosage": self.dosage,
            "frequency": self.frequency,
            "duration": self.duration,
            "instructions": self.instructions,
            "status": self.status,
            "prescribed_date": self.prescribed_date,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Department(Base):
    __tablename__ = "departments"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    head_doctor_id = Column(String, ForeignKey("users.id"), nullable=True)
    staff_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=_now)

    head_doctor = relationship("User", foreign_keys=[head_doctor_id])

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "head_doctor": self.head_doctor.full_name if self.head_doctor else "",
            "staff_count": self.staff_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CaseFeedback(Base):
    __tablename__ = "case_feedback"

    id = Column(String, primary_key=True, default=_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    was_helpful = Column(Boolean, nullable=False)  # True = thumbs up, False = thumbs down
    created_at = Column(DateTime(timezone=True), default=_now)

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "user_id": self.user_id,
            "was_helpful": self.was_helpful,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class StudentPrediction(Base):
    __tablename__ = "student_predictions"

    id = Column(String, primary_key=True, default=_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    step_number = Column(Integer, default=1)  # 1=after Intake, 2=after GP, 3=after Specialists
    student_diagnosis = Column(Text, nullable=False)  # Student's differential diagnosis
    student_urgency = Column(String(20), default="MODERATE")  # LOW, MODERATE, HIGH, CRITICAL
    created_at = Column(DateTime(timezone=True), default=_now)

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "user_id": self.user_id,
            "step_number": self.step_number,
            "student_diagnosis": self.student_diagnosis,
            "student_urgency": self.student_urgency,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CaseAttachment(Base):
    """Stores uploaded medical images/files (ECG, X-ray, lab reports, photos) linked to a case."""
    __tablename__ = "case_attachments"

    id = Column(String, primary_key=True, default=_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    attachment_type = Column(String(30), nullable=False)  # ecg, xray, lab_report, photo, other
    original_filename = Column(String(300), nullable=False)
    stored_filename = Column(String(300), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), default="")
    ai_findings = Column(Text, nullable=True)       # Vision model analysis (if available)
    ai_analysis_type = Column(String(50), nullable=True)  # ecg_analysis, xray_analysis, etc.
    metadata_json = Column(Text, nullable=True)     # Extra info: image dimensions, duration, etc.
    created_at = Column(DateTime(timezone=True), default=_now)

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "user_id": self.user_id,
            "attachment_type": self.attachment_type,
            "original_filename": self.original_filename,
            "stored_filename": self.stored_filename,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "ai_findings": self.ai_findings,
            "ai_analysis_type": self.ai_analysis_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class HealthAnalysis(Base):
    """
    Stores AI-powered health analysis from uploaded medical documents.
    Auto-detects document type (blood test, urine, ECG, DNA, etc.)
    and provides deep health insights, risk assessment, and advice.
    """
    __tablename__ = "health_analyses"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    original_filename = Column(String(300), nullable=False)
    stored_filename = Column(String(300), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), default="")
    detected_type = Column(String(50), nullable=True)     # auto-detected: blood_test, urine_test, ecg, dna, etc.
    detected_subtype = Column(String(100), nullable=True)  # e.g. "CBC", "Lipid Panel", "Thyroid"
    document_language = Column(String(10), default="en")   # detected language
    raw_text = Column(Text, nullable=True)                 # extracted text from PDF
    analysis_json = Column(Text, nullable=True)            # full structured analysis (JSON)
    summary = Column(Text, nullable=True)                  # patient-friendly summary
    risk_level = Column(String(20), nullable=True)         # low, moderate, high, critical
    key_findings = Column(Text, nullable=True)             # JSON array of key findings
    recommendations = Column(Text, nullable=True)          # JSON array of recommendations
    flags = Column(Text, nullable=True)                    # JSON array of critical flags/alerts
    doctor_notified = Column(Boolean, default=False)       # whether a doctor was notified
    created_at = Column(DateTime(timezone=True), default=_now)

    def to_dict(self):
        import json
        result = {
            "id": self.id,
            "user_id": self.user_id,
            "original_filename": self.original_filename,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "detected_type": self.detected_type,
            "detected_subtype": self.detected_subtype,
            "summary": self.summary,
            "risk_level": self.risk_level,
            "doctor_notified": self.doctor_notified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        for field in ["analysis_json", "key_findings", "recommendations", "flags"]:
            val = getattr(self, field, None)
            if val:
                try:
                    result[field] = json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    result[field] = val
            else:
                result[field] = None
        return result


class AgentPattern(Base):
    """
    Persistent memory for agents — stores diagnostic patterns recognized
    across cases so agents can learn and improve over time.
    """
    __tablename__ = "agent_patterns"

    id = Column(String, primary_key=True, default=_uuid)
    agent_name = Column(String(100), nullable=False, index=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    pattern_type = Column(String(50), nullable=False)  # symptom_cluster, diagnostic_rule, bias_detected, guideline_ref
    pattern_data = Column(Text, nullable=False)  # JSON: {symptoms: [...], diagnosis: "...", confidence: 0.85, ...}
    confidence = Column(Float, default=0.5)
    was_correct = Column(Boolean, nullable=True)  # True if pattern led to correct diagnosis, None if unknown
    created_at = Column(DateTime(timezone=True), default=_now)

    def to_dict(self):
        import json
        result = {
            "id": self.id,
            "agent_name": self.agent_name,
            "case_id": self.case_id,
            "pattern_type": self.pattern_type,
            "confidence": self.confidence,
            "was_correct": self.was_correct,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        try:
            result["pattern_data"] = json.loads(self.pattern_data)
        except (json.JSONDecodeError, TypeError):
            result["pattern_data"] = self.pattern_data
        return result
