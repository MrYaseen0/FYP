"""
Integration tests for password reset API endpoints.
"""
import pytest
from backend.db import models, models_extended  # noqa: F401 - register tables with Base


class TestForgotPassword:
    def test_forgot_password_success(self, client, db):
        from backend.db.models import User
        from backend.auth import pwd_context
        import uuid
        user = User(
            id=f"usr_{uuid.uuid4().hex[:12]}",
            username="fpuser",
            email="fp@test.com",
            full_name="FP User",
            password_hash=pwd_context.hash("Pass12345!"),
            role="user",
            institution="Test",
            status="approved",
            avatar="FP",
        )
        db.add(user)
        db.commit()

        resp = client.post("/api/auth/forgot-password", json={"email": "fp@test.com"})
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data
        assert "reset link" in data["message"].lower() or "sent" in data["message"].lower()

    def test_forgot_password_nonexistent_email(self, client):
        # Should return same success message to prevent email enumeration
        resp = client.post("/api/auth/forgot-password", json={"email": "noone@test.com"})
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data

    def test_forgot_password_missing_email(self, client):
        resp = client.post("/api/auth/forgot-password", json={})
        assert resp.status_code == 400

    def test_forgot_password_empty_email(self, client):
        resp = client.post("/api/auth/forgot-password", json={"email": ""})
        assert resp.status_code == 400


class TestResetPassword:
    def test_reset_password_success(self, client, db):
        from backend.auth import create_reset_token
        token = create_reset_token("rp@test.com")
        resp = client.post("/api/auth/reset-password", json={
            "token": token,
            "new_password": "BrandNew123!",
        })
        assert resp.status_code == 200
        assert "success" in resp.json()["message"].lower()

    def test_reset_password_invalid_token(self, client):
        resp = client.post("/api/auth/reset-password", json={
            "token": "invalid.token.here",
            "new_password": "BrandNew123!",
        })
        assert resp.status_code == 400

    def test_reset_password_missing_token(self, client):
        resp = client.post("/api/auth/reset-password", json={
            "new_password": "BrandNew123!",
        })
        assert resp.status_code == 400

    def test_reset_password_weak_password(self, client):
        from backend.auth import create_reset_token
        token = create_reset_token("rp2@test.com")
        resp = client.post("/api/auth/reset-password", json={
            "token": token,
            "new_password": "weak",
        })
        assert resp.status_code == 400

    def test_reset_password_no_uppercase(self, client):
        from backend.auth import create_reset_token
        token = create_reset_token("rp3@test.com")
        resp = client.post("/api/auth/reset-password", json={
            "token": token,
            "new_password": "nouppercase123!",
        })
        assert resp.status_code == 400

    def test_reset_password_no_special_char(self, client):
        from backend.auth import create_reset_token
        token = create_reset_token("rp4@test.com")
        resp = client.post("/api/auth/reset-password", json={
            "token": token,
            "new_password": "NoSpecialChar123",
        })
        assert resp.status_code == 400

    def test_reset_password_missing_new_password(self, client):
        from backend.auth import create_reset_token
        token = create_reset_token("rp5@test.com")
        resp = client.post("/api/auth/reset-password", json={
            "token": token,
        })
        assert resp.status_code == 400

    def test_forgot_then_reset_flow(self, client, db):
        from backend.db.models import User
        from backend.auth import pwd_context
        import uuid

        # Create user
        user = User(
            id=f"usr_{uuid.uuid4().hex[:12]}",
            username="flowuser",
            email="flow@test.com",
            full_name="Flow User",
            password_hash=pwd_context.hash("OldPassword123!"),
            role="user",
            institution="Test",
            status="approved",
            avatar="FU",
        )
        db.add(user)
        db.commit()

        # Step 1: Request reset
        resp = client.post("/api/auth/forgot-password", json={"email": "flow@test.com"})
        assert resp.status_code == 200

        # Step 2: Reset with token (we generate it directly for the test)
        from backend.auth import create_reset_token
        token = create_reset_token("flow@test.com")
        resp = client.post("/api/auth/reset-password", json={
            "token": token,
            "new_password": "NewSecure123!",
        })
        assert resp.status_code == 200

        # Step 3: Verify old password no longer works
        resp = client.post("/api/auth/login", json={
            "email": "flow@test.com",
            "password": "OldPassword123!",
        })
        assert resp.status_code == 401

        # Step 4: Verify new password works
        resp = client.post("/api/auth/login", json={
            "email": "flow@test.com",
            "password": "NewSecure123!",
        })
        assert resp.status_code == 200
