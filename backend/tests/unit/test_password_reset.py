"""
Tests for password reset flow: token generation, forgot-password, reset-password.
"""
import pytest
from backend.db import models, models_extended  # noqa: F401 - register tables with Base
from backend.auth import (
    create_reset_token, verify_reset_token, reset_user_password,
    pwd_context, get_user_by_email,
)


class TestResetToken:
    def test_create_and_verify_token(self):
        token = create_reset_token("test@example.com")
        assert token is not None
        assert isinstance(token, str)
        email = verify_reset_token(token)
        assert email == "test@example.com"

    def test_verify_returns_none_for_invalid_token(self):
        result = verify_reset_token("invalid.token.here")
        assert result is None

    def test_verify_returns_none_for_empty_token(self):
        result = verify_reset_token("")
        assert result is None

    def test_verify_returns_none_for_wrong_secret(self):
        import os
        from jose import jwt
        from datetime import datetime, timezone, timedelta
        # Create token with wrong secret
        token = jwt.encode(
            {"sub": "test@example.com", "type": "password_reset",
             "exp": datetime.now(timezone.utc) + timedelta(minutes=60)},
            "wrong_secret",
            algorithm="HS256",
        )
        result = verify_reset_token(token)
        assert result is None

    def test_verify_returns_none_for_non_reset_token(self):
        import os
        from jose import jwt
        from datetime import datetime, timezone, timedelta
        from backend.auth import RESET_TOKEN_SECRET
        # Create a token with wrong type
        token = jwt.encode(
            {"sub": "test@example.com", "type": "access_token",
             "exp": datetime.now(timezone.utc) + timedelta(minutes=60)},
            RESET_TOKEN_SECRET,
            algorithm="HS256",
        )
        result = verify_reset_token(token)
        assert result is None

    def test_verify_returns_none_for_expired_token(self):
        import os
        from jose import jwt
        from datetime import datetime, timezone, timedelta
        from backend.auth import RESET_TOKEN_SECRET
        # Create an expired token
        token = jwt.encode(
            {"sub": "test@example.com", "type": "password_reset",
             "exp": datetime.now(timezone.utc) - timedelta(minutes=10)},
            RESET_TOKEN_SECRET,
            algorithm="HS256",
        )
        result = verify_reset_token(token)
        assert result is None

    def test_token_lowercases_email(self):
        token = create_reset_token("Test@Example.COM")
        email = verify_reset_token(token)
        assert email == "test@example.com"


class TestResetUserPassword:
    def test_reset_password_success(self, db):
        # Create a test user first
        from backend.db.models import User
        import uuid
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        user = User(
            id=user_id,
            username="resetuser",
            email="reset@example.com",
            full_name="Reset User",
            password_hash=pwd_context.hash("OldPass123!"),
            role="user",
            institution="Test",
            status="approved",
            avatar="RU",
        )
        db.add(user)
        db.commit()

        # Reset the password
        success = reset_user_password("reset@example.com", "NewPass456!", db=db)
        assert success is True

        # Verify old password no longer works
        user_obj = db.query(User).filter(User.email == "reset@example.com").first()
        assert not pwd_context.verify("OldPass123!", user_obj.password_hash)
        # Verify new password works
        assert pwd_context.verify("NewPass456!", user_obj.password_hash)

    def test_reset_password_user_not_found(self, db):
        success = reset_user_password("nonexistent@example.com", "NewPass456!", db=db)
        assert success is False

    def test_reset_password_case_insensitive(self, db):
        from backend.db.models import User
        import uuid
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        user = User(
            id=user_id,
            username="caseuser",
            email="case@example.com",
            full_name="Case User",
            password_hash=pwd_context.hash("OldPass123!"),
            role="user",
            institution="Test",
            status="approved",
            avatar="CU",
        )
        db.add(user)
        db.commit()

        # Reset with different case
        success = reset_user_password("CASE@EXAMPLE.COM", "NewPass456!", db=db)
        assert success is True
