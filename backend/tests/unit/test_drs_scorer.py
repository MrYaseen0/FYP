"""
Tests for the Diagnostic Reasoning Score (DRS) Scorer.
"""
import pytest
import json
from unittest.mock import patch, MagicMock


class TestDRSScoreModel:
    """Tests for the DRSScore Pydantic model."""

    def test_valid_score_creation(self):
        from backend.agents.drs_scorer import DRSScore
        score = DRSScore(
            differentials=85, evidence_use=78, bias_avoidance=90,
            completeness=72, urgency_detection=83, overall=82,
            missed=["Aortic dissection not ruled out"],
            strengths=["Appropriate urgency classification"],
        )
        assert score.overall == 82
        assert len(score.missed) == 1
        assert len(score.strengths) == 1

    def test_score_boundaries(self):
        from backend.agents.drs_scorer import DRSScore
        score = DRSScore(
            differentials=0, evidence_use=100, bias_avoidance=0,
            completeness=100, urgency_detection=0, overall=50,
            missed=[], strengths=[],
        )
        assert score.differentials == 0
        assert score.evidence_use == 100
        assert score.overall == 50

    def test_score_rejects_out_of_range(self):
        from backend.agents.drs_scorer import DRSScore
        with pytest.raises(Exception):
            DRSScore(
                differentials=101, evidence_use=50, bias_avoidance=50,
                completeness=50, urgency_detection=50, overall=50,
                missed=[], strengths=[],
            )

    def test_score_rejects_negative(self):
        from backend.agents.drs_scorer import DRSScore
        with pytest.raises(Exception):
            DRSScore(
                differentials=-1, evidence_use=50, bias_avoidance=50,
                completeness=50, urgency_detection=50, overall=50,
                missed=[], strengths=[],
            )

    def test_empty_lists_default(self):
        from backend.agents.drs_scorer import DRSScore
        score = DRSScore(
            differentials=50, evidence_use=50, bias_avoidance=50,
            completeness=50, urgency_detection=50, overall=50,
        )
        assert score.missed == []
        assert score.strengths == []

    def test_model_dump_json(self):
        from backend.agents.drs_scorer import DRSScore
        score = DRSScore(
            differentials=80, evidence_use=70, bias_avoidance=90,
            completeness=75, urgency_detection=85, overall=80,
            missed=["test"], strengths=["test"],
        )
        json_str = score.model_dump_json()
        parsed = json.loads(json_str)
        assert parsed["overall"] == 80
        assert parsed["missed"] == ["test"]


class TestHeuristicScorer:
    """Tests for the fallback heuristic scorer."""

    def _make_transcript(self, agents_content=None):
        if agents_content is None:
            agents_content = [
                ("Intake_Agent", "Patient presents with chest pain, radiating to left arm."),
                ("General_Practitioner", "Differential includes ACS, PE, aortic dissection. Route: [ROUTE: cardiological]"),
                ("Cardiologist", "ECG shows ST elevation in leads II, III, aVF. Troponin elevated."),
                ("Neurologist", "Neurological exam normal. No focal deficits."),
                ("Pulmonologist", "Lungs clear. No respiratory distress."),
                ("Pathologist", "Recommended: Troponin, ECG, CT angiography. STAT urgency."),
                ("Summarizer", "Final report: Acute STEMI. Evidence-based management with dual antiplatelet therapy."),
            ]
        return [{"agent_name": name, "content": content} for name, content in agents_content]

    def test_heuristic_returns_valid_score(self):
        from backend.agents.drs_scorer import _heuristic_score
        transcript = self._make_transcript()
        score = _heuristic_score(transcript, "Final report: Acute STEMI")
        assert 10 <= score.overall <= 100
        assert 10 <= score.differentials <= 100
        assert 10 <= score.evidence_use <= 100
        assert 10 <= score.bias_avoidance <= 100
        assert 10 <= score.completeness <= 100
        assert 10 <= score.urgency_detection <= 100

    def test_heuristic_with_evidence_keywords(self):
        from backend.agents.drs_scorer import _heuristic_score
        transcript = [
            {"agent_name": "GP", "content": "Based on clinical evidence and guidelines, this is ACS."},
            {"agent_name": "Cardiologist", "content": "Trial data supports dual antiplatelet therapy."},
        ]
        score = _heuristic_score(transcript, "Evidence-based report")
        assert score.evidence_use >= 55  # Should get keyword bonus

    def test_heuristic_with_urgency_keywords(self):
        from backend.agents.drs_scorer import _heuristic_score
        transcript = [
            {"agent_name": "GP", "content": "This is a critical case requiring emergent intervention. STAT order placed."},
        ]
        score = _heuristic_score(transcript, "Critical urgency report")
        assert score.urgency_detection >= 55

    def test_heuristic_with_differential_keywords(self):
        from backend.agents.drs_scorer import _heuristic_score
        transcript = [
            {"agent_name": "GP", "content": "Differential diagnoses: 1. ACS 2. PE. Must rule out aortic dissection."},
        ]
        score = _heuristic_score(transcript, "Report with differentials")
        assert score.differentials >= 55

    def test_heuristic_empty_transcript(self):
        from backend.agents.drs_scorer import _heuristic_score
        score = _heuristic_score([], "Empty report")
        assert 10 <= score.overall <= 100
        assert len(score.missed) > 0  # Should flag missing detail

    def test_heuristic_has_missed_items(self):
        from backend.agents.drs_scorer import _heuristic_score
        transcript = [
            {"agent_name": "GP", "content": "Chest pain, likely musculoskeletal."},
        ]
        score = _heuristic_score(transcript, "Chest pain report")
        # Should flag aortic dissection as missed for chest pain
        assert any("aortic" in m.lower() for m in score.missed)

    def test_heuristic_agent_diversity_bonus(self):
        from backend.agents.drs_scorer import _heuristic_score
        many_agents = [{"agent_name": f"Agent_{i}", "content": f"Analysis {i}"} for i in range(7)]
        score = _heuristic_score(many_agents, "Report")
        few_agents = [{"agent_name": f"Agent_{i}", "content": f"Analysis {i}"} for i in range(2)]
        score_few = _heuristic_score(few_agents, "Report")
        assert score.overall >= score_few.overall - 5  # More agents = at least as good


class TestScoreReasoning:
    """Tests for the async score_reasoning function (with LLM fallback)."""

    @pytest.mark.asyncio
    async def test_score_reasoning_fallback_to_heuristic(self):
        from backend.agents.drs_scorer import score_reasoning
        transcript = [
            {"agent_name": "Intake", "content": "Patient with chest pain"},
            {"agent_name": "GP", "content": "Triage: cardiological route"},
        ]
        with patch("backend.config.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "ollama"
            mock_settings.OLLAMA_BASE_URL = "http://localhost:11434/v1"
            mock_settings.GROQ_API_KEY = ""
            mock_settings.OPENAI_API_KEY = ""
            with patch("urllib.request.urlopen", side_effect=Exception("No LLM")):
                score = await score_reasoning(transcript, "Report")
                assert 10 <= score.overall <= 100
                assert isinstance(score.missed, list)
                assert isinstance(score.strengths, list)
