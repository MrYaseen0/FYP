"""
Healtheon — SQLAlchemy ORM Models
Stores cases, agent transcript messages, investigation suggestions, and summaries.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Text, Integer, Float, DateTime, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from backend.db.database import Base
import enum

# pgvector support — only available if installed
try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False


def _now():
    return datetime.now(timezone.utc)


def _uuid():
    return str(uuid.uuid4())


class RefreshToken(Base):
    """Stores refresh tokens for httpOnly cookie-based auth. One-time use with rotation."""
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token = Column(String(200), unique=True, nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CaseStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


# ─────────────────────────────────────────────────────────────────────────────
class User(Base):
    """
    Persistent user account. Replaces in-memory USERS_DB.
    """
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    full_name = Column(String(200), nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False, default="user")  # admin | doctor | user
    institution = Column(String(300), default="")
    status = Column(String(20), nullable=False, default="pending")  # pending | approved | rejected
    avatar = Column(String(10), default="")
    created_at = Column(DateTime(timezone=True), default=_now)

    def to_dict(self, include_hash=False):
        d = {
            "user_id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "institution": self.institution,
            "status": self.status,
            "avatar": self.avatar,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_hash:
            d["password_hash"] = self.password_hash
        return d


class InvestigationUrgency(str, enum.Enum):
    STAT = "STAT"
    ROUTINE = "ROUTINE"


# ─────────────────────────────────────────────────────────────────────────────
class Case(Base):
    """
    Represents a patient clinical case.
    """
    __tablename__ = "cases"

    id = Column(String, primary_key=True, default=_uuid)
    chief_complaint = Column(String(500), nullable=False)
    onset = Column(String(200))
    duration = Column(String(200))
    severity = Column(Integer)                # 1–10 self-reported scale
    associated_symptoms = Column(Text)
    past_medical_history = Column(Text)
    current_medications = Column(Text)
    allergies = Column(Text)
    symptoms_structured = Column(Text)        # JSON blob after Intake Agent processes it
    status = Column(Enum(CaseStatus), default=CaseStatus.PENDING, nullable=False)
    error_message = Column(Text)             # Set on FAILED status
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    # Embedding — only on PostgreSQL with pgvector. SQLAlchemy ignores unknown columns.
    embedding = Column(Vector(384)) if HAS_PGVECTOR else Column(Text, nullable=True)

    # Relationships
    messages = relationship("Message", back_populates="case", order_by="Message.sequence_order")
    investigations = relationship("InvestigationSuggestion", back_populates="case")
    summary = relationship("CaseSummary", back_populates="case", uselist=False)

    def to_dict(self):
        return {
            "case_id": self.id,
            "chief_complaint": self.chief_complaint,
            "onset": self.onset,
            "duration": self.duration,
            "severity": self.severity,
            "associated_symptoms": self.associated_symptoms,
            "past_medical_history": self.past_medical_history,
            "current_medications": self.current_medications,
            "allergies": self.allergies,
            "status": self.status.value if self.status else None,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ─────────────────────────────────────────────────────────────────────────────
class Message(Base):
    """
    A single message in the multi-agent debate transcript.
    """
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    agent_name = Column(String(100), nullable=False)  # e.g. "General Practitioner"
    content = Column(Text, nullable=False)
    sequence_order = Column(Integer, nullable=False)
    token_count = Column(Integer)                     # Optional — for evaluation metrics
    created_at = Column(DateTime(timezone=True), default=_now)

    case = relationship("Case", back_populates="messages")

    def to_dict(self):
        return {
            "id": self.id,
            "agent": self.agent_name,
            "content": self.content,
            "sequence": self.sequence_order,
        }


# ─────────────────────────────────────────────────────────────────────────────
class InvestigationSuggestion(Base):
    """
    A single investigation (lab, imaging, etc.) suggested by the Pathologist Agent.
    These are for EDUCATIONAL purposes only.
    """
    __tablename__ = "investigation_suggestions"

    id = Column(String, primary_key=True, default=_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    test_name = Column(String(300), nullable=False)
    rationale = Column(Text)
    urgency = Column(Enum(InvestigationUrgency), default=InvestigationUrgency.ROUTINE)
    created_at = Column(DateTime(timezone=True), default=_now)

    case = relationship("Case", back_populates="investigations")

    def to_dict(self):
        return {
            "test": self.test_name,
            "rationale": self.rationale,
            "urgency": self.urgency.value if self.urgency else None,
        }


# ─────────────────────────────────────────────────────────────────────────────
class CaseSummary(Base):
    """
    The final Markdown report produced by the Summarizer Agent.
    """
    __tablename__ = "case_summaries"

    id = Column(String, primary_key=True, default=_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, unique=True)
    summary_markdown = Column(Text, nullable=False)
    latency_seconds = Column(Float)      # Total pipeline wall-clock time (for evaluation)
    total_rounds = Column(Integer)        # How many agent turns were used
    trace_json = Column(Text)            # Reasoning trace tree JSON for visualization
    drs_score_json = Column(Text)        # Diagnostic Reasoning Score JSON
    created_at = Column(DateTime(timezone=True), default=_now)

    case = relationship("Case", back_populates="summary")

    def to_dict(self):
        import json
        result = {
            "summary_markdown": self.summary_markdown,
            "latency_seconds": self.latency_seconds,
            "total_rounds": self.total_rounds,
        }
        if self.trace_json:
            try:
                result["trace_json"] = json.loads(self.trace_json)
            except (json.JSONDecodeError, TypeError):
                result["trace_json"] = None
        if self.drs_score_json:
            try:
                result["drs_score_json"] = json.loads(self.drs_score_json)
            except (json.JSONDecodeError, TypeError):
                result["drs_score_json"] = None
        return result
