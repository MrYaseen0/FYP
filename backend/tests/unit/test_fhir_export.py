"""
Tests for the FHIR R4 Export endpoint.
"""
import pytest
import json
from backend.db.models import Case, CaseSummary, InvestigationSuggestion, Message, CaseStatus


class TestFHIRBundleStructure:
    """Tests for the FHIR Bundle structure and content."""

    def _create_test_case(self, db):
        """Create a test case with summary and investigations."""
        from backend.db.models import InvestigationUrgency
        case = Case(
            id="test-fhir-case-001",
            chief_complaint="Severe crushing chest pain",
            onset="2 hours ago",
            duration="Ongoing",
            severity=9,
            associated_symptoms="Diaphoresis, nausea, left arm radiation",
            past_medical_history="Hypertension, Type 2 Diabetes",
            current_medications="Metformin 500mg, Lisinopril 10mg",
            allergies="Penicillin",
            status=CaseStatus.DONE,
        )
        db.add(case)

        summary = CaseSummary(
            case_id="test-fhir-case-001",
            summary_markdown="## Final Report\n\nAcute STEMI. ECG shows ST elevation.",
            latency_seconds=12.5,
            total_rounds=7,
        )
        db.add(summary)

        inv = InvestigationSuggestion(
            case_id="test-fhir-case-001",
            test_name="Troponin I",
            rationale="Elevated troponin confirms myocardial injury",
            urgency=InvestigationUrgency.STAT,
        )
        db.add(inv)

        inv2 = InvestigationSuggestion(
            case_id="test-fhir-case-001",
            test_name="ECG 12-lead",
            rationale="ST elevation pattern",
            urgency=InvestigationUrgency.STAT,
        )
        db.add(inv2)

        msg = Message(
            case_id="test-fhir-case-001",
            agent_name="Cardiologist",
            content="ECG shows ST elevation in leads II, III, aVF. Troponin elevated.",
            sequence_order=2,
        )
        db.add(msg)

        db.commit()
        return case

    def test_fhir_bundle_structure(self, db):
        from backend.api.fhir_export import _build_fhir_bundle
        case = self._create_test_case(db)
        summary = db.query(CaseSummary).filter(CaseSummary.case_id == case.id).first()
        invs = db.query(InvestigationSuggestion).filter(InvestigationSuggestion.case_id == case.id).all()
        msgs = db.query(Message).filter(Message.case_id == case.id).all()

        bundle = _build_fhir_bundle(case, summary, invs, msgs)

        assert bundle["resourceType"] == "Bundle"
        assert bundle["type"] == "document"
        assert "timestamp" in bundle
        assert "entry" in bundle
        assert len(bundle["entry"]) > 0

    def test_fhir_composition_resource(self, db):
        from backend.api.fhir_export import _build_fhir_bundle
        case = self._create_test_case(db)
        summary = db.query(CaseSummary).filter(CaseSummary.case_id == case.id).first()
        invs = db.query(InvestigationSuggestion).filter(InvestigationSuggestion.case_id == case.id).all()
        msgs = db.query(Message).filter(Message.case_id == case.id).all()

        bundle = _build_fhir_bundle(case, summary, invs, msgs)

        compositions = [e for e in bundle["entry"] if e["resource"]["resourceType"] == "Composition"]
        assert len(compositions) == 1
        comp = compositions[0]["resource"]
        assert comp["status"] == "final"
        assert comp["type"]["coding"][0]["code"] == "11506-3"

    def test_fhir_patient_resource(self, db):
        from backend.api.fhir_export import _build_fhir_bundle
        case = self._create_test_case(db)
        summary = db.query(CaseSummary).filter(CaseSummary.case_id == case.id).first()
        invs = db.query(InvestigationSuggestion).filter(InvestigationSuggestion.case_id == case.id).all()
        msgs = db.query(Message).filter(Message.case_id == case.id).all()

        bundle = _build_fhir_bundle(case, summary, invs, msgs)

        patients = [e for e in bundle["entry"] if e["resource"]["resourceType"] == "Patient"]
        assert len(patients) == 1

    def test_fhir_chief_complaint_observation(self, db):
        from backend.api.fhir_export import _build_fhir_bundle
        case = self._create_test_case(db)
        summary = db.query(CaseSummary).filter(CaseSummary.case_id == case.id).first()
        invs = db.query(InvestigationSuggestion).filter(InvestigationSuggestion.case_id == case.id).all()
        msgs = db.query(Message).filter(Message.case_id == case.id).all()

        bundle = _build_fhir_bundle(case, summary, invs, msgs)

        complaint_obs = [
            e for e in bundle["entry"]
            if e["resource"]["resourceType"] == "Observation"
            and e["resource"].get("code", {}).get("coding", [{}])[0].get("code") == "42343007"
        ]
        assert len(complaint_obs) == 1
        assert complaint_obs[0]["resource"]["valueString"] == "Severe crushing chest pain"

    def test_fhir_severity_observation(self, db):
        from backend.api.fhir_export import _build_fhir_bundle
        case = self._create_test_case(db)
        summary = db.query(CaseSummary).filter(CaseSummary.case_id == case.id).first()
        invs = db.query(InvestigationSuggestion).filter(InvestigationSuggestion.case_id == case.id).all()
        msgs = db.query(Message).filter(Message.case_id == case.id).all()

        bundle = _build_fhir_bundle(case, summary, invs, msgs)

        severity_obs = [
            e for e in bundle["entry"]
            if e["resource"]["resourceType"] == "Observation"
            and e["resource"].get("code", {}).get("coding", [{}])[0].get("code") == "273249006"
        ]
        assert len(severity_obs) == 1
        assert severity_obs[0]["resource"]["valueQuantity"]["value"] == 9

    def test_fhir_investigation_service_requests(self, db):
        from backend.api.fhir_export import _build_fhir_bundle
        case = self._create_test_case(db)
        summary = db.query(CaseSummary).filter(CaseSummary.case_id == case.id).first()
        invs = db.query(InvestigationSuggestion).filter(InvestigationSuggestion.case_id == case.id).all()
        msgs = db.query(Message).filter(Message.case_id == case.id).all()

        bundle = _build_fhir_bundle(case, summary, invs, msgs)

        service_requests = [e for e in bundle["entry"] if e["resource"]["resourceType"] == "ServiceRequest"]
        assert len(service_requests) == 2
        # Check STAT urgency
        for sr in service_requests:
            assert sr["resource"]["priority"] == "stat"
            assert sr["resource"]["status"] == "active"

    def test_fhir_allergy_resource(self, db):
        from backend.api.fhir_export import _build_fhir_bundle
        case = self._create_test_case(db)
        summary = db.query(CaseSummary).filter(CaseSummary.case_id == case.id).first()
        invs = db.query(InvestigationSuggestion).filter(InvestigationSuggestion.case_id == case.id).all()
        msgs = db.query(Message).filter(Message.case_id == case.id).all()

        bundle = _build_fhir_bundle(case, summary, invs, msgs)

        allergies = [e for e in bundle["entry"] if e["resource"]["resourceType"] == "AllergyIntolerance"]
        assert len(allergies) == 1
        assert allergies[0]["resource"]["code"]["text"] == "Penicillin"

    def test_fhir_transcript_document_reference(self, db):
        from backend.api.fhir_export import _build_fhir_bundle
        case = self._create_test_case(db)
        summary = db.query(CaseSummary).filter(CaseSummary.case_id == case.id).first()
        invs = db.query(InvestigationSuggestion).filter(InvestigationSuggestion.case_id == case.id).all()
        msgs = db.query(Message).filter(Message.case_id == case.id).all()

        bundle = _build_fhir_bundle(case, summary, invs, msgs)

        doc_refs = [e for e in bundle["entry"] if e["resource"]["resourceType"] == "DocumentReference"]
        assert len(doc_refs) == 1
        assert "Cardiologist" in doc_refs[0]["resource"]["content"][0]["attachment"]["data"]

    def test_fhir_bundle_total_count(self, db):
        from backend.api.fhir_export import _build_fhir_bundle
        case = self._create_test_case(db)
        summary = db.query(CaseSummary).filter(CaseSummary.case_id == case.id).first()
        invs = db.query(InvestigationSuggestion).filter(InvestigationSuggestion.case_id == case.id).all()
        msgs = db.query(Message).filter(Message.case_id == case.id).all()

        bundle = _build_fhir_bundle(case, summary, invs, msgs)

        assert bundle["total"] == len(bundle["entry"])

    def test_fhir_bundle_minimal_case(self, db):
        """FHIR bundle should work even with minimal case data."""
        from backend.api.fhir_export import _build_fhir_bundle
        case = Case(
            id="test-fhir-minimal",
            chief_complaint="Headache",
            status=CaseStatus.DONE,
        )
        db.add(case)
        db.commit()

        bundle = _build_fhir_bundle(case, None, [], [])
        assert bundle["resourceType"] == "Bundle"
        assert bundle["type"] == "document"
        assert len(bundle["entry"]) >= 2  # At least Composition + Patient + Chief Complaint
