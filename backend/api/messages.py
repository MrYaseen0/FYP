"""
Healtheon — Messages API Router
Endpoints for chat messages between users.
"""
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from backend.auth import get_current_user, TokenData
from backend.db.database import get_db
from backend.db.models import User
from backend.db.models_extended import ChatMessage

router = APIRouter(prefix="/api/messages", tags=["messages"])


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


@router.get("")
def get_messages(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all messages for the current user (sent and received)."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    messages = (
        db.query(ChatMessage)
        .filter(or_(ChatMessage.sender_id == user.id, ChatMessage.receiver_id == user.id))
        .order_by(desc(ChatMessage.created_at))
        .limit(100)
        .all()
    )
    return {"messages": [m.to_dict() for m in messages]}


@router.get("/conversations")
def get_conversations(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get conversation list (unique contacts with last message)."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    messages = (
        db.query(ChatMessage)
        .filter(or_(ChatMessage.sender_id == user.id, ChatMessage.receiver_id == user.id))
        .order_by(desc(ChatMessage.created_at))
        .all()
    )

    conversations = {}
    for msg in messages:
        contact_id = msg.receiver_id if msg.sender_id == user.id else msg.sender_id
        if contact_id not in conversations:
            contact = db.query(User).filter(User.id == contact_id).first()
            conversations[contact_id] = {
                "contact_id": contact_id,
                "contact_name": contact.full_name if contact else "",
                "contact_avatar": contact.avatar if contact else "",
                "last_message": msg.content,
                "last_message_time": msg.created_at.isoformat() if msg.created_at else None,
                "unread_count": 0,
            }
        if msg.receiver_id == user.id and not msg.is_read:
            conversations[contact_id]["unread_count"] += 1

    return {"conversations": list(conversations.values())}


@router.get("/{contact_id}")
def get_conversation_messages(
    contact_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get messages between current user and a specific contact."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    contact = db.query(User).filter(User.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    messages = (
        db.query(ChatMessage)
        .filter(
            or_(
                (ChatMessage.sender_id == user.id) & (ChatMessage.receiver_id == contact_id),
                (ChatMessage.sender_id == contact_id) & (ChatMessage.receiver_id == user.id),
            )
        )
        .order_by(ChatMessage.created_at)
        .all()
    )

    # Mark messages from contact as read
    db.query(ChatMessage).filter(
        ChatMessage.sender_id == contact_id,
        ChatMessage.receiver_id == user.id,
        ChatMessage.is_read == False,
    ).update({"is_read": True})
    db.commit()

    return {
        "contact": {
            "id": contact.id,
            "name": contact.full_name,
            "avatar": contact.avatar,
        },
        "messages": [m.to_dict() for m in messages],
    }


@router.post("/{receiver_id}")
def send_message(
    receiver_id: str,
    req: SendMessageRequest,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message to another user."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    receiver = db.query(User).filter(User.id == receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    if not req.content or not req.content.strip():
        raise HTTPException(status_code=400, detail="Message content is required")

    msg = ChatMessage(
        sender_id=user.id,
        receiver_id=receiver_id,
        content=req.content.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return {"message": msg.to_dict()}
