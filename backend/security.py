"""
Healtheon — Security Utilities
Rate limiter, httpOnly cookie helpers, refresh token management.
"""
import time
import secrets
import threading
from datetime import datetime, timedelta, timezone
from typing import Optional
from collections import defaultdict

from fastapi import Request, Response, HTTPException, status
from sqlalchemy.orm import Session

from backend.config import settings


# ── Rate Limiter ─────────────────────────────────────────────────────────────
# In-memory sliding window rate limiter. No external dependencies.
# Thread-safe via threading.Lock.

class RateLimiter:
    """
    Per-key (typically per-IP) sliding window rate limiter.
    Usage:
        limiter = RateLimiter()
        limiter.check("login", ip, max_attempts=5, window_seconds=900)
    """

    def __init__(self):
        self._store: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()
        # Background cleanup every 5 minutes
        self._cleanup_interval = 300
        self._last_cleanup = time.time()

    def _cleanup(self):
        now = time.time()
        if now - self._last_cleanup < self._cleanup_interval:
            return
        self._last_cleanup = now
        cutoff = now - 3600  # 1 hour
        with self._lock:
            for key in list(self._store.keys()):
                self._store[key] = [t for t in self._store[key] if t > cutoff]
                if not self._store[key]:
                    del self._store[key]

    def check(self, endpoint: str, key: str, max_attempts: int, window_seconds: int) -> None:
        """
        Raises HTTP 429 if rate limit exceeded.
        `endpoint` is a namespace (e.g. "login").
        `key` is the identifier (e.g. client IP).
        """
        self._cleanup()
        composite = f"{endpoint}:{key}"
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            timestamps = self._store[composite]
            # Remove old entries
            self._store[composite] = [t for t in timestamps if t > window_start]
            if len(self._store[composite]) >= max_attempts:
                oldest = self._store[composite][0]
                retry_after = int(window_seconds - (now - oldest)) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                    headers={"Retry-After": str(retry_after)},
                )
            self._store[composite].append(now)


# Global singleton
rate_limiter = RateLimiter()


def get_client_ip(request: Request) -> str:
    """Extract client IP, respecting X-Forwarded-For for reverse proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── HttpOnly Cookie Helpers ──────────────────────────────────────────────────
# JWT is stored in an httpOnly cookie for guest users.
# This prevents JavaScript (XSS) from accessing the token.
# Registered users continue to use Bearer header (Phase 3 migrates fully).

ACCESS_COOKIE_NAME = "ht_access_token"
REFRESH_COOKIE_NAME = "ht_refresh_token"
COOKIE_DOMAIN = None  # Let browser default to current domain


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    access_max_age: int = 15 * 60,       # 15 minutes
    refresh_max_age: int = 7 * 24 * 3600, # 7 days
) -> None:
    """Set httpOnly, Secure, SameSite=Lax cookies for auth tokens."""
    # Access token cookie
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        max_age=access_max_age,
        httponly=True,
        secure=False,       # Set True in production with HTTPS
        samesite="lax",
        domain=COOKIE_DOMAIN,
        path="/",
    )
    # Refresh token cookie (longer-lived)
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=refresh_max_age,
        httponly=True,
        secure=False,       # Set True in production with HTTPS
        samesite="lax",
        domain=COOKIE_DOMAIN,
        path="/api/auth",   # Only sent to auth endpoints
    )


def clear_auth_cookies(response: Response) -> None:
    """Remove auth cookies."""
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/api/auth")


def get_token_from_cookie(request: Request) -> Optional[str]:
    """Extract access token from httpOnly cookie."""
    return request.cookies.get(ACCESS_COOKIE_NAME)


def get_refresh_from_cookie(request: Request) -> Optional[str]:
    """Extract refresh token from httpOnly cookie."""
    return request.cookies.get(REFRESH_COOKIE_NAME)


# ── Refresh Token Management ────────────────────────────────────────────────

def create_refresh_token(user_id: str, db: Session) -> str:
    """Create a new refresh token, store in DB, return the raw token."""
    from backend.db.models import RefreshToken

    token = secrets.token_urlsafe(64)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    db_token = RefreshToken(
        token=token,
        user_id=user_id,
        expires_at=expires_at,
    )
    db.add(db_token)
    db.commit()
    return token


def rotate_refresh_token(old_token: str, db: Session) -> tuple[str, str]:
    """
    Validate old refresh token, rotate it (delete old, create new).
    Returns (user_id, new_refresh_token).
    Raises HTTPException if invalid/expired.
    """
    from backend.db.models import RefreshToken

    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == old_token
    ).first()

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if db_token.expires_at < datetime.now(timezone.utc):
        # Clean up expired token
        db.delete(db_token)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    user_id = db_token.user_id

    # Delete the old token (one-time use)
    db.delete(db_token)
    db.commit()

    # Create a new refresh token
    new_token = create_refresh_token(user_id, db)

    return user_id, new_token


def revoke_all_user_tokens(user_id: str, db: Session) -> None:
    """Revoke all refresh tokens for a user (logout everywhere)."""
    from backend.db.models import RefreshToken
    db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete()
    db.commit()


def revoke_refresh_token(token: str, db: Session) -> None:
    """Revoke a single refresh token (logout from one device)."""
    from backend.db.models import RefreshToken
    db.query(RefreshToken).filter(RefreshToken.token == token).delete()
    db.commit()
