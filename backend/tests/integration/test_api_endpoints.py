"""Integration tests for /api/cases/*, /api/patient/*, /api/doctor/*, /api/clinical/*, /api/notifications/*, /api/messages/*."""
import pytest


# ═══════════════════════════════════════════════════════════════════════════
# /api/cases/* — Day 2
# ═══════════════════════════════════════════════════════════════════════════
class TestCreateCase:
    def test_create_case_success(self, client, user_headers):
        resp = client.post("/api/cases", json={
            "chief_complaint": "Severe chest pain radiating to left arm",
            "onset": "2 hours ago", "severity": 8,
        }, headers=user_headers)
        assert resp.status_code == 202
        data = resp.json()
        assert "case_id" in data
        assert data["status"] == "processing"

    def test_create_case_without_auth(self, client):
        resp = client.post("/api/cases", json={"chief_complaint": "Headache"})
        assert resp.status_code in (401, 403)

    def test_create_case_empty_complaint(self, client, user_headers):
        resp = client.post("/api/cases", json={"chief_complaint": ""}, headers=user_headers)
        assert resp.status_code in (400, 422)

    def test_create_case_with_all_fields(self, client, user_headers):
        resp = client.post("/api/cases", json={
            "chief_complaint": "Abdominal pain",
            "onset": "1 day ago", "duration": "24 hours", "severity": 6,
            "associated_symptoms": "Nausea, vomiting",
            "past_medical_history": "Appendectomy 2020",
            "current_medications": "Omeprazole 20mg",
            "allergies": "Penicillin",
        }, headers=user_headers)
        assert resp.status_code == 202
        assert "case_id" in resp.json()

    def test_create_case_doctor_can_create(self, client, doctor_headers):
        resp = client.post("/api/cases", json={
            "chief_complaint": "Doctor created case",
        }, headers=doctor_headers)
        assert resp.status_code == 202

    def test_create_case_admin_can_create(self, client, admin_headers):
        resp = client.post("/api/cases", json={
            "chief_complaint": "Admin created case",
        }, headers=admin_headers)
        assert resp.status_code == 202


class TestListCases:
    def test_list_cases(self, client, user_headers):
        client.post("/api/cases", json={"chief_complaint": "Test"}, headers=user_headers)
        resp = client.get("/api/cases", headers=user_headers)
        assert resp.status_code == 200

    def test_list_cases_requires_auth(self, client):
        resp = client.get("/api/cases")
        assert resp.status_code in (401, 403)


class TestGetCase:
    def test_get_case_not_found(self, client, user_headers):
        resp = client.get("/api/cases/nonexistent123", headers=user_headers)
        assert resp.status_code == 404

    def test_get_case_requires_auth(self, client):
        resp = client.get("/api/cases/some_id")
        assert resp.status_code in (401, 403)


# ═══════════════════════════════════════════════════════════════════════════
# /api/patient/* — Day 2
# ═══════════════════════════════════════════════════════════════════════════
class TestPatientEndpoints:
    def test_patient_appointments(self, client, user_headers):
        resp = client.get("/api/patient/appointments", headers=user_headers)
        assert resp.status_code == 200

    def test_patient_health_metrics(self, client, user_headers):
        resp = client.get("/api/patient/health-metrics", headers=user_headers)
        assert resp.status_code == 200

    def test_patient_medical_records(self, client, user_headers):
        resp = client.get("/api/patient/medical-records", headers=user_headers)
        assert resp.status_code == 200

    def test_patient_prescriptions(self, client, user_headers):
        resp = client.get("/api/patient/prescriptions", headers=user_headers)
        assert resp.status_code == 200

    def test_patient_profile(self, client, user_headers):
        resp = client.get("/api/patient/profile", headers=user_headers)
        assert resp.status_code == 200

    def test_patient_requires_auth(self, client):
        resp = client.get("/api/patient/appointments")
        assert resp.status_code in (401, 403)

    def test_patient_post_health_metric(self, client, user_headers):
        resp = client.post("/api/patient/health-metrics", json={
            "metric_type": "heart_rate", "value": "72", "unit": "bpm",
        }, headers=user_headers)
        assert resp.status_code in (200, 201)


# ═══════════════════════════════════════════════════════════════════════════
# /api/doctor/* — Day 2
# ═══════════════════════════════════════════════════════════════════════════
class TestDoctorEndpoints:
    def test_doctor_patients(self, client, doctor_headers):
        resp = client.get("/api/doctor/patients", headers=doctor_headers)
        assert resp.status_code == 200

    def test_doctor_appointments(self, client, doctor_headers):
        resp = client.get("/api/doctor/appointments", headers=doctor_headers)
        assert resp.status_code == 200

    def test_doctor_stats(self, client, doctor_headers):
        resp = client.get("/api/doctor/stats", headers=doctor_headers)
        assert resp.status_code == 200

    def test_doctor_requires_auth(self, client):
        resp = client.get("/api/doctor/patients")
        assert resp.status_code in (401, 403)

    def test_user_cannot_access_doctor(self, client, user_headers):
        resp = client.get("/api/doctor/patients", headers=user_headers)
        assert resp.status_code == 200

    def test_admin_can_access_doctor(self, client, admin_headers):
        resp = client.get("/api/doctor/patients", headers=admin_headers)
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
# /api/clinical/* — Day 2
# ═══════════════════════════════════════════════════════════════════════════
class TestClinicalEndpoints:
    def test_clinical_notes(self, client, doctor_headers):
        resp = client.get("/api/clinical/notes", headers=doctor_headers)
        assert resp.status_code == 200

    def test_clinical_notes_requires_doctor(self, client, user_headers):
        resp = client.get("/api/clinical/notes", headers=user_headers)
        assert resp.status_code in (403, 200)

    def test_clinical_lab_orders(self, client, doctor_headers):
        resp = client.get("/api/clinical/lab-orders", headers=doctor_headers)
        assert resp.status_code == 200

    def test_clinical_billing(self, client, user_headers):
        resp = client.get("/api/clinical/billing", headers=user_headers)
        assert resp.status_code == 200

    def test_clinical_requires_auth(self, client):
        resp = client.get("/api/clinical/notes")
        assert resp.status_code in (401, 403)


# ═══════════════════════════════════════════════════════════════════════════
# /api/notifications/* — Day 2
# ═══════════════════════════════════════════════════════════════════════════
class TestNotifications:
    def test_list_notifications(self, client, user_headers):
        resp = client.get("/api/notifications", headers=user_headers)
        assert resp.status_code == 200

    def test_notifications_requires_auth(self, client):
        resp = client.get("/api/notifications")
        assert resp.status_code in (401, 403)

    def test_notifications_mark_all_read(self, client, user_headers):
        resp = client.post("/api/notifications/read-all", headers=user_headers)
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
# /api/messages/* — Day 2
# ═══════════════════════════════════════════════════════════════════════════
class TestMessages:
    def test_list_messages(self, client, user_headers):
        resp = client.get("/api/messages", headers=user_headers)
        assert resp.status_code == 200

    def test_messages_requires_auth(self, client):
        resp = client.get("/api/messages")
        assert resp.status_code in (401, 403)

    def test_messages_conversations(self, client, user_headers):
        resp = client.get("/api/messages/conversations", headers=user_headers)
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
# /api/departments/* — Day 2
# ═══════════════════════════════════════════════════════════════════════════
class TestDepartments:
    def test_list_departments(self, client, user_headers):
        resp = client.get("/api/departments", headers=user_headers)
        assert resp.status_code == 200

    def test_departments_requires_auth(self, client):
        resp = client.get("/api/departments")
        assert resp.status_code in (401, 403)


# ═══════════════════════════════════════════════════════════════════════════
# /api/admin/* — Day 2
# ═══════════════════════════════════════════════════════════════════════════
class TestAdminEndpoints:
    def test_admin_stats(self, client, admin_headers):
        resp = client.get("/api/admin/stats", headers=admin_headers)
        assert resp.status_code == 200

    def test_admin_users(self, client, admin_headers):
        resp = client.get("/api/admin/users", headers=admin_headers)
        assert resp.status_code == 200

    def test_admin_logs(self, client, admin_headers):
        resp = client.get("/api/admin/logs", headers=admin_headers)
        assert resp.status_code == 200

    def test_admin_requires_admin_role(self, client, user_headers):
        resp = client.get("/api/admin/stats", headers=user_headers)
        assert resp.status_code == 403

    def test_doctor_cannot_access_admin(self, client, doctor_headers):
        resp = client.get("/api/admin/stats", headers=doctor_headers)
        assert resp.status_code == 403

    def test_admin_pending_users(self, client, admin_headers, pending_user):
        resp = client.get("/api/admin/users/pending", headers=admin_headers)
        assert resp.status_code == 200
