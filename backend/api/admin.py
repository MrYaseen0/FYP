"""
Healtheon — Superuser Admin API Router

Full database visibility — admin sees everything hidden from other roles.
Every table, every row, every relationship, system health, agent memory, DRS analytics.

Endpoints:
    GET  /api/admin/stats                  System-wide statistics
    GET  /api/admin/logs                   Audit logs
    GET  /api/admin/system-health          DB size, LLM status, uptime, memory

    GET  /api/admin/users                  List all users (full details)
    GET  /api/admin/users/pending          Pending registrations
    POST /api/admin/users/{id}/approve     Approve user
    POST /api/admin/users/{id}/reject      Reject user
    PUT  /api/admin/users/{id}/role        Change role
    POST /api/admin/users/{id}/ban         Ban user (set status=rejected)

    GET  /api/admin/database/tables        All tables with row counts
    GET  /api/admin/database/table/{name}  Full table data with pagination
    GET  /api/admin/database/summary       All table row counts + DB size

    GET  /api/admin/cases                  All cases with full details
    GET  /api/admin/cases/{id}             Full case: messages, investigations, summary, feedback, predictions
    DELETE /api/admin/cases/{id}           Delete a case

    GET  /api/admin/agent-patterns         All agent memory patterns
    GET  /api/admin/agent-stats            Per-agent accuracy, biases, top differentials
    GET  /api/admin/predictions            All student predictions
    GET  /api/admin/feedback               All feedback entries
    GET  /api/admin/drs-analytics          DRS score analytics across all scored cases
    GET  /api/admin/health-metrics-all     All health metrics (all users)
    GET  /api/admin/appointments-all       All appointments
    GET  /api/admin/prescriptions-all      All prescriptions
    GET  /api/admin/notifications-all      All notifications
    GET  /api/admin/chat-messages-all      All chat messages
    GET  /api/admin/medical-records-all    All medical records
    GET  /api/admin/departments-all        All departments
"""
import os
import json
import platform
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, inspect, text

from backend.db.database import get_db, engine
from backend.db.models import (
    Case, CaseStatus, Message, InvestigationSuggestion,
    CaseSummary, User, RefreshToken,
)
from backend.db.models_extended import (
    Appointment, HealthMetric, MedicalRecord, Notification,
    ChatMessage, Prescription, Department,
    CaseFeedback, StudentPrediction, AgentPattern,
)
from backend.db.audit_models import AuditLog
from backend.auth import (
    require_admin, TokenData, ROLES,
    approve_user, reject_user, get_pending_users, get_all_users,
    get_user_by_username,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


class RoleUpdate(BaseModel):
    role: str


# ═══════════════════════════════════════════════════════════════════════════
#  SYSTEM STATISTICS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/stats")
async def get_stats(
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    total_cases = db.query(Case).count()
    status_dist = {}
    for s in CaseStatus:
        status_dist[s.value] = db.query(Case).filter(Case.status == s).count()

    total_messages = db.query(Message).count()
    total_investigations = db.query(InvestigationSuggestion).count()
    total_summaries = db.query(CaseSummary).count()
    avg_latency = db.query(func.avg(CaseSummary.latency_seconds)).scalar() or 0
    avg_rounds = db.query(func.avg(CaseSummary.total_rounds)).scalar() or 0

    yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_actions = db.query(AuditLog).filter(AuditLog.created_at >= yesterday).count()

    users = get_all_users()
    pending = [u for u in users if u.get("status") == "pending"]
    approved = [u for u in users if u.get("status") == "approved"]
    rejected = [u for u in users if u.get("status") == "rejected"]

    total_feedback = db.query(CaseFeedback).count()
    positive_feedback = db.query(CaseFeedback).filter(CaseFeedback.was_helpful == True).count()
    total_predictions = db.query(StudentPrediction).count()
    total_patterns = db.query(AgentPattern).count()
    total_drs = db.query(CaseSummary).filter(CaseSummary.drs_score_json.isnot(None)).count()

    avg_drs = 0
    drs_rows = db.query(CaseSummary.drs_score_json).filter(CaseSummary.drs_score_json.isnot(None)).all()
    if drs_rows:
        scores = []
        for (raw,) in drs_rows:
            try:
                d = json.loads(raw)
                scores.append(d.get("overall", 0))
            except (json.JSONDecodeError, TypeError):
                pass
        if scores:
            avg_drs = round(sum(scores) / len(scores), 1)

    return {
        "cases": {"total": total_cases, "by_status": status_dist},
        "pipeline": {
            "total_messages": total_messages,
            "total_investigations": total_investigations,
            "total_summaries": total_summaries,
            "avg_latency_seconds": round(avg_latency, 1),
            "avg_rounds": round(avg_rounds, 1),
        },
        "audit": {"actions_24h": recent_actions},
        "users": {
            "total": len(users),
            "approved": len(approved),
            "pending": len(pending),
            "rejected": len(rejected),
            "roles": {
                "admin": len([u for u in users if u.get("role") == "admin"]),
                "doctor": len([u for u in users if u.get("role") == "doctor"]),
                "user": len([u for u in users if u.get("role") == "user"]),
            },
        },
        "learning": {
            "total_feedback": total_feedback,
            "positive_feedback": positive_feedback,
            "negative_feedback": total_feedback - positive_feedback,
            "feedback_rate": round(positive_feedback / total_feedback * 100, 1) if total_feedback else 0,
            "total_predictions": total_predictions,
        },
        "agents": {
            "total_patterns": total_patterns,
        },
        "drs": {
            "scored_cases": total_drs,
            "avg_score": avg_drs,
        },
        "system": {"status": "operational", "version": "2.1.0"},
    }


# ═══════════════════════════════════════════════════════════════════════════
#  SYSTEM HEALTH — hidden from everyone except admin
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/system-health")
async def system_health(
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    # Database info
    db_path = os.path.join(os.getcwd(), "healtheon.db")
    db_size = 0
    db_exists = False
    if os.path.exists(db_path):
        db_size = os.path.getsize(db_path)
        db_exists = True

    # Row counts for all tables
    table_counts = {}
    all_models = [
        ("users", User), ("cases", Case), ("messages", Message),
        ("investigation_suggestions", InvestigationSuggestion),
        ("case_summaries", CaseSummary), ("refresh_tokens", RefreshToken),
        ("appointments", Appointment), ("health_metrics", HealthMetric),
        ("medical_records", MedicalRecord), ("notifications", Notification),
        ("chat_messages", ChatMessage), ("prescriptions", Prescription),
        ("departments", Department), ("case_feedback", CaseFeedback),
        ("student_predictions", StudentPrediction), ("agent_patterns", AgentPattern),
        ("audit_logs", AuditLog),
    ]
    for name, model in all_models:
        try:
            table_counts[name] = db.query(model).count()
        except Exception:
            table_counts[name] = -1

    # LLM config
    from backend.config import settings
    llm_provider = getattr(settings, "LLM_PROVIDER", "unknown")
    has_openai = bool(getattr(settings, "OPENAI_API_KEY", ""))
    has_groq = bool(getattr(settings, "GROQ_API_KEY", ""))
    has_ollama = False
    try:
        import httpx
        resp = httpx.get("http://localhost:11434/api/tags", timeout=2)
        has_ollama = resp.status_code == 200
    except Exception:
        pass

    # Python + FastAPI info
    python_version = platform.python_version()
    db_driver = str(engine.url).split(":")[0] if hasattr(engine, "url") else "sqlite"

    return {
        "database": {
            "exists": db_exists,
            "size_bytes": db_size,
            "size_human": f"{db_size / 1024 / 1024:.1f} MB" if db_size else "0 B",
            "driver": db_driver,
            "table_counts": table_counts,
            "total_rows": sum(v for v in table_counts.values() if v > 0),
        },
        "llm": {
            "provider": llm_provider,
            "openai_configured": has_openai,
            "groq_configured": has_groq,
            "ollama_running": has_ollama,
            "demo_mode": not has_openai and not has_groq and not has_ollama,
        },
        "runtime": {
            "python_version": python_version,
            "platform": platform.system(),
            "hostname": platform.node(),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════
#  AUDIT LOGS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/logs")
async def get_logs(
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return {"logs": [l.to_dict() for l in logs], "total": db.query(AuditLog).count()}


# ═══════════════════════════════════════════════════════════════════════════
#  USER MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

def _safe_user(u) -> dict:
    if isinstance(u, dict):
        return {
            "user_id": u.get("user_id"),
            "username": u.get("username"),
            "email": u.get("email"),
            "full_name": u.get("full_name"),
            "role": u.get("role"),
            "role_label": ROLES.get(u.get("role"), ROLES["user"])["label"],
            "institution": u.get("institution", ""),
            "status": u.get("status"),
            "avatar": u.get("avatar"),
            "created_at": u.get("created_at"),
        }
    return {
        "user_id": u.id,
        "username": u.username,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "role_label": ROLES.get(u.role, ROLES["user"])["label"],
        "institution": u.institution or "",
        "status": u.status,
        "avatar": u.avatar,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


@router.get("/users")
async def list_users(
    status: Optional[str] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    q = db.query(User)
    if status:
        q = q.filter(User.status == status)
    if role:
        q = q.filter(User.role == role)
    users = q.order_by(User.created_at.desc()).all()
    return {"users": [_safe_user(u) for u in users], "count": users.__len__()}


@router.get("/users/pending")
async def list_pending(_: TokenData = Depends(require_admin)):
    users = get_pending_users()
    return {"users": [_safe_user(u) for u in users], "count": len(users)}


@router.get("/users/{username}")
async def get_user_detail(
    username: str,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    """Get full user detail — admin sees everything."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    case_count = db.query(Case).join(Message).filter(Message.case_id == Case.id).count()
    patient_cases = db.query(Case).filter(
        Case.id.in_(db.query(Message.case_id).distinct())
    ).count()

    return {
        "user": _safe_user(user),
        "case_count": case_count,
        "patient_cases": patient_cases,
    }


@router.post("/users/{username}/approve")
async def approve(username: str, _: TokenData = Depends(require_admin)):
    try:
        user = approve_user(username)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"message": f"User {username} approved", "user": _safe_user(user)}


@router.post("/users/{username}/reject")
async def reject(username: str, _: TokenData = Depends(require_admin)):
    try:
        user = reject_user(username)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"message": f"User {username} rejected", "user": _safe_user(user)}


@router.post("/users/{username}/ban")
async def ban_user(
    username: str,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    """Ban a user — set status to rejected, cannot login."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot ban the last admin")
    user.status = "rejected"
    db.commit()
    return {"message": f"User {username} banned", "user": _safe_user(user)}


@router.put("/users/{username}/role")
async def change_role(
    username: str,
    body: RoleUpdate,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {list(ROLES.keys())}")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin" and body.role != "admin":
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last admin")
    user.role = body.role
    db.commit()
    return {"message": f"User {username} role changed to {body.role}", "user": _safe_user(user)}


# ═══════════════════════════════════════════════════════════════════════════
#  DATABASE BROWSER — admin sees every table
# ═══════════════════════════════════════════════════════════════════════════

_TABLE_MAP = {
    "users": User,
    "cases": Case,
    "messages": Message,
    "investigation_suggestions": InvestigationSuggestion,
    "case_summaries": CaseSummary,
    "refresh_tokens": RefreshToken,
    "appointments": Appointment,
    "health_metrics": HealthMetric,
    "medical_records": MedicalRecord,
    "notifications": Notification,
    "chat_messages": ChatMessage,
    "prescriptions": Prescription,
    "departments": Department,
    "case_feedback": CaseFeedback,
    "student_predictions": StudentPrediction,
    "agent_patterns": AgentPattern,
    "audit_logs": AuditLog,
}


@router.get("/database/tables")
async def list_tables(_: TokenData = Depends(require_admin)):
    """List all database tables with row counts."""
    tables = []
    for name, model in _TABLE_MAP.items():
        try:
            count = __import__("backend.db.database", fromlist=["get_db"]).get_db.__wrapped__  # noqa
        except Exception:
            pass
    # Use raw count
    from backend.db.database import SessionLocal
    db = SessionLocal()
    try:
        for name, model in _TABLE_MAP.items():
            try:
                count = db.query(model).count()
            except Exception:
                count = -1
            tables.append({"name": name, "rows": count, "model": model.__name__})
    finally:
        db.close()

    return {"tables": tables, "total_tables": len(tables)}


@router.get("/database/summary")
async def database_summary(
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    """Quick summary of all tables."""
    summary = {}
    for name, model in _TABLE_MAP.items():
        try:
            summary[name] = db.query(model).count()
        except Exception:
            summary[name] = -1

    db_path = os.path.join(os.getcwd(), "healtheon.db")
    db_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0

    return {
        "tables": summary,
        "total_tables": len(summary),
        "total_rows": sum(v for v in summary.values() if v > 0),
        "db_size": f"{db_size / 1024 / 1024:.1f} MB" if db_size else "0 B",
    }


@router.get("/database/table/{table_name}")
async def get_table_data(
    table_name: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    """Fetch any table with pagination and optional search."""
    model = _TABLE_MAP.get(table_name)
    if not model:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")

    q = db.query(model)

    # Simple text search across string columns
    if search:
        from sqlalchemy import or_
        string_cols = [c for c in model.__table__.columns if c.type.__class__.__name__ in ("String", "Text")]
        if string_cols:
            filters = []
            for col in string_cols[:5]:
                filters.append(col.ilike(f"%{search}%"))
            q = q.filter(or_(*filters))

    total = q.count()
    rows = q.offset(skip).limit(limit).all()

    return {
        "table": table_name,
        "rows": [r.to_dict() if hasattr(r, "to_dict") else {c.name: getattr(r, c.name, None) for c in model.__table__.columns} for r in rows],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


# ═══════════════════════════════════════════════════════════════════════════
#  CASES — full detail with all relationships
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/cases")
async def list_all_cases(
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    q = db.query(Case)
    if status:
        try:
            q = q.filter(Case.status == CaseStatus(status))
        except ValueError:
            pass
    total = q.count()
    cases = q.order_by(Case.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for c in cases:
        d = c.to_dict()
        d["message_count"] = len(c.messages) if c.messages else 0
        d["investigation_count"] = len(c.investigations) if c.investigations else 0
        d["has_summary"] = c.summary is not None
        d["has_drs"] = c.summary.drs_score_json is not None if c.summary else False
        d["has_trace"] = c.summary.trace_json is not None if c.summary else False
        result.append(d)

    return {"cases": result, "total": total, "skip": skip, "limit": limit}


@router.get("/cases/{case_id}")
async def get_case_detail(
    case_id: str,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    """Full case detail — admin sees messages, investigations, summary, feedback, predictions."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    messages = [m.to_dict() for m in (case.messages or [])]
    investigations = [i.to_dict() for i in (case.investigations or [])]

    summary = None
    if case.summary:
        summary = case.summary.to_dict()
        summary["id"] = case.summary.id

    feedback = [
        f.to_dict() for f in db.query(CaseFeedback).filter(CaseFeedback.case_id == case_id).all()
    ]

    predictions = [
        p.to_dict() for p in db.query(StudentPrediction).filter(StudentPrediction.case_id == case_id).all()
    ]

    patterns = [
        ap.to_dict() for ap in db.query(AgentPattern).filter(AgentPattern.case_id == case_id).all()
    ]

    return {
        "case": case.to_dict(),
        "messages": messages,
        "investigations": investigations,
        "summary": summary,
        "feedback": feedback,
        "predictions": predictions,
        "agent_patterns": patterns,
    }


@router.delete("/cases/{case_id}")
async def delete_case(
    case_id: str,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    """Admin can delete any case and all related data."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    db.query(Message).filter(Message.case_id == case_id).delete()
    db.query(InvestigationSuggestion).filter(InvestigationSuggestion.case_id == case_id).delete()
    db.query(CaseSummary).filter(CaseSummary.case_id == case_id).delete()
    db.query(CaseFeedback).filter(CaseFeedback.case_id == case_id).delete()
    db.query(StudentPrediction).filter(StudentPrediction.case_id == case_id).delete()
    db.query(AgentPattern).filter(AgentPattern.case_id == case_id).delete()
    db.delete(case)
    db.commit()

    return {"message": f"Case {case_id} and all related data deleted"}


# ═══════════════════════════════════════════════════════════════════════════
#  AGENT PATTERNS & MEMORY — hidden from all except admin
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/agent-patterns")
async def list_agent_patterns(
    agent_name: Optional[str] = None,
    pattern_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    q = db.query(AgentPattern)
    if agent_name:
        q = q.filter(AgentPattern.agent_name == agent_name)
    if pattern_type:
        q = q.filter(AgentPattern.pattern_type == pattern_type)
    total = q.count()
    patterns = q.order_by(AgentPattern.created_at.desc()).offset(skip).limit(limit).all()
    return {"patterns": [p.to_dict() for p in patterns], "total": total}


@router.get("/agent-stats")
async def agent_statistics(
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    """Per-agent performance stats from memory patterns."""
    agent_names = [r[0] for r in db.query(AgentPattern.agent_name).distinct().all()]
    stats = {}
    for name in agent_names:
        patterns = db.query(AgentPattern).filter(AgentPattern.agent_name == name).all()
        correct = sum(1 for p in patterns if p.was_correct is True)
        total_with_verdict = sum(1 for p in patterns if p.was_correct is not None)
        stats[name] = {
            "total_patterns": len(patterns),
            "correct": correct,
            "accuracy": round(correct / total_with_verdict * 100, 1) if total_with_verdict else None,
            "pattern_types": {},
        }
        for p in patterns:
            stats[name]["pattern_types"][p.pattern_type] = stats[name]["pattern_types"].get(p.pattern_type, 0) + 1

    return {"agents": stats, "total_agents": len(agent_names)}


# ═══════════════════════════════════════════════════════════════════════════
#  STUDENT PREDICTIONS — all predictions across all users
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/predictions")
async def list_all_predictions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    total = db.query(StudentPrediction).count()
    preds = db.query(StudentPrediction).order_by(
        StudentPrediction.created_at.desc()
    ).offset(skip).limit(limit).all()

    result = []
    for p in preds:
        d = p.to_dict()
        user = db.query(User).filter(User.id == p.user_id).first()
        d["username"] = user.username if user else "unknown"
        d["full_name"] = user.full_name if user else "Unknown"
        case = db.query(Case).filter(Case.id == p.case_id).first()
        d["chief_complaint"] = case.chief_complaint if case else "—"
        result.append(d)

    return {"predictions": result, "total": total, "skip": skip, "limit": limit}


# ═══════════════════════════════════════════════════════════════════════════
#  FEEDBACK — all feedback
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/feedback")
async def list_all_feedback(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    total = db.query(CaseFeedback).count()
    feedbacks = db.query(CaseFeedback).order_by(
        CaseFeedback.created_at.desc()
    ).offset(skip).limit(limit).all()

    result = []
    for f in feedbacks:
        d = f.to_dict()
        user = db.query(User).filter(User.id == f.user_id).first()
        d["username"] = user.username if user else "unknown"
        d["full_name"] = user.full_name if user else "Unknown"
        case = db.query(Case).filter(Case.id == f.case_id).first()
        d["chief_complaint"] = case.chief_complaint if case else "—"
        result.append(d)

    return {"feedback": result, "total": total, "skip": skip, "limit": limit}


# ═══════════════════════════════════════════════════════════════════════════
#  DRS ANALYTICS — admin sees diagnostic scoring across all cases
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/drs-analytics")
async def drs_analytics(
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    """DRS score analytics across all scored cases."""
    rows = db.query(CaseSummary).filter(CaseSummary.drs_score_json.isnot(None)).all()
    if not rows:
        return {"cases": 0, "avg": 0, "distribution": {}, "cases_list": [], "dimension_avg": {}}

    scores = []
    dimension_sums = {}
    cases_list = []
    for cs in rows:
        try:
            d = json.loads(cs.drs_score_json)
            overall = d.get("overall", 0)
            scores.append(overall)
            for dim in ["differentials", "evidence_use", "bias_avoidance", "completeness", "urgency_detection"]:
                if dim in d:
                    dimension_sums[dim] = dimension_sums.get(dim, 0) + d[dim]
            case = db.query(Case).filter(Case.id == cs.case_id).first()
            cases_list.append({
                "case_id": cs.case_id,
                "chief_complaint": case.chief_complaint if case else "—",
                "overall": overall,
                "missed": d.get("missed", []),
                "strengths": d.get("strengths", []),
                "created_at": cs.created_at.isoformat() if cs.created_at else None,
            })
        except (json.JSONDecodeError, TypeError):
            pass

    n = len(scores) or 1
    dimension_avg = {k: round(v / n, 1) for k, v in dimension_sums.items()}

    # Distribution buckets
    dist = {"excellent_80_100": 0, "good_60_79": 0, "moderate_40_59": 0, "low_0_39": 0}
    for s in scores:
        if s >= 80: dist["excellent_80_100"] += 1
        elif s >= 60: dist["good_60_79"] += 1
        elif s >= 40: dist["moderate_40_59"] += 1
        else: dist["low_0_39"] += 1

    return {
        "cases": len(scores),
        "avg": round(sum(scores) / n, 1),
        "min": min(scores) if scores else 0,
        "max": max(scores) if scores else 0,
        "distribution": dist,
        "dimension_avg": dimension_avg,
        "cases_list": sorted(cases_list, key=lambda x: x["overall"], reverse=True),
    }


# ═══════════════════════════════════════════════════════════════════════════
#  ALL-TABLE ENDPOINTS — admin sees everything
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/health-metrics-all")
async def all_health_metrics(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    total = db.query(HealthMetric).count()
    items = db.query(HealthMetric).order_by(HealthMetric.recorded_at.desc()).offset(skip).limit(limit).all()
    result = []
    for h in items:
        d = h.to_dict()
        user = db.query(User).filter(User.id == h.user_id).first()
        d["username"] = user.username if user else "unknown"
        d["full_name"] = user.full_name if user else "Unknown"
        result.append(d)
    return {"metrics": result, "total": total}


@router.get("/appointments-all")
async def all_appointments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    total = db.query(Appointment).count()
    items = db.query(Appointment).order_by(Appointment.created_at.desc()).offset(skip).limit(limit).all()
    return {"appointments": [a.to_dict() for a in items], "total": total}


@router.get("/prescriptions-all")
async def all_prescriptions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    total = db.query(Prescription).count()
    items = db.query(Prescription).order_by(Prescription.created_at.desc()).offset(skip).limit(limit).all()
    return {"prescriptions": [p.to_dict() for p in items], "total": total}


@router.get("/notifications-all")
async def all_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    total = db.query(Notification).count()
    items = db.query(Notification).order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for n in items:
        d = n.to_dict()
        user = db.query(User).filter(User.id == n.user_id).first()
        d["username"] = user.username if user else "unknown"
        result.append(d)
    return {"notifications": result, "total": total}


@router.get("/chat-messages-all")
async def all_chat_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    total = db.query(ChatMessage).count()
    items = db.query(ChatMessage).order_by(ChatMessage.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for cm in items:
        d = cm.to_dict()
        result.append(d)
    return {"messages": result, "total": total}


@router.get("/medical-records-all")
async def all_medical_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    total = db.query(MedicalRecord).count()
    items = db.query(MedicalRecord).order_by(MedicalRecord.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for mr in items:
        d = mr.to_dict()
        user = db.query(User).filter(User.id == mr.user_id).first()
        d["username"] = user.username if user else "unknown"
        result.append(d)
    return {"records": result, "total": total}


@router.get("/departments-all")
async def all_departments(
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    items = db.query(Department).all()
    return {"departments": [d.to_dict() for d in items], "total": len(items)}
