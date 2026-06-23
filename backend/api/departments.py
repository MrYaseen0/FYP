"""
Healtheon — Departments API Router
Endpoints for department management (admin).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.auth import get_current_user, require_admin, TokenData
from backend.db.database import get_db
from backend.db.models import User
from backend.db.models_extended import Department

router = APIRouter(prefix="/api/departments", tags=["departments"])


@router.get("")
def get_departments(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all departments."""
    departments = db.query(Department).order_by(Department.name).all()
    return {"departments": [d.to_dict() for d in departments]}
