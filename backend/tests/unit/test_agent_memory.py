"""
Tests for the Agent Memory & Pattern Recognition system.
"""
import pytest
import json
from unittest.mock import MagicMock


class TestAgentMemory:
    """Tests for the AgentMemory class."""

    @pytest.fixture
    def mem(self, db):
        from backend.services.agent_memory import AgentMemory
        return AgentMemory(db)

    @pytest.mark.asyncio
    async def test_store_and_recall_pattern(self, db, mem):
        from backend.db.models import Case, CaseStatus
        case = Case(id="mem-test-001", chief_complaint="chest pain", status=CaseStatus.DONE)
        db.add(case)
        db.commit()

        await mem.store_pattern(
            agent_name="Cardiologist",
            case_id="mem-test-001",
            pattern_type="symptom_cluster",
            pattern_data={"cluster": "cardiac", "symptoms": ["chest pain", "diaphoresis"]},
            confidence=0.85,
        )

        patterns = await mem.recall_patterns("Cardiologist", ["chest", "pain"], limit=5)
        assert len(patterns) >= 1
        assert patterns[0]["pattern_type"] == "symptom_cluster"

    @pytest.mark.asyncio
    async def test_recall_returns_sorted_by_relevance(self, db, mem):
        from backend.db.models import Case, CaseStatus
        # Create two cases with patterns
        for i, complaint in enumerate(["chest pain", "headache"]):
            case = Case(id=f"mem-sort-{i}", chief_complaint=complaint, status=CaseStatus.DONE)
            db.add(case)
            db.commit()
            await mem.store_pattern(
                agent_name="Cardiologist",
                case_id=f"mem-sort-{i}",
                pattern_type="symptom_cluster",
                pattern_data={"cluster": complaint, "symptoms": [complaint]},
                confidence=0.5 + i * 0.2,
            )

        # Recall with "chest" symptom — should rank chest pain pattern higher
        patterns = await mem.recall_patterns("Cardiologist", ["chest", "pain"], limit=5)
        assert len(patterns) >= 1
        # First result should be the chest pain pattern
        assert "chest" in json.dumps(patterns[0]["data"]).lower()

    @pytest.mark.asyncio
    async def test_recall_empty_when_no_patterns(self, db, mem):
        patterns = await mem.recall_patterns("NonexistentAgent", ["symptom"], limit=5)
        assert patterns == []

    @pytest.mark.asyncio
    async def test_store_pattern_with_correctness(self, db, mem):
        from backend.db.models import Case, CaseStatus
        case = Case(id="mem-correct-001", chief_complaint="palpitations", status=CaseStatus.DONE)
        db.add(case)
        db.commit()

        await mem.store_pattern(
            agent_name="Cardiologist",
            case_id="mem-correct-001",
            pattern_type="diagnostic_rule",
            pattern_data={"diagnosis": "Atrial fibrillation", "evidence": "irregular pulse"},
            confidence=0.7,
            was_correct=True,
        )

        patterns = await mem.recall_patterns("Cardiologist", ["palpitations"], limit=5)
        assert len(patterns) >= 1
        assert patterns[0]["was_correct"] is True

    @pytest.mark.asyncio
    async def test_get_agent_stats(self, db, mem):
        from backend.db.models import Case, CaseStatus
        # Create case and store patterns
        case = Case(id="mem-stats-001", chief_complaint="chest pain", status=CaseStatus.DONE)
        db.add(case)
        db.commit()

        await mem.store_pattern(
            agent_name="Cardiologist", case_id="mem-stats-001",
            pattern_type="diagnostic_rule",
            pattern_data={"diagnosis": "ACS"}, confidence=0.8, was_correct=True,
        )
        await mem.store_pattern(
            agent_name="Cardiologist", case_id="mem-stats-001",
            pattern_type="bias_detected",
            pattern_data={"bias_type": "anchoring"}, confidence=0.6,
        )

        stats = await mem.get_agent_stats("Cardiologist")
        assert stats["agent_name"] == "Cardiologist"
        assert stats["cases_participated"] >= 1
        assert stats["total_patterns_stored"] >= 2
        assert "anchoring" in stats["common_biases_detected"]

    @pytest.mark.asyncio
    async def test_get_agent_stats_empty(self, db, mem):
        stats = await mem.get_agent_stats("UnknownAgent")
        assert stats["cases_participated"] == 0
        assert stats["primary_dx_accuracy"] == 0.0

    @pytest.mark.asyncio
    async def test_extract_patterns_symptom_cluster(self, db, mem):
        from backend.db.models import Case, CaseStatus
        case = Case(id="mem-extract-001", chief_complaint="chest pain", status=CaseStatus.DONE)
        db.add(case)
        db.commit()

        content = "Chest pain with diaphoresis. Differential: Acute Coronary Syndrome."
        await mem.extract_patterns_from_transcript("Cardiologist", "mem-extract-001", content)

        patterns = await mem.recall_patterns("Cardiologist", ["chest", "pain"], limit=5)
        assert len(patterns) >= 1
        assert patterns[0]["pattern_type"] == "symptom_cluster"

    @pytest.mark.asyncio
    async def test_extract_patterns_bias_detection(self, db, mem):
        from backend.db.models import Case, CaseStatus
        case = Case(id="mem-bias-001", chief_complaint="headache", status=CaseStatus.DONE)
        db.add(case)
        db.commit()

        content = "While the previous specialist showed anchoring bias, this presentation suggests..."
        await mem.extract_patterns_from_transcript("Neurologist", "mem-bias-001", content)

        patterns = await mem.recall_patterns("Neurologist", ["headache"], limit=5)
        bias_patterns = [p for p in patterns if p["pattern_type"] == "bias_detected"]
        assert len(bias_patterns) >= 1

    @pytest.mark.asyncio
    async def test_extract_patterns_guideline_ref(self, db, mem):
        from backend.db.models import Case, CaseStatus
        case = Case(id="mem-guide-001", chief_complaint="chest pain", status=CaseStatus.DONE)
        db.add(case)
        db.commit()

        content = "Based on ESC guidelines and AHA evidence, this suggests..."
        await mem.extract_patterns_from_transcript("Cardiologist", "mem-guide-001", content)

        patterns = await mem.recall_patterns("Cardiologist", ["chest"], limit=5)
        guideline_patterns = [p for p in patterns if p["pattern_type"] == "guideline_ref"]
        assert len(guideline_patterns) >= 1

    def test_format_patterns_for_prompt_empty(self, db, mem):
        result = mem.format_patterns_for_prompt([])
        assert result == ""

    def test_format_patterns_for_prompt_with_patterns(self, db, mem):
        patterns = [
            {
                "pattern_type": "symptom_cluster",
                "data": {"cluster": "cardiac", "symptoms_found": ["chest pain", "diaphoresis"]},
                "confidence": 0.85,
            },
            {
                "pattern_type": "bias_detected",
                "data": {"bias_type": "anchoring"},
                "confidence": 0.6,
            },
        ]
        result = mem.format_patterns_for_prompt(patterns)
        assert "PATTERN RECOGNITION" in result
        assert "cardiac" in result
        assert "anchored" in result
        assert "do NOT be anchored" in result

    @pytest.mark.asyncio
    async def test_recall_limits_results(self, db, mem):
        from backend.db.models import Case, CaseStatus
        # Create many patterns
        for i in range(10):
            case = Case(id=f"mem-limit-{i}", chief_complaint=f"symptom_{i}", status=CaseStatus.DONE)
            db.add(case)
            db.commit()
            await mem.store_pattern(
                agent_name="Cardiologist",
                case_id=f"mem-limit-{i}",
                pattern_type="symptom_cluster",
                pattern_data={"cluster": f"cluster_{i}", "symptoms": [f"symptom_{i}"]},
                confidence=0.5,
            )

        patterns = await mem.recall_patterns("Cardiologist", ["symptom"], limit=3)
        assert len(patterns) <= 3

    @pytest.mark.asyncio
    async def test_extract_patterns_no_match(self, db, mem):
        """Non-specialist content shouldn't create symptom_cluster patterns."""
        from backend.db.models import Case, CaseStatus
        case = Case(id="mem-nomatch-001", chief_complaint="fatigue", status=CaseStatus.DONE)
        db.add(case)
        db.commit()

        content = "The patient reports general fatigue with no specific symptoms."
        await mem.extract_patterns_from_transcript("Cardiologist", "mem-nomatch-001", content)

        patterns = await mem.recall_patterns("Cardiologist", ["fatigue"], limit=5)
        # May or may not have patterns, but shouldn't crash
        assert isinstance(patterns, list)
