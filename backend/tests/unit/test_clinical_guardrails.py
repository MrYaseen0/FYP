"""Unit tests for backend.agents.clinical_guardrails module."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.agents.clinical_guardrails import (
    EDUCATIONAL_DISCLAIMER,
    CRITICAL_DISCLAIMER,
    BEHAVIORAL_GUARDRAILS,
    ESCALATION_RULES,
    EDGE_CASE_HANDLING,
    CONFIDENCE_LANGUAGE,
    DIFFERENTIAL_SCHEMA,
)


class TestDisclaimerContent:
    def test_educational_disclaimer_exists(self):
        assert isinstance(EDUCATIONAL_DISCLAIMER, str)

    def test_critical_disclaimer_exists(self):
        assert isinstance(CRITICAL_DISCLAIMER, str)


class TestBehavioralGuardrails:
    def test_guardrails_is_string(self):
        assert isinstance(BEHAVIORAL_GUARDRAILS, str)

    def test_prohibits_prescribing_medications(self):
        assert "NEVER prescribe medications" in BEHAVIORAL_GUARDRAILS

    def test_prohibits_autonomous_decisions(self):
        assert "autonomous clinical decisions" in BEHAVIORAL_GUARDRAILS

    def test_prohibits_patient_care_advice(self):
        assert "direct patient care advice" in BEHAVIORAL_GUARDRAILS

    def test_requires_red_flag_escalation(self):
        assert "red flags" in BEHAVIORAL_GUARDRAILS.lower()

    def test_prohibits_definitive_diagnoses(self):
        assert "definitive diagnoses" in BEHAVIORAL_GUARDRAILS

    def test_absolute_prohibitions_section(self):
        assert "ABSOLUTE PROHIBITIONS" in BEHAVIORAL_GUARDRAILS

    def test_mentions_probabilistic_language(self):
        assert "probabilistic language" in BEHAVIORAL_GUARDRAILS

    def test_mentions_physician_deference(self):
        assert "physician" in BEHAVIORAL_GUARDRAILS.lower()


class TestEscalationRules:
    def test_escalation_rules_is_string(self):
        assert isinstance(ESCALATION_RULES, str)

    def test_has_urgency_levels(self):
        assert "CRITICAL" in ESCALATION_RULES
        assert "HIGH" in ESCALATION_RULES
        assert "MODERATE" in ESCALATION_RULES
        assert "LOW" in ESCALATION_RULES

    def test_critical_vital_signs_defined(self):
        assert "CRITICAL VITAL SIGNS" in ESCALATION_RULES

    def test_hypotension_threshold(self):
        assert "90 mmHg" in ESCALATION_RULES

    def test_tachycardia_threshold(self):
        assert "120 bpm" in ESCALATION_RULES

    def test_hypoxia_threshold(self):
        assert "90%" in ESCALATION_RULES

    def test_red_flag_scenarios(self):
        assert "RED FLAG SCENARIOS" in ESCALATION_RULES

    def test_stress_protocol(self):
        assert "Stroke Protocol" in ESCALATION_RULES

    def test_sepsis_detection(self):
        assert "sepsis" in ESCALATION_RULES.lower()

    def test_pregnancy_complications(self):
        assert "Pregnancy" in ESCALATION_RULES


class TestEdgeCaseHandling:
    def test_edge_case_handling_is_string(self):
        assert isinstance(EDGE_CASE_HANDLING, str)

    def test_incomplete_information_section(self):
        assert "INCOMPLETE INFORMATION" in EDGE_CASE_HANDLING

    def test_contradictory_data_section(self):
        assert "CONTRADICTORY DATA" in EDGE_CASE_HANDLING

    def test_out_of_scope_section(self):
        assert "OUT-OF-SCOPE" in EDGE_CASE_HANDLING

    def test_patient_directed_queries(self):
        assert "PATIENT-DIRECTED QUERIES" in EDGE_CASE_HANDLING

    def test_missing_vitals_handling(self):
        assert "vitals missing" in EDGE_CASE_HANDLING.lower()

    def test_psychiatry_referral(self):
        assert "Psychiatry" in EDGE_CASE_HANDLING

    def test_pediatric_redirect(self):
        assert "Pediatric" in EDGE_CASE_HANDLING


class TestConfidenceLanguage:
    def test_all_levels_present(self):
        assert "HIGH" in CONFIDENCE_LANGUAGE
        assert "MODERATE" in CONFIDENCE_LANGUAGE
        assert "LOW" in CONFIDENCE_LANGUAGE

    def test_high_confidence_phrases(self):
        assert "strongly suggests" in CONFIDENCE_LANGUAGE["HIGH"]

    def test_moderate_confidence_phrases(self):
        assert "consistent with" in CONFIDENCE_LANGUAGE["MODERATE"]

    def test_low_confidence_phrases(self):
        assert "raises the possibility" in CONFIDENCE_LANGUAGE["LOW"]

    def test_no_raw_percentages(self):
        for level, phrase in CONFIDENCE_LANGUAGE.items():
            assert "%" not in phrase, f"{level} should not contain raw percentages"


class TestDifferentialSchema:
    def test_schema_is_string(self):
        assert isinstance(DIFFERENTIAL_SCHEMA, str)

    def test_schema_mentions_rank(self):
        assert "rank" in DIFFERENTIAL_SCHEMA

    def test_schema_mentions_diagnosis(self):
        assert "diagnosis" in DIFFERENTIAL_SCHEMA

    def test_schema_mentions_likelihood(self):
        assert "likelihood" in DIFFERENTIAL_SCHEMA

    def test_schema_mentions_supporting_features(self):
        assert "supporting_features" in DIFFERENTIAL_SCHEMA

    def test_schema_mentions_next_steps(self):
        assert "next_steps" in DIFFERENTIAL_SCHEMA
