"""
Healtheon — Notifications API Router
Endpoints for user notifications.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.auth import get_current_user, TokenData
from backend.db.database import get_db
from backend.db.models import User
from backend.db.models_extended import Notification

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def get_notifications(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all notifications for the current user."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(desc(Notification.created_at))
        .limit(50)
        .all()
    )
    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.is_read == False)
        .count()
    )
    return {
        "notifications": [n.to_dict() for n in notifications],
        "unread_count": unread_count,
    }


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}


@router.post("/read-all")
def mark_all_read(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
