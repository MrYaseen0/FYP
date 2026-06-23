"""
Healtheon — Auth API Router
Endpoints:
    POST /api/auth/login        Login with email/password
    POST /api/auth/register     Self-register (pending approval)
    GET  /api/auth/me           Get current user info
    POST /api/auth/refresh      Refresh access token via refresh token cookie
    POST /api/auth/logout       Clear auth cookies + revoke refresh token
    POST /api/auth/forgot-password  Reset password (simulated)
    POST /api/auth/send-code    Send verification code to email
    POST /api/auth/verify-email     Verify email with 6-digit code
    POST /api/auth/guest-token  Get guest JWT token
"""
import json
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from backend.auth import (
    LoginRequest, RegisterRequest, TokenData,
    authenticate_user, create_access_token, get_current_user,
    register_user, get_user_by_email, ROLES,
    GUEST_TOKEN_EXPIRE_MINUTES, ACCESS_TOKEN_EXPIRE_MINUTES,
    create_reset_token, verify_reset_token, reset_user_password,
)
from backend.config import settings
from backend.db.database import get_db
from backend.db.models import User
from backend.db.audit_models import AuditLog
from backend.email_service import generate_code, store_code, verify_code, send_verification_email
from backend.security import (
    rate_limiter, get_client_ip,
    set_auth_cookies, clear_auth_cookies,
    create_refresh_token, rotate_refresh_token, revoke_refresh_token,
    get_refresh_from_cookie,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_response(user: dict) -> dict:
    role = user.get("role", "user")
    role_info = ROLES.get(role, ROLES["user"])
    return {
        "access_token": create_access_token({
            "sub": user.get("user_id", user.get("id")),
            "username": user["username"],
            "role": role,
        }),
        "token_type": "bearer",
        "user": {
            "user_id": user.get("user_id", user.get("id")),
            "username": user["username"],
            "email": user.get("email", ""),
            "full_name": user.get("full_name", ""),
            "role": role,
            "role_label": role_info["label"],
            "institution": user.get("institution", ""),
            "status": user.get("status", "unknown"),
            "avatar": user.get("avatar", "??"),
        },
    }


def _guest_response(guest_id: str) -> dict:
    return {
        "access_token": create_access_token(
            {"sub": guest_id, "username": "guest", "role": "user"},
            expires_delta=__import__("datetime").timedelta(minutes=GUEST_TOKEN_EXPIRE_MINUTES),
        ),
        "token_type": "bearer",
        "user": {
            "user_id": guest_id,
            "username": "guest",
            "email": "",
            "full_name": "Guest User",
            "role": "user",
            "role_label": "Guest",
            "institution": "",
            "status": "active",
            "avatar": "GU",
        },
    }


def _audit(db: Session, username: str, action: str, request: Request, details: dict = None, code: str = "200"):
    try:
        db.add(AuditLog(
            user_id="system",
            username=username,
            action=action,
            resource_type="auth",
            details=json.dumps(details or {}),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent", "")[:500],
            status_code=code,
        ))
        db.commit()
    except Exception:
        pass


# ── Rate Limits ─────────────────────────────────────────────────────────────
# (endpoint_name, max_attempts, window_seconds)
RATE_LIMITS = {
    "login":    (5, 900),       # 5 attempts per 15 min
    "register": (3, 3600),      # 3 attempts per hour
    "guest":    (10, 900),      # 10 attempts per 15 min
    "send_code": (3, 600),      # 3 attempts per 10 min
    "reset_pw": (3, 3600),      # 3 attempts per hour
}


@router.post("/login")
async def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Login with email/password. Account must be approved by admin."""
    ip = get_client_ip(request)
    rate_limiter.check("login", ip, *RATE_LIMITS["login"])

    user = authenticate_user(req.email, req.password, db=db)
    if not user:
        existing = get_user_by_email(req.email, db=db)
        if existing and existing.get("status") == "pending":
            _audit(db, req.email, "auth.login.denied", request, {"reason": "pending_approval"}, "403")
            raise HTTPException(status_code=403, detail="Account pending admin approval. Please wait.")
        if existing and existing.get("status") == "rejected":
            _audit(db, req.email, "auth.login.denied", request, {"reason": "rejected"}, "403")
            raise HTTPException(status_code=403, detail="Account access has been revoked.")
        _audit(db, req.email, "auth.login.failed", request, {"reason": "invalid_credentials"}, "401")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    _audit(db, user["username"], "auth.login.success", request, {"role": user["role"]})

    resp = _user_response(user)

    # Set httpOnly cookies (Phase 2)
    response = Response(content=json.dumps(resp), media_type="application/json")
    refresh_token = create_refresh_token(user["user_id"], db)
    set_auth_cookies(response, resp["access_token"], refresh_token)
    return response


@router.post("/register")
async def register(req: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Self-register. Account is pending until admin approves."""
    ip = get_client_ip(request)
    rate_limiter.check("register", ip, *RATE_LIMITS["register"])

    try:
        user = register_user(req, db=db)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    _audit(db, user["username"], "auth.register", request, {
        "email": req.email, "role_request": req.role_request, "status": "pending"
    }, "201")

    return {
        "message": "Registration successful. Your account is pending admin approval.",
        "status": "pending",
        "user": {
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "status": user["status"],
        },
    }


@router.get("/me")
async def get_me(current_user: TokenData = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current authenticated user info."""
    user = db.query(User).filter(User.username == current_user.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    role_info = ROLES.get(user.role, ROLES["user"])
    return {
        "id": user.id,
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "role_label": role_info["label"],
        "permissions": role_info["permissions"],
        "institution": user.institution or "",
        "status": user.status,
        "avatar": user.avatar or "??",
    }


@router.post("/refresh")
async def refresh_token(request: Request, db: Session = Depends(get_db)):
    """
    Refresh access token using the httpOnly refresh token cookie.
    Implements refresh token rotation: old token is invalidated, new pair issued.
    """
    old_refresh = get_refresh_from_cookie(request)
    if not old_refresh:
        raise HTTPException(status_code=401, detail="No refresh token found")

    try:
        user_id, new_refresh = rotate_refresh_token(old_refresh, db)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Look up user to create new access token
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    role = user.role or "user"
    new_access = create_access_token({
        "sub": user.id,
        "username": user.username,
        "role": role,
    })

    resp_data = {
        "access_token": new_access,
        "token_type": "bearer",
        "user": {
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": role,
            "role_label": ROLES.get(role, ROLES["user"])["label"],
            "institution": user.institution or "",
            "status": user.status,
            "avatar": user.avatar or "??",
        },
    }

    response = Response(content=json.dumps(resp_data), media_type="application/json")
    set_auth_cookies(response, new_access, new_refresh)
    return response


@router.post("/guest-token")
async def guest_token(request: Request, db: Session = Depends(get_db)):
    """Get a guest JWT token for free access without registration. Uses httpOnly cookies."""
    ip = get_client_ip(request)
    rate_limiter.check("guest", ip, *RATE_LIMITS["guest"])

    import uuid
    guest_id = f"guest_{uuid.uuid4().hex[:8]}"

    resp_data = _guest_response(guest_id)
    _audit(db, "guest", "auth.guest_token", request, {"guest_id": guest_id})

    # Set httpOnly cookies (Phase 2)
    response = Response(content=json.dumps(resp_data), media_type="application/json")
    refresh_token = create_refresh_token(guest_id, db)
    set_auth_cookies(response, resp_data["access_token"], refresh_token)
    return response


@router.post("/logout")
async def logout(request: Request, response: Response = None, db: Session = Depends(get_db)):
    """Clear auth cookies and revoke refresh token."""
    old_refresh = get_refresh_from_cookie(request)
    if old_refresh:
        try:
            revoke_refresh_token(old_refresh, db)
        except Exception:
            pass

    if response is None:
        response = Response(content='{"message":"Logged out"}', media_type="application/json")
    clear_auth_cookies(response)
    return response


@router.post("/forgot-password")
async def forgot_password(request: Request, db: Session = Depends(get_db)):
    """Send a password reset email. Always returns success to prevent email enumeration."""
    ip = get_client_ip(request)
    rate_limiter.check("reset_pw", ip, *RATE_LIMITS["reset_pw"])

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")
    email = body.get("email", "")
    if not email or not isinstance(email, str):
        raise HTTPException(status_code=400, detail="Email is required")

    email = email.strip().lower()
    _audit(db, email, "auth.forgot_password", request, {"email": email})

    # Always return success to prevent email enumeration
    success_msg = "If an account with that email exists, a reset link has been sent."

    user = get_user_by_email(email, db=db)
    if user:
        reset_token = create_reset_token(email)
        # Send reset email
        from backend.email_service import send_reset_email
        send_email_success, _ = send_reset_email(email, reset_token)
        _audit(db, email, "auth.reset_email_sent", request, {"email_sent": send_email_success})

    return {"message": success_msg}


@router.post("/send-code")
async def send_verification_code(request: Request, db: Session = Depends(get_db)):
    """Send a 6-digit verification code to the given email."""
    ip = get_client_ip(request)
    rate_limiter.check("send_code", ip, *RATE_LIMITS["send_code"])

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")

    email = body.get("email", "").strip().lower()
    if not email or not isinstance(email, str):
        raise HTTPException(status_code=400, detail="Email is required")

    code = generate_code()
    store_code(email, code)
    success, message = send_verification_email(email, code)

    _audit(db, email, "auth.send_code", request, {"success": success})

    if success:
        return {"message": message}
    else:
        raise HTTPException(status_code=500, detail=message)


@router.post("/verify-email")
async def verify_email(request: Request, db: Session = Depends(get_db)):
    """Verify email with 6-digit code."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")

    code = body.get("code", "").strip()
    email = body.get("email", "").strip().lower()

    if not email or not isinstance(email, str):
        raise HTTPException(status_code=400, detail="Email is required")
    if not code or not isinstance(code, str) or len(code) != 6 or not code.isdigit():
        raise HTTPException(status_code=400, detail="Invalid verification code format.")

    is_valid, message = verify_code(email, code)

    _audit(db, email, "auth.verify_email", request, {"verified": is_valid})

    if is_valid:
        return {"verified": True, "message": message}
    else:
        raise HTTPException(status_code=400, detail=message)


@router.post("/reset-password")
async def reset_password(request: Request, db: Session = Depends(get_db)):
    """Reset password using a valid reset token."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")

    token = body.get("token", "").strip()
    new_password = body.get("new_password", "")

    if not token:
        raise HTTPException(status_code=400, detail="Reset token is required")
    if not new_password:
        raise HTTPException(status_code=400, detail="New password is required")

    # Validate password complexity
    import re
    if len(new_password) < 10:
        raise HTTPException(status_code=400, detail="Password must be at least 10 characters")
    if not re.search(r"[A-Z]", new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    if not re.search(r"[0-9]", new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character")

    # Verify the reset token
    email = verify_reset_token(token)
    if not email:
        _audit(db, "unknown", "auth.reset_password.failed", request, {"reason": "invalid_token"}, "400")
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    # Reset the password
    success = reset_user_password(email, new_password, db=db)
    if not success:
        _audit(db, email, "auth.reset_password.failed", request, {"reason": "user_not_found"}, "404")
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    _audit(db, email, "auth.reset_password.success", request)
    return {"message": "Password has been reset successfully. You can now sign in."}
