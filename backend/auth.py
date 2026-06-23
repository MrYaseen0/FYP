"""
Healtheon — Authentication Module
Secure JWT auth with SQLite persistence, self-registration, approval workflow, and RBAC.
"""
import os
import uuid
import re
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from backend.config import settings
from backend.db.database import SessionLocal, get_db
from backend.db.models import User

# ── Password Hashing ───────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── JWT Config ─────────────────────────────────────────────────────────────
SECRET_KEY = settings.SECRET_KEY or os.getenv("SECRET_KEY", "")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be set in .env or environment variables")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours for registered users
GUEST_TOKEN_EXPIRE_MINUTES = 15          # 15 minutes for guest users (Phase 2 security)

# Password reset token: 1 hour expiry, separate secret
RESET_TOKEN_EXPIRE_MINUTES = 60
RESET_TOKEN_SECRET = os.getenv("RESET_TOKEN_SECRET", SECRET_KEY + "_reset")

# ── Bearer Token Extractor ────────────────────────────────────────────────
security = HTTPBearer(auto_error=False)

# ── Role Definitions ──────────────────────────────────────────────────────
ROLES = {
    "admin": {
        "label": "System Administrator",
        "level": 100,
        "permissions": [
            "cases.read", "cases.create", "cases.delete",
            "admin.read", "admin.write", "admin.users",
            "pipeline.read", "pipeline.write",
            "audit.read",
        ],
    },
    "doctor": {
        "label": "Clinician",
        "level": 50,
        "permissions": [
            "cases.read", "cases.create",
            "pipeline.read", "pipeline.write",
        ],
    },
    "user": {
        "label": "Clinical Researcher",
        "level": 10,
        "permissions": [
            "cases.read", "cases.create",
            "pipeline.read",
        ],
    },
}


# ── Schemas ────────────────────────────────────────────────────────────────
class TokenData(BaseModel):
    user_id: Optional[str] = None
    username: Optional[str] = None
    role: Optional[str] = None
    role_level: Optional[int] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    institution: str = ""
    role_request: str = "user"

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError("Full name is required")
        return v.strip()

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Invalid email address")
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 10:
            raise ValueError("Password must be at least 10 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", v):
            raise ValueError("Password must contain at least one special character (!@#$%^&* etc.)")
        return v

    @field_validator("role_request")
    @classmethod
    def validate_role(cls, v):
        if v not in ("user", "doctor"):
            raise ValueError("Invalid role request")
        return v


# ── Database Helpers ──────────────────────────────────────────────────────
def _get_db():
    """Get a standalone DB session (for use outside FastAPI DI)."""
    return SessionLocal()


def _seed_admin():
    """Seed admin account if it doesn't exist."""
    db = _get_db()
    try:
        existing = db.query(User).filter(User.email == "admin@healtheon.local").first()
        if not existing:
            admin = User(
                id=f"usr_{uuid.uuid4().hex[:12]}",
                username="admin",
                email="admin@healtheon.local",
                full_name="System Administrator",
                password_hash=pwd_context.hash(settings.ADMIN_PASSWORD),
                role="admin",
                institution="Healtheon",
                status="approved",
                avatar="SA",
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()


# Seeding is deferred to main.py lifespan (tables must exist first)


# ── User Operations (DB-backed) ──────────────────────────────────────────
def get_user_by_email(email: str, db: Session = None) -> Optional[dict]:
    close = False
    if db is None:
        db = _get_db()
        close = True
    try:
        user = db.query(User).filter(User.email == email.lower()).first()
        return user.to_dict() if user else None
    finally:
        if close:
            db.close()


def get_user_by_username(username: str, db: Session = None) -> Optional[dict]:
    close = False
    if db is None:
        db = _get_db()
        close = True
    try:
        user = db.query(User).filter(User.username == username).first()
        return user.to_dict() if user else None
    finally:
        if close:
            db.close()


def authenticate_user(email: str, password: str, db: Session = None) -> Optional[dict]:
    close = False
    if db is None:
        db = _get_db()
        close = True
    try:
        user = db.query(User).filter(User.email == email.lower()).first()
        if not user:
            return None
        if user.status != "approved":
            return None
        if not pwd_context.verify(password, user.password_hash):
            return None
        return user.to_dict()
    finally:
        if close:
            db.close()


def register_user(req: RegisterRequest, db: Session = None) -> dict:
    close = False
    if db is None:
        db = _get_db()
        close = True
    try:
        existing = db.query(User).filter(User.email == req.email).first()
        if existing:
            raise ValueError("An account with this email already exists")

        base_username = req.email.split("@")[0]
        username = base_username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1

        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        initials = "".join(w[0].upper() for w in req.full_name.split()[:2])

        user = User(
            id=user_id,
            username=username,
            email=req.email,
            full_name=req.full_name,
            password_hash=pwd_context.hash(req.password),
            role=req.role_request,
            institution=req.institution,
            status="pending",
            avatar=initials,
        )
        db.add(user)
        db.commit()
        return user.to_dict()
    finally:
        if close:
            db.close()


def approve_user(username: str, db: Session = None) -> dict:
    close = False
    if db is None:
        db = _get_db()
        close = True
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise ValueError("User not found")
        if user.status == "approved":
            raise ValueError("User already approved")
        user.status = "approved"
        db.commit()
        return user.to_dict()
    finally:
        if close:
            db.close()


def reject_user(username: str, db: Session = None) -> dict:
    close = False
    if db is None:
        db = _get_db()
        close = True
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise ValueError("User not found")
        user.status = "rejected"
        db.commit()
        return user.to_dict()
    finally:
        if close:
            db.close()


def get_pending_users(db: Session = None) -> list[dict]:
    close = False
    if db is None:
        db = _get_db()
        close = True
    try:
        return [u.to_dict() for u in db.query(User).filter(User.status == "pending").all()]
    finally:
        if close:
            db.close()


def get_all_users(db: Session = None) -> list[dict]:
    close = False
    if db is None:
        db = _get_db()
        close = True
    try:
        return [u.to_dict() for u in db.query(User).all()]
    finally:
        if close:
            db.close()


# ── JWT Operations ────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role = payload.get("role", "user")
        role_info = ROLES.get(role, ROLES["user"])
        return TokenData(
            user_id=payload.get("sub"),
            username=payload.get("username"),
            role=role,
            role_level=role_info["level"],
        )
    except JWTError:
        return None


# ── FastAPI Dependencies ──────────────────────────────────────────────────
def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> TokenData:
    """Extract JWT from Bearer header OR httpOnly cookie (Phase 2)."""
    from backend.security import get_token_from_cookie

    token = None

    # 1. Try Bearer header first (registered users)
    if credentials:
        token = credentials.credentials

    # 2. Fall back to httpOnly cookie (guest users)
    if not token:
        token = get_token_from_cookie(request)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = decode_token(token)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token_data


def require_role(min_role: str):
    """Dependency factory: requires a minimum role level."""
    min_level = ROLES.get(min_role, {}).get("level", 0)
    def checker(current_user: TokenData = Depends(get_current_user)) -> TokenData:
        if (current_user.role_level or 0) < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {min_role} or higher.",
            )
        return current_user
    return checker


def require_admin(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ── Password Reset Token Operations ───────────────────────────────────────
def create_reset_token(email: str) -> str:
    """Create a password reset token (JWT, 1hr expiry, separate secret)."""
    to_encode = {
        "sub": email,
        "type": "password_reset",
        "iat": datetime.now(timezone.utc),
    }
    expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, RESET_TOKEN_SECRET, algorithm=ALGORITHM)


def verify_reset_token(token: str) -> Optional[str]:
    """Verify a password reset token and return the email, or None if invalid."""
    try:
        payload = jwt.decode(token, RESET_TOKEN_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "password_reset":
            return None
        email = payload.get("sub")
        if not email:
            return None
        return email.lower()
    except JWTError:
        return None


def reset_user_password(email: str, new_password: str, db: Session = None) -> bool:
    """Reset a user's password. Returns True on success, False if user not found."""
    close = False
    if db is None:
        db = _get_db()
        close = True
    try:
        user = db.query(User).filter(User.email == email.lower()).first()
        if not user:
            return False
        user.password_hash = pwd_context.hash(new_password)
        db.commit()
        return True
    finally:
        if close:
            db.close()
