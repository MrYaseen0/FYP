"""
Healtheon — WebSocket Manager for Real-Time Agent Streaming

Provides:
    - WebSocket connection manager for broadcasting live updates
    - WS endpoint: /ws/case/{case_id}
    - SSE fallback endpoint: /api/cases/{case_id}/stream
"""
import json
import asyncio
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from backend.auth import decode_token
from backend.db.database import SessionLocal
from backend.db.models import Case, Message, CaseStatus

logger = logging.getLogger("healtheon.ws")

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """Manages active WebSocket connections grouped by case_id."""

    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = {}
        self._case_states: dict[str, dict] = {}

    async def connect(self, case_id: str, ws: WebSocket):
        await ws.accept()
        if case_id not in self._connections:
            self._connections[case_id] = []
        self._connections[case_id].append(ws)
        logger.info(f"WS connected: case={case_id} | total={len(self._connections[case_id])}")

    def disconnect(self, case_id: str, ws: WebSocket):
        if case_id in self._connections:
            self._connections[case_id] = [
                c for c in self._connections[case_id] if c != ws
            ]
            if not self._connections[case_id]:
                del self._connections[case_id]
        logger.info(f"WS disconnected: case={case_id}")

    async def broadcast(self, case_id: str, event: dict):
        if case_id not in self._connections:
            return
        dead = []
        for ws in self._connections[case_id]:
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(case_id, ws)

    def set_case_state(self, case_id: str, state: dict):
        self._case_states[case_id] = state

    def get_case_state(self, case_id: str) -> dict:
        return self._case_states.get(case_id, {})


manager = ConnectionManager()


async def broadcast_case_update(case_id: str, event_type: str, data: dict):
    """Broadcast an event to all connected clients for a case."""
    await manager.broadcast(case_id, {"type": event_type, **data})


@router.websocket("/ws/case/{case_id}")
async def websocket_case(ws: WebSocket, case_id: str, token: Optional[str] = Query(None)):
    """
    WebSocket endpoint for real-time case updates.

    Clients connect to: ws://localhost:8000/ws/case/{case_id}?token=xxx

    Events sent:
        - case.status   {status, timestamp}
        - case.message  {agent, content, sequence}
        - case.done     {transcript, summary}
        - case.error    {error_message}
        - case.ping     {}
    """
    # Validate token — required for all connections
    if not token:
        await ws.close(code=4001, reason="Authentication required")
        return

    token_data = decode_token(token)
    if not token_data:
        await ws.close(code=4001, reason="Invalid or expired token")
        return

    await manager.connect(case_id, ws)

    try:
        # Send initial state
        db = SessionLocal()
        try:
            case = db.query(Case).filter(Case.id == case_id).first()
            if case:
                await ws.send_json({
                    "type": "case.status",
                    "status": case.status.value if hasattr(case.status, 'value') else case.status,
                    "timestamp": case.created_at.isoformat() if case.created_at else None,
                })
        finally:
            db.close()

        # Keep connection alive and handle client messages
        while True:
            data = await ws.receive_text()
            # Client can send ping/pong or commands
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await ws.send_json({"type": "pong"})
                elif msg.get("type") == "subscribe":
                    # Client subscribing to specific events
                    pass
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(case_id, ws)
    except Exception as e:
        logger.error(f"WS error for case {case_id}: {e}")
        manager.disconnect(case_id, ws)


@router.get("/api/cases/{case_id}/stream")
async def sse_case_stream(case_id: str, token: str = Query(...)):
    """
    Server-Sent Events fallback for clients that can't use WebSockets.
    Streams live case updates as SSE events.
    """
    from fastapi.responses import StreamingResponse

    token_data = decode_token(token)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid token")

    async def event_generator():
        last_message_count = 0
        while True:
            db = SessionLocal()
            try:
                case = db.query(Case).filter(Case.id == case_id).first()
                if not case:
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Case not found'})}\n\n"
                    break

                status = case.status.value if hasattr(case.status, 'value') else case.status
                messages = db.query(Message).filter(
                    Message.case_id == case_id
                ).order_by(Message.sequence_order).all()

                # Send new messages
                for msg in messages[last_message_count:]:
                    yield f"data: {json.dumps({'type': 'message', 'agent': msg.agent_name, 'content': msg.content, 'sequence': msg.sequence_order})}\n\n"
                last_message_count = len(messages)

                # Send status update
                yield f"data: {json.dumps({'type': 'status', 'status': status, 'message_count': len(messages)})}\n\n"

                if status in ('done', 'failed'):
                    yield f"data: {json.dumps({'type': 'complete', 'status': status})}\n\n"
                    break

            finally:
                db.close()

            await asyncio.sleep(2)  # Poll every 2 seconds

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
