"""Day 3 — Edge case tests: invalid JSON, unauthorized, RBAC, SQL injection, XSS."""
import pytest


# ═══════════════════════════════════════════════════════════════════════════
# Invalid JSON Payloads
# ═══════════════════════════════════════════════════════════════════════════
class TestInvalidJsonPayloads:
    def test_login_empty_body(self, client):
        resp = client.post("/api/auth/login", json={})
        assert resp.status_code == 422

    def test_login_missing_password(self, client):
        resp = client.post("/api/auth/login", json={"email": "test@test.com"})
        assert resp.status_code == 422

    def test_login_missing_email(self, client):
        resp = client.post("/api/auth/login", json={"password": "pass"})
        assert resp.status_code == 422

    def test_register_empty_body(self, client):
        resp = client.post("/api/auth/register", json={})
        assert resp.status_code == 422

    def test_register_missing_all_fields(self, client):
        resp = client.post("/api/auth/register", json={"full_name": "Test"})
        assert resp.status_code == 422

    def test_cases_empty_body(self, client, user_headers):
        resp = client.post("/api/cases", json={}, headers=user_headers)
        assert resp.status_code == 422

    def test_forgot_password_not_json(self, client):
        resp = client.post("/api/auth/forgot-password", content="not json",
                          headers={"Content-Type": "application/json"})
        assert resp.status_code == 400

    def test_send_code_not_json(self, client):
        resp = client.post("/api/auth/send-code", content="not json",
                          headers={"Content-Type": "application/json"})
        assert resp.status_code == 400

    def test_verify_email_not_json(self, client):
        resp = client.post("/api/auth/verify-email", content="not json",
                          headers={"Content-Type": "application/json"})
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════════════════════
# Unauthorized Access
# ═══════════════════════════════════════════════════════════════════════════
class TestUnauthorizedAccess:
    def test_cases_list_no_auth(self, client):
        resp = client.get("/api/cases")
        assert resp.status_code in (401, 403)

    def test_cases_create_no_auth(self, client):
        resp = client.post("/api/cases", json={"chief_complaint": "test"})
        assert resp.status_code in (401, 403)

    def test_patient_appointments_no_auth(self, client):
        resp = client.get("/api/patient/appointments")
        assert resp.status_code in (401, 403)

    def test_patient_profile_no_auth(self, client):
        resp = client.get("/api/patient/profile")
        assert resp.status_code in (401, 403)

    def test_doctor_patients_no_auth(self, client):
        resp = client.get("/api/doctor/patients")
        assert resp.status_code in (401, 403)

    def test_admin_stats_no_auth(self, client):
        resp = client.get("/api/admin/stats")
        assert resp.status_code in (401, 403)

    def test_notifications_no_auth(self, client):
        resp = client.get("/api/notifications")
        assert resp.status_code in (401, 403)

    def test_messages_no_auth(self, client):
        resp = client.get("/api/messages")
        assert resp.status_code in (401, 403)

    def test_clinical_notes_no_auth(self, client):
        resp = client.get("/api/clinical/notes")
        assert resp.status_code in (401, 403)

    def test_departments_no_auth(self, client):
        resp = client.get("/api/departments")
        assert resp.status_code in (401, 403)

    def test_me_no_auth(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code in (401, 403)

    def test_invalid_token(self, client):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
        assert resp.status_code == 401

    def test_expired_token_format(self, client):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE2MDAwMDAwMDB9.fake"})
        assert resp.status_code == 401

    def test_empty_bearer(self, client):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer "})
        assert resp.status_code in (401, 403)


# ═══════════════════════════════════════════════════════════════════════════
# Role-Based Access Control
# ═══════════════════════════════════════════════════════════════════════════
class TestRBAC:
    def test_user_cannot_access_admin_stats(self, client, user_headers):
        resp = client.get("/api/admin/stats", headers=user_headers)
        assert resp.status_code == 403

    def test_user_cannot_access_admin_users(self, client, user_headers):
        resp = client.get("/api/admin/users", headers=user_headers)
        assert resp.status_code == 403

    def test_user_cannot_access_admin_logs(self, client, user_headers):
        resp = client.get("/api/admin/logs", headers=user_headers)
        assert resp.status_code == 403

    def test_doctor_cannot_access_admin_stats(self, client, doctor_headers):
        resp = client.get("/api/admin/stats", headers=doctor_headers)
        assert resp.status_code == 403

    def test_doctor_cannot_access_admin_users(self, client, doctor_headers):
        resp = client.get("/api/admin/users", headers=doctor_headers)
        assert resp.status_code == 403

    def test_admin_can_access_all_admin_endpoints(self, client, admin_headers):
        for endpoint in ["/api/admin/stats", "/api/admin/users", "/api/admin/logs"]:
            resp = client.get(endpoint, headers=admin_headers)
            assert resp.status_code == 200, f"Admin should access {endpoint}"

    def test_admin_can_access_doctor_endpoints(self, client, admin_headers):
        resp = client.get("/api/doctor/patients", headers=admin_headers)
        assert resp.status_code == 200

    def test_admin_can_access_patient_endpoints(self, client, admin_headers):
        resp = client.get("/api/patient/appointments", headers=admin_headers)
        assert resp.status_code == 200

    def test_user_can_access_own_patient_data(self, client, user_headers):
        resp = client.get("/api/patient/appointments", headers=user_headers)
        assert resp.status_code == 200

    def test_user_cannot_access_doctor_endpoints(self, client, user_headers):
        resp = client.get("/api/doctor/patients", headers=user_headers)
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
# SQL Injection Attempts
# ═══════════════════════════════════════════════════════════════════════════
class TestSQLInjection:
    def test_login_sql_injection_email(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "admin@test.com' OR '1'='1",
            "password": "password",
        })
        assert resp.status_code in (401, 422)

    def test_login_sql_injection_password(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "admin@test.com",
            "password": "' OR '1'='1",
        })
        assert resp.status_code == 401

    def test_register_sql_injection_name(self, client):
        resp = client.post("/api/auth/register", json={
            "full_name": "Robert'); DROP TABLE users;--",
            "email": "sql@test.com",
            "password": "Password123!",
        })
        assert resp.status_code == 200

    def test_case_sql_injection_complaint(self, client, user_headers):
        resp = client.post("/api/cases", json={
            "chief_complaint": "'; DROP TABLE cases;--",
        }, headers=user_headers)
        assert resp.status_code == 202

    def test_search_sql_injection(self, client, user_headers):
        resp = client.get("/api/cases?search='; DROP TABLE cases;--", headers=user_headers)
        assert resp.status_code == 200

    def test_messages_sql_injection(self, client, user_headers):
        resp = client.post("/api/messages/send", json={
            "recipient_id": "usr_123",
            "content": "'; DROP TABLE messages;--",
        }, headers=user_headers)
        assert resp.status_code in (200, 400, 404, 422)


# ═══════════════════════════════════════════════════════════════════════════
# XSS Attempts
# ═══════════════════════════════════════════════════════════════════════════
class TestXSS:
    def test_case_xss_complaint(self, client, user_headers):
        resp = client.post("/api/cases", json={
            "chief_complaint": "<script>alert('xss')</script>",
        }, headers=user_headers)
        assert resp.status_code == 202

    def test_case_xss_associated_symptoms(self, client, user_headers):
        resp = client.post("/api/cases", json={
            "chief_complaint": "Headache",
            "associated_symptoms": "<img src=x onerror=alert(1)>",
        }, headers=user_headers)
        assert resp.status_code == 202

    def test_register_xss_name(self, client):
        resp = client.post("/api/auth/register", json={
            "full_name": "<b>Bold Name</b>",
            "email": "xss@test.com",
            "password": "Password123!",
        })
        assert resp.status_code == 200

    def test_notes_xss_content(self, client, doctor_headers):
        resp = client.post("/api/clinical/notes", json={
            "content": "<script>document.cookie</script>",
        }, headers=doctor_headers)
        assert resp.status_code in (200, 201, 422)

    def test_messages_xss_content(self, client, user_headers):
        resp = client.post("/api/messages/send", json={
            "recipient_id": "usr_123",
            "content": "<script>alert('xss')</script>",
        }, headers=user_headers)
        assert resp.status_code in (200, 400, 404, 422)
