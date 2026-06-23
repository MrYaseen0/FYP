"""Unit tests for backend.auth module — JWT, password hashing, token validation, RBAC."""
import os
import sys
import uuid
import pytest
from datetime import timedelta, datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault("SECRET_KEY", "test-unit-secret-key-2026")
os.environ.setdefault("ADMIN_PASSWORD", "TestAdmin123!")

from backend.auth import (
    pwd_context, create_access_token, decode_token, ROLES, ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES, GUEST_TOKEN_EXPIRE_MINUTES,
    authenticate_user, register_user, get_user_by_email, get_user_by_username,
    approve_user, reject_user, get_pending_users, get_all_users,
    RegisterRequest, TokenData,
)
from backend.db.models import User


# ── Password Hashing Tests ────────────────────────────────────────────────
class TestPasswordHashing:
    def test_hash_password(self):
        hashed = pwd_context.hash("MyPassword123!")
        assert hashed != "MyPassword123!"
        assert hashed.startswith("$2")

    def test_verify_correct_password(self):
        hashed = pwd_context.hash("CorrectPassword1!")
        assert pwd_context.verify("CorrectPassword1!", hashed) is True

    def test_verify_wrong_password(self):
        hashed = pwd_context.hash("CorrectPassword1!")
        assert pwd_context.verify("WrongPassword1!", hashed) is False

    def test_hash_is_deterministic_but_unique(self):
        h1 = pwd_context.hash("same_password")
        h2 = pwd_context.hash("same_password")
        assert h1 != h2  # bcrypt uses random salt

    def test_hash_empty_string(self):
        hashed = pwd_context.hash("")
        assert pwd_context.verify("", hashed) is True


# ── JWT Token Tests ───────────────────────────────────────────────────────
class TestJWT:
    def test_create_and_decode_token(self):
        data = {"sub": "usr_abc123", "username": "testuser", "role": "user"}
        token = create_access_token(data)
        decoded = decode_token(token)
        assert decoded is not None
        assert decoded.user_id == "usr_abc123"
        assert decoded.username == "testuser"
        assert decoded.role == "user"

    def test_create_token_with_custom_expiry(self):
        data = {"sub": "usr_test", "username": "tester", "role": "doctor"}
        token = create_access_token(data, expires_delta=timedelta(minutes=5))
        decoded = decode_token(token)
        assert decoded is not None
        assert decoded.role == "doctor"

    def test_decode_invalid_token(self):
        result = decode_token("invalid.token.here")
        assert result is None

    def test_decode_empty_token(self):
        result = decode_token("")
        assert result is None

    def test_decode_tampered_token(self):
        data = {"sub": "usr_abc", "username": "user", "role": "user"}
        token = create_access_token(data)
        tampered = token[:-5] + "XXXXX"
        result = decode_token(tampered)
        assert result is None

    def test_token_contains_role_level(self):
        data = {"sub": "usr_1", "username": "admin", "role": "admin"}
        token = create_access_token(data)
        decoded = decode_token(token)
        assert decoded.role_level == 100

    def test_token_defaults_to_user_role_level(self):
        data = {"sub": "usr_1", "username": "user", "role": "unknown_role"}
        token = create_access_token(data)
        decoded = decode_token(token)
        assert decoded.role_level == 10  # defaults to user level

    def test_guest_token_short_expiry(self):
        data = {"sub": "guest_abc", "username": "guest", "role": "user"}
        token = create_access_token(data, expires_delta=timedelta(minutes=15))
        decoded = decode_token(token)
        assert decoded is not None
        assert decoded.username == "guest"


# ── Role Definitions Tests ────────────────────────────────────────────────
class TestRoles:
    def test_all_roles_defined(self):
        assert "admin" in ROLES
        assert "doctor" in ROLES
        assert "user" in ROLES

    def test_admin_highest_level(self):
        assert ROLES["admin"]["level"] > ROLES["doctor"]["level"]
        assert ROLES["doctor"]["level"] > ROLES["user"]["level"]

    def test_admin_has_all_permissions(self):
        admin_perms = ROLES["admin"]["permissions"]
        assert "admin.read" in admin_perms
        assert "admin.write" in admin_perms
        assert "admin.users" in admin_perms

    def test_user_limited_permissions(self):
        user_perms = ROLES["user"]["permissions"]
        assert "admin.read" not in user_perms
        assert "admin.write" not in user_perms
        assert "cases.read" in user_perms

    def test_doctor_has_pipeline_write(self):
        assert "pipeline.write" in ROLES["doctor"]["permissions"]


# ── User Registration Tests ──────────────────────────────────────────────
class TestRegistration:
    def test_register_new_user(self, db):
        req = RegisterRequest(
            full_name="John Doe",
            email="john@test.com",
            password="SecurePass1!",
            role_request="user",
        )
        user = register_user(req, db=db)
        assert user["email"] == "john@test.com"
        assert user["status"] == "pending"
        assert user["role"] == "user"
        assert user["avatar"] == "JD"

    def test_register_doctor(self, db):
        req = RegisterRequest(
            full_name="Dr Smith",
            email="smith@hospital.com",
            password="DoctorPass1!",
            role_request="doctor",
        )
        user = register_user(req, db=db)
        assert user["role"] == "doctor"

    def test_register_duplicate_email_fails(self, db):
        req = RegisterRequest(
            full_name="First User",
            email="dup@test.com",
            password="Password123!",
        )
        register_user(req, db=db)
        req2 = RegisterRequest(
            full_name="Second User",
            email="dup@test.com",
            password="Password456!",
        )
        with pytest.raises(ValueError, match="already exists"):
            register_user(req2, db=db)

    def test_register_generates_unique_username(self, db):
        req1 = RegisterRequest(full_name="User One", email="user@test.com", password="Password123!")
        register_user(req1, db=db)
        req2 = RegisterRequest(full_name="User Two", email="user@test.com", password="Password456!")
        # Same email should raise
        with pytest.raises(ValueError):
            register_user(req2, db=db)

    def test_register_sets_pending_status(self, db):
        req = RegisterRequest(
            full_name="New User",
            email="new@test.com",
            password="Password123!",
        )
        user = register_user(req, db=db)
        assert user["status"] == "pending"

    def test_register_invalid_email_rejected(self):
        with pytest.raises(Exception):
            RegisterRequest(full_name="Test", email="not-an-email", password="Password123!")

    def test_register_short_name_rejected(self):
        with pytest.raises(Exception):
            RegisterRequest(full_name="A", email="test@test.com", password="Password123!")

    def test_register_weak_password_rejected(self):
        with pytest.raises(Exception):
            RegisterRequest(full_name="Test User", email="test@test.com", password="weak")

    def test_register_invalid_role_rejected(self):
        with pytest.raises(Exception):
            RegisterRequest(full_name="Test User", email="test@test.com", password="Password123!", role_request="admin")


# ── Password Validation Tests ────────────────────────────────────────────
class TestPasswordValidation:
    def test_valid_password_accepted(self):
        req = RegisterRequest(full_name="Test User", email="t@t.com", password="StrongPass1!")
        assert req.password == "StrongPass1!"

    def test_password_too_short(self):
        with pytest.raises(Exception):
            RegisterRequest(full_name="Test User", email="t@t.com", password="Ab1!")

    def test_password_no_uppercase(self):
        with pytest.raises(Exception):
            RegisterRequest(full_name="Test User", email="t@t.com", password="alllowercase1!")

    def test_password_no_lowercase(self):
        with pytest.raises(Exception):
            RegisterRequest(full_name="Test User", email="t@t.com", password="ALLUPPERCASE1!")

    def test_password_no_digit(self):
        with pytest.raises(Exception):
            RegisterRequest(full_name="Test User", email="t@t.com", password="NoDigitHere!")

    def test_password_no_special_char(self):
        with pytest.raises(Exception):
            RegisterRequest(full_name="Test User", email="t@t.com", password="NoSpecialChar1")


# ── Authentication Tests ─────────────────────────────────────────────────
class TestAuthentication:
    def test_authenticate_valid_user(self, db, regular_user):
        result = authenticate_user("user@test.com", "User12345!", db=db)
        assert result is not None
        assert result["email"] == "user@test.com"

    def test_authenticate_wrong_password(self, db, regular_user):
        result = authenticate_user("user@test.com", "WrongPassword1!", db=db)
        assert result is None

    def test_authenticate_nonexistent_user(self, db):
        result = authenticate_user("nobody@test.com", "Password123!", db=db)
        assert result is None

    def test_authenticate_pending_user_fails(self, db, pending_user):
        result = authenticate_user("pending@test.com", "Pending123!", db=db)
        assert result is None

    def test_get_user_by_email(self, db, regular_user):
        result = get_user_by_email("user@test.com", db=db)
        assert result is not None
        assert result["email"] == "user@test.com"

    def test_get_user_by_email_case_insensitive(self, db, regular_user):
        result = get_user_by_email("USER@TEST.COM", db=db)
        assert result is not None

    def test_get_user_by_email_not_found(self, db):
        result = get_user_by_email("missing@test.com", db=db)
        assert result is None

    def test_get_user_by_username(self, db, regular_user):
        result = get_user_by_username("testuser", db=db)
        assert result is not None

    def test_get_user_by_username_not_found(self, db):
        result = get_user_by_username("nobody", db=db)
        assert result is None


# ── User Approval Tests ──────────────────────────────────────────────────
class TestUserApproval:
    def test_approve_pending_user(self, db, pending_user):
        result = approve_user("pendinguser", db=db)
        assert result["status"] == "approved"

    def test_approve_already_approved_fails(self, db, regular_user):
        with pytest.raises(ValueError, match="already approved"):
            approve_user("testuser", db=db)

    def test_approve_nonexistent_user_fails(self, db):
        with pytest.raises(ValueError, match="not found"):
            approve_user("ghost", db=db)

    def test_reject_user(self, db, regular_user):
        result = reject_user("testuser", db=db)
        assert result["status"] == "rejected"

    def test_reject_nonexistent_user_fails(self, db):
        with pytest.raises(ValueError, match="not found"):
            reject_user("ghost", db=db)

    def test_get_pending_users(self, db, pending_user, regular_user):
        pending = get_pending_users(db=db)
        assert len(pending) >= 1
        assert any(u["email"] == "pending@test.com" for u in pending)

    def test_get_all_users(self, db, regular_user, doctor_user):
        users = get_all_users(db=db)
        assert len(users) >= 2
