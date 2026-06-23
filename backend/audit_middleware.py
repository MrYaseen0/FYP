"""
Healtheon — Audit Logging Middleware
Automatically logs every API request for compliance tracking.
"""
import json
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from jose import jwt, JWTError

from backend.db.database import SessionLocal
from backend.db.audit_models import AuditLog
from backend.auth import SECRET_KEY, ALGORITHM

logger = logging.getLogger("healtheon.audit")


def _extract_user_from_token(request: Request):
    """Try to extract user info from the Authorization JWT header."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return "anonymous", "anonymous"
    try:
        token = auth.split(" ", 1)[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub", "anonymous"), payload.get("username", "anonymous")
    except (JWTError, Exception):
        return "anonymous", "anonymous"


class AuditMiddleware(BaseHTTPMiddleware):
    """Logs every API request to the audit_logs table."""

    async def dispatch(self, request: Request, call_next):
        # Skip health checks and docs
        if request.url.path in ("/", "/health", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)

        start_time = time.time()
        response = await call_next(request)
        elapsed = round(time.time() - start_time, 3)

        # Extract user from JWT token in Authorization header
        user_id, username = _extract_user_from_token(request)

        # Determine action from method + path
        method = request.method
        path = request.url.path
        action = self._classify_action(method, path)
        resource_type = self._classify_resource(path)

        # Extract resource ID from path
        resource_id = None
        parts = path.strip("/").split("/")
        if len(parts) >= 3 and parts[0] == "api" and parts[1] == "cases":
            resource_id = parts[2] if len(parts) > 2 else None

        # Log to DB (best effort — don't break the request)
        try:
            db = SessionLocal()
            db.add(AuditLog(
                user_id=user_id,
                username=username,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=json.dumps({
                    "method": method,
                    "path": path,
                    "status_code": response.status_code,
                    "elapsed_seconds": elapsed,
                }),
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent", "")[:500],
                status_code=str(response.status_code),
            ))
            db.commit()
            db.close()
        except Exception as e:
            logger.warning(f"Audit log failed: {e}")

        # Also log to console
        logger.info(f"{method} {path} → {response.status_code} ({elapsed}s) [{username}]")

        return response

    @staticmethod
    def _classify_action(method: str, path: str) -> str:
        if "login" in path:
            return "auth.login"
        if "cases" in path:
            if method == "POST" and "/run" in path:
                return "case.rerun"
            if method == "POST":
                return "case.create"
            if method == "GET":
                return "case.read"
        if "admin" in path:
            return "admin.read"
        return f"api.{method.lower()}"

    @staticmethod
    def _classify_resource(path: str) -> str:
        if "login" in path:
            return "auth"
        if "cases" in path:
            return "case"
        if "admin" in path:
            return "admin"
        return "system"
