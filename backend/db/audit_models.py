"""
Healtheon — Audit Log Model
Tracks every API action for compliance and monitoring.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime
from backend.db.database import Base


def _now():
    return datetime.now(timezone.utc)


def _uuid():
    return str(uuid.uuid4())


class AuditLog(Base):
    """
    Immutable audit trail of all system actions.
    Records who did what, when, and the outcome.
    """
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, nullable=False)
    username = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)       # e.g. "case.create", "case.rerun", "auth.login"
    resource_type = Column(String(50))                  # e.g. "case", "auth", "system"
    resource_id = Column(String)                        # e.g. case_id
    details = Column(Text)                              # JSON string with extra context
    ip_address = Column(String(45))                     # IPv4 or IPv6
    user_agent = Column(String(500))
    status_code = Column(String(10))                    # HTTP status code
    created_at = Column(DateTime(timezone=True), default=_now)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.username,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "details": self.details,
            "ip_address": self.ip_address,
            "status_code": self.status_code,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
