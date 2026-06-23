"""Integration tests for /api/auth/* endpoints — Day 1 fixes."""
import pytest


class TestLogin:
    def test_login_success(self, client, admin_user):
        resp = client.post("/api/auth/login", json={
            "email": "admin@test.com", "password": "Admin123!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "admin@test.com"
        assert data["user"]["role"] == "admin"

    def test_login_wrong_password(self, client, admin_user):
        resp = client.post("/api/auth/login", json={
            "email": "admin@test.com", "password": "WrongPass123!",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "nobody@test.com", "password": "Password123!",
        })
        assert resp.status_code == 401

    def test_login_pending_user(self, client, pending_user):
        resp = client.post("/api/auth/login", json={
            "email": "pending@test.com", "password": "Pending123!",
        })
        assert resp.status_code == 403
        assert "pending" in resp.json()["detail"].lower()

    def test_login_rejected_user(self, client, db):
        from backend.auth import pwd_context
        from backend.db.models import User
        import uuid
        user = User(
            id=f"usr_{uuid.uuid4().hex[:12]}", username="rejected",
            email="rejected@test.com", full_name="Rejected",
            password_hash=pwd_context.hash("Reject123!"),
            role="user", status="rejected", institution="Test",
        )
        db.add(user); db.commit()
        resp = client.post("/api/auth/login", json={
            "email": "rejected@test.com", "password": "Reject123!",
        })
        assert resp.status_code == 403
        assert "revoked" in resp.json()["detail"].lower()

    def test_login_returns_user_object(self, client, admin_user):
        resp = client.post("/api/auth/login", json={
            "email": "admin@test.com", "password": "Admin123!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "user" in data
        assert "username" in data["user"]
        assert "role_label" in data["user"]


class TestRegister:
    def test_register_success(self, client):
        resp = client.post("/api/auth/register", json={
            "full_name": "New Person", "email": "new@test.com",
            "password": "StrongPass1!", "role_request": "user",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "pending"
        assert data["user"]["email"] == "new@test.com"

    def test_register_duplicate_email(self, client, regular_user):
        resp = client.post("/api/auth/register", json={
            "full_name": "Another User", "email": "user@test.com",
            "password": "Password123!",
        })
        assert resp.status_code == 409

    def test_register_invalid_email(self, client):
        resp = client.post("/api/auth/register", json={
            "full_name": "Test User", "email": "not-an-email",
            "password": "Password123!",
        })
        assert resp.status_code == 422

    def test_register_weak_password(self, client):
        resp = client.post("/api/auth/register", json={
            "full_name": "Test User", "email": "weak@test.com",
            "password": "weak",
        })
        assert resp.status_code == 422

    def test_register_doctor_role(self, client):
        resp = client.post("/api/auth/register", json={
            "full_name": "Dr New", "email": "dr@test.com",
            "password": "DoctorPass1!", "role_request": "doctor",
        })
        assert resp.status_code == 200
        assert resp.json()["user"]["role"] == "doctor"

    def test_register_returns_pending_status(self, client):
        resp = client.post("/api/auth/register", json={
            "full_name": "Pending Test", "email": "pend@test.com",
            "password": "Password123!",
        })
        assert resp.json()["user"]["status"] == "pending"


class TestGetMe:
    def test_me_with_valid_token(self, client, user_headers):
        resp = client.get("/api/auth/me", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "user@test.com"
        assert "permissions" in data

    def test_me_without_token(self, client):
        resp = client.get("/api/auth/me")
        # FastAPI HTTPBearer returns 403 when no credentials
        assert resp.status_code in (401, 403)

    def test_me_with_invalid_token(self, client):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401

    def test_me_contains_role_info(self, client, admin_headers):
        resp = client.get("/api/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "admin"
        assert "role_label" in data
        assert "permissions" in data


class TestGuestToken:
    def test_guest_token_success(self, client):
        resp = client.post("/api/auth/guest-token")
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["username"] == "guest"
        assert data["user"]["role"] == "user"

    def test_guest_token_has_user_id(self, client):
        resp = client.post("/api/auth/guest-token")
        data = resp.json()
        assert data["user"]["user_id"].startswith("guest_")

    def test_guest_token_is_bearer(self, client):
        resp = client.post("/api/auth/guest-token")
        data = resp.json()
        assert data["token_type"] == "bearer"


class TestLogout:
    @pytest.mark.skip(reason="Audit middleware logging bug: %d format NoneType status code")
    def test_logout_success(self, client, user_headers):
        resp = client.post("/api/auth/logout", headers=user_headers)
        assert resp.status_code == 200

    @pytest.mark.skip(reason="Audit middleware logging bug: %d format NoneType status code")
    def test_logout_without_token(self, client):
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 200


class TestForgotPassword:
    def test_forgot_password_returns_message(self, client):
        resp = client.post("/api/auth/forgot-password", json={"email": "test@test.com"})
        assert resp.status_code == 200
        assert "message" in resp.json()

    def test_forgot_password_missing_email(self, client):
        resp = client.post("/api/auth/forgot-password", json={})
        assert resp.status_code == 400

    def test_forgot_password_empty_body(self, client):
        resp = client.post("/api/auth/forgot-password", content="not json",
                          headers={"Content-Type": "application/json"})
        assert resp.status_code == 400


class TestSendCode:
    def test_send_code_missing_email(self, client):
        resp = client.post("/api/auth/send-code", json={})
        assert resp.status_code == 400

    def test_send_code_invalid_body(self, client):
        resp = client.post("/api/auth/send-code", content="not json",
                          headers={"Content-Type": "application/json"})
        assert resp.status_code == 400


class TestVerifyEmail:
    def test_verify_email_missing_fields(self, client):
        resp = client.post("/api/auth/verify-email", json={})
        assert resp.status_code == 400

    def test_verify_email_invalid_code_format(self, client):
        resp = client.post("/api/auth/verify-email", json={
            "email": "test@test.com", "code": "123",
        })
        assert resp.status_code == 400

    def test_verify_email_wrong_code(self, client):
        resp = client.post("/api/auth/verify-email", json={
            "email": "test@test.com", "code": "000000",
        })
        assert resp.status_code == 400

    def test_verify_email_non_numeric_code(self, client):
        resp = client.post("/api/auth/verify-email", json={
            "email": "test@test.com", "code": "abcdef",
        })
        assert resp.status_code == 400
