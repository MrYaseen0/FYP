"""
Tests for the Learning API endpoints (Socratic prediction/guess-first).
"""
import pytest
from backend.db.models import Case
from backend.db.models_extended import StudentPrediction


class TestPredictionEndpoint:
    """Tests for POST /api/learning/cases/{case_id}/predict"""

    def test_save_prediction(self, client, regular_user, user_headers):
        from backend.db.database import SessionLocal
        db = SessionLocal()
        case = db.query(Case).first()
        if not case:
            pytest.skip("No cases in test DB")
        case_id = case.id
        db.close()

        resp = client.post(
            f"/api/learning/cases/{case_id}/predict",
            json={
                "case_id": case_id,
                "step_number": 1,
                "student_diagnosis": "Acute Coronary Syndrome",
                "student_urgency": "HIGH",
            },
            headers=user_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "unlocked"
        assert data["step_number"] == 1

    def test_prediction_upsert(self, client, regular_user, user_headers):
        """Updating same case+user+step should upsert, not duplicate."""
        from backend.db.database import SessionLocal
        db = SessionLocal()
        case = db.query(Case).first()
        if not case:
            pytest.skip("No cases in test DB")
        case_id = case.id
        db.close()

        # First prediction
        client.post(
            f"/api/learning/cases/{case_id}/predict",
            json={
                "case_id": case_id,
                "step_number": 1,
                "student_diagnosis": "Migraine",
                "student_urgency": "MODERATE",
            },
            headers=user_headers,
        )
        # Second prediction (update)
        client.post(
            f"/api/learning/cases/{case_id}/predict",
            json={
                "case_id": case_id,
                "step_number": 1,
                "student_diagnosis": "SAH",
                "student_urgency": "CRITICAL",
            },
            headers=user_headers,
        )

        db = SessionLocal()
        preds = db.query(StudentPrediction).filter(
            StudentPrediction.case_id == case_id,
        ).all()
        assert len(preds) == 1
        assert preds[0].student_diagnosis == "SAH"
        assert preds[0].student_urgency == "CRITICAL"
        db.close()

    def test_prediction_multi_step(self, client, regular_user, user_headers):
        """Different steps should create separate predictions."""
        from backend.db.database import SessionLocal
        db = SessionLocal()
        case = db.query(Case).first()
        if not case:
            pytest.skip("No cases in test DB")
        case_id = case.id
        db.close()

        for step in [1, 2, 3]:
            resp = client.post(
                f"/api/learning/cases/{case_id}/predict",
                json={
                    "case_id": case_id,
                    "step_number": step,
                    "student_diagnosis": f"Diagnosis step {step}",
                    "student_urgency": "MODERATE",
                },
                headers=user_headers,
            )
            assert resp.status_code == 200

        db = SessionLocal()
        preds = db.query(StudentPrediction).filter(
            StudentPrediction.case_id == case_id,
        ).order_by(StudentPrediction.step_number).all()
        assert len(preds) == 3
        assert [p.step_number for p in preds] == [1, 2, 3]
        db.close()

    def test_prediction_invalid_case(self, client, regular_user, user_headers):
        resp = client.post(
            "/api/learning/cases/nonexistent/predict",
            json={
                "case_id": "nonexistent",
                "step_number": 1,
                "student_diagnosis": "Test",
                "student_urgency": "LOW",
            },
            headers=user_headers,
        )
        assert resp.status_code == 404

    def test_prediction_no_auth(self, client):
        resp = client.post(
            "/api/learning/cases/fake/predict",
            json={
                "case_id": "fake",
                "step_number": 1,
                "student_diagnosis": "Test",
                "student_urgency": "LOW",
            },
        )
        assert resp.status_code in [401, 403]

    def test_prediction_empty_diagnosis_rejected(self, client, regular_user, user_headers):
        from backend.db.database import SessionLocal
        db = SessionLocal()
        case = db.query(Case).first()
        if not case:
            pytest.skip("No cases in test DB")
        case_id = case.id
        db.close()

        resp = client.post(
            f"/api/learning/cases/{case_id}/predict",
            json={
                "case_id": case_id,
                "step_number": 1,
                "student_diagnosis": "",
                "student_urgency": "LOW",
            },
            headers=user_headers,
        )
        assert resp.status_code == 422

    def test_prediction_invalid_urgency_rejected(self, client, regular_user, user_headers):
        from backend.db.database import SessionLocal
        db = SessionLocal()
        case = db.query(Case).first()
        if not case:
            pytest.skip("No cases in test DB")
        case_id = case.id
        db.close()

        resp = client.post(
            f"/api/learning/cases/{case_id}/predict",
            json={
                "case_id": case_id,
                "step_number": 1,
                "student_diagnosis": "Test",
                "student_urgency": "INVALID",
            },
            headers=user_headers,
        )
        assert resp.status_code == 422


class TestGetPredictions:
    """Tests for GET /api/learning/cases/{case_id}/predictions"""

    def test_get_predictions(self, client, regular_user, user_headers):
        from backend.db.database import SessionLocal
        db = SessionLocal()
        case = db.query(Case).first()
        if not case:
            pytest.skip("No cases in test DB")
        case_id = case.id
        db.close()

        # Create a prediction first
        client.post(
            f"/api/learning/cases/{case_id}/predict",
            json={
                "case_id": case_id,
                "step_number": 1,
                "student_diagnosis": "ACS",
                "student_urgency": "HIGH",
            },
            headers=user_headers,
        )

        resp = client.get(
            f"/api/learning/cases/{case_id}/predictions",
            headers=user_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "predictions" in data
        assert len(data["predictions"]) >= 1
        assert data["predictions"][0]["step_number"] == 1

    def test_get_predictions_empty(self, client, regular_user, user_headers):
        from backend.db.database import SessionLocal
        db = SessionLocal()
        case = db.query(Case).first()
        if not case:
            pytest.skip("No cases in test DB")
        case_id = case.id
        db.close()

        resp = client.get(
            f"/api/learning/cases/{case_id}/predictions",
            headers=user_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["predictions"] == []
