"""
Healtheon — Agent Memory & Pattern Recognition

Persistent memory system that allows agents to learn from past cases.
Stores diagnostic patterns, recalls relevant history, and tracks
agent performance statistics across cases.
"""
import json
import logging
from typing import List, Optional
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from backend.db.models import Case, CaseSummary
from backend.db.models_extended import AgentPattern

logger = logging.getLogger("healtheon.agent_memory")


class AgentMemory:
    """
    Persistent memory for each agent across cases.
    Enables pattern recognition and self-improvement.
    """

    def __init__(self, db: Session):
        self.db = db

    async def store_pattern(
        self,
        agent_name: str,
        case_id: str,
        pattern_type: str,
        pattern_data: dict,
        confidence: float = 0.5,
        was_correct: Optional[bool] = None,
    ):
        """
        Store a diagnostic pattern an agent recognized.

        Args:
            agent_name: Name of the agent (e.g., "Cardiologist")
            case_id: The case where this pattern was observed
            pattern_type: One of: symptom_cluster, diagnostic_rule, bias_detected, guideline_ref
            pattern_data: Dict with pattern details
            confidence: Agent's confidence in this pattern (0-1)
            was_correct: Whether this pattern led to correct diagnosis (None if unknown)
        """
        try:
            pattern = AgentPattern(
                agent_name=agent_name,
                case_id=case_id,
                pattern_type=pattern_type,
                pattern_data=json.dumps(pattern_data, default=str),
                confidence=confidence,
                was_correct=was_correct,
            )
            self.db.add(pattern)
            self.db.commit()
            logger.debug(f"Stored {pattern_type} pattern for {agent_name} from case {case_id[:8]}")
        except Exception as e:
            logger.warning(f"Failed to store pattern: {e}")
            self.db.rollback()

    async def recall_patterns(
        self,
        agent_name: str,
        symptoms: List[str],
        limit: int = 5,
    ) -> List[dict]:
        """
        Recall relevant patterns from past cases for a given agent and symptom set.
        Uses keyword matching on stored pattern data.

        Args:
            agent_name: Name of the agent to recall patterns for
            symptoms: List of symptom keywords to match against
            limit: Maximum number of patterns to return

        Returns:
            List of relevant pattern dicts, most relevant first
        """
        try:
            # Query patterns for this agent
            patterns = (
                self.db.query(AgentPattern)
                .filter(AgentPattern.agent_name == agent_name)
                .order_by(AgentPattern.created_at.desc())
                .limit(100)  # Get recent patterns for scoring
                .all()
            )

            if not patterns:
                return []

            # Score patterns by relevance to current symptoms
            scored = []
            symptoms_lower = [s.lower() for s in symptoms]
            for p in patterns:
                try:
                    data = json.loads(p.pattern_data) if isinstance(p.pattern_data, str) else p.pattern_data
                except (json.JSONDecodeError, TypeError):
                    continue

                # Calculate relevance score
                score = 0.0
                pattern_text = json.dumps(data).lower()

                # Symptom overlap bonus
                for sym in symptoms_lower:
                    if sym in pattern_text:
                        score += 2.0

                # Recency bonus (more recent = higher)
                if p.created_at:
                    try:
                        created = p.created_at
                        if created.tzinfo is None:
                            created = created.replace(tzinfo=timezone.utc)
                        days_ago = (datetime.now(timezone.utc) - created).days
                        score += max(0, 10 - days_ago * 0.1)
                    except Exception:
                        pass

                # Accuracy bonus
                if p.was_correct is True:
                    score += 3.0
                elif p.was_correct is False:
                    score -= 1.0

                # Confidence bonus
                score += (p.confidence or 0.5) * 2

                if score > 0:
                    scored.append((score, p, data))

            # Sort by score descending, return top N
            scored.sort(key=lambda x: x[0], reverse=True)
            results = []
            for _, pattern, data in scored[:limit]:
                results.append({
                    "pattern_type": pattern.pattern_type,
                    "data": data,
                    "confidence": pattern.confidence,
                    "was_correct": pattern.was_correct,
                    "case_id": pattern.case_id,
                    "created_at": pattern.created_at.isoformat() if pattern.created_at else None,
                })

            return results

        except Exception as e:
            logger.warning(f"Failed to recall patterns: {e}")
            return []

    async def get_agent_stats(self, agent_name: str) -> dict:
        """
        Get performance statistics for an agent across all past cases.

        Returns:
            Dict with cases_participated, accuracy, common biases, etc.
        """
        try:
            patterns = (
                self.db.query(AgentPattern)
                .filter(AgentPattern.agent_name == agent_name)
                .all()
            )

            if not patterns:
                return {
                    "agent_name": agent_name,
                    "cases_participated": 0,
                    "primary_dx_accuracy": 0.0,
                    "avg_confidence_when_correct": 0.0,
                    "avg_confidence_when_wrong": 0.0,
                    "common_biases_detected": [],
                    "most_common_differentials": [],
                    "total_patterns_stored": 0,
                }

            # Compute stats
            case_ids = set(p.case_id for p in patterns)
            correct = [p for p in patterns if p.was_correct is True]
            wrong = [p for p in patterns if p.was_correct is False]
            bias_patterns = [p for p in patterns if p.pattern_type == "bias_detected"]

            avg_conf_correct = (
                sum(p.confidence or 0 for p in correct) / len(correct)
                if correct else 0.0
            )
            avg_conf_wrong = (
                sum(p.confidence or 0 for p in wrong) / len(wrong)
                if wrong else 0.0
            )

            accuracy = (
                len(correct) / (len(correct) + len(wrong))
                if (correct or wrong) else 0.0
            )

            # Extract common biases
            biases = []
            for bp in bias_patterns:
                try:
                    data = json.loads(bp.pattern_data) if isinstance(bp.pattern_data, str) else bp.pattern_data
                    if "bias_type" in data:
                        biases.append(data["bias_type"])
                except (json.JSONDecodeError, TypeError):
                    pass

            # Count bias frequency
            from collections import Counter
            bias_counts = Counter(biases).most_common(5)

            # Extract most common differentials
            diff_patterns = [p for p in patterns if p.pattern_type == "diagnostic_rule"]
            diffs = []
            for dp in diff_patterns:
                try:
                    data = json.loads(dp.pattern_data) if isinstance(dp.pattern_data, str) else dp.pattern_data
                    if "diagnosis" in data:
                        diffs.append(data["diagnosis"])
                except (json.JSONDecodeError, TypeError):
                    pass
            diff_counts = Counter(diffs).most_common(5)

            return {
                "agent_name": agent_name,
                "cases_participated": len(case_ids),
                "primary_dx_accuracy": round(accuracy, 3),
                "avg_confidence_when_correct": round(avg_conf_correct, 3),
                "avg_confidence_when_wrong": round(avg_conf_wrong, 3),
                "common_biases_detected": [b[0] for b in bias_counts],
                "most_common_differentials": [d[0] for d in diff_counts],
                "total_patterns_stored": len(patterns),
            }

        except Exception as e:
            logger.warning(f"Failed to get agent stats: {e}")
            return {"agent_name": agent_name, "error": str(e)}

    async def extract_patterns_from_transcript(
        self,
        agent_name: str,
        case_id: str,
        content: str,
    ):
        """
        Extract and store patterns from an agent's message in the transcript.
        Uses keyword analysis (no LLM needed).
        """
        content_lower = content.lower()

        # Detect symptom clusters
        symptom_keywords = {
            "chest pain": ["chest", "pain", "angina", "pressure"],
            "neurological": ["headache", "numbness", "weakness", "seizure", "speech", "vision"],
            "respiratory": ["cough", "dyspnoea", "breathing", "haemoptysis", "wheeze"],
            "cardiac": ["palpitation", "arrhythmia", "heart failure", "oedema"],
        }

        for cluster_name, keywords in symptom_keywords.items():
            if any(kw in content_lower for kw in keywords):
                # Extract diagnosis mentions
                diagnosis_patterns = [
                    "differential", "diagnosis", "consider", "rule out", "likely",
                    "suggests", "consistent with", "textbook presentation"
                ]
                diagnosis = ""
                for dp in diagnosis_patterns:
                    idx = content_lower.find(dp)
                    if idx >= 0:
                        # Extract surrounding context
                        start = max(0, idx - 20)
                        end = min(len(content), idx + 100)
                        snippet = content[start:end].strip()
                        diagnosis = snippet
                        break

                if diagnosis:
                    await self.store_pattern(
                        agent_name=agent_name,
                        case_id=case_id,
                        pattern_type="symptom_cluster",
                        pattern_data={
                            "cluster": cluster_name,
                            "symptoms_found": [kw for kw in keywords if kw in content_lower],
                            "diagnosis_mention": diagnosis[:200],
                        },
                        confidence=0.5,
                    )

        # Detect bias mentions
        bias_keywords = {
            "anchoring": ["anchor", "anchoring"],
            "availability": ["availability", "recent case"],
            "premature_closure": ["premature", "closed"],
            "confirmation_bias": ["confirm", "confirmation"],
        }
        for bias_name, keywords in bias_keywords.items():
            if any(kw in content_lower for kw in keywords):
                await self.store_pattern(
                    agent_name=agent_name,
                    case_id=case_id,
                    pattern_type="bias_detected",
                    pattern_data={
                        "bias_type": bias_name,
                        "context": content[:300],
                    },
                    confidence=0.6,
                )

        # Detect guideline references
        guideline_keywords = ["guideline", "protocol", "evidence", "trial", "study", "ESC", "AHA", "ACC", "NICE"]
        if any(kw in content for kw in guideline_keywords):
            await self.store_pattern(
                agent_name=agent_name,
                case_id=case_id,
                pattern_type="guideline_ref",
                pattern_data={
                    "guideline_mentions": [kw for kw in guideline_keywords if kw in content],
                    "context": content[:300],
                },
                confidence=0.7,
            )

    def format_patterns_for_prompt(self, patterns: List[dict]) -> str:
        """
        Format recalled patterns into a string suitable for injection
        into an agent's system prompt.
        """
        if not patterns:
            return ""

        lines = [f"PATTERN RECOGNITION (from {len(patterns)} similar past cases):"]
        for i, p in enumerate(patterns[:3], 1):
            data = p.get("data", {})
            ptype = p.get("pattern_type", "unknown")
            conf = p.get("confidence", 0.5)

            if ptype == "symptom_cluster":
                cluster = data.get("cluster", "unknown")
                symptoms = ", ".join(data.get("symptoms_found", []))
                lines.append(f"  {i}. Symptom cluster '{cluster}' (confidence {conf:.0%}): {symptoms}")
            elif ptype == "diagnostic_rule":
                dx = data.get("diagnosis", "unknown")
                lines.append(f"  {i}. Past diagnosis pattern (confidence {conf:.0%}): {dx[:80]}")
            elif ptype == "bias_detected":
                bias = data.get("bias_type", "unknown")
                lines.append(f"  {i}. Bias detected in similar cases: {bias}")
            elif ptype == "guideline_ref":
                refs = ", ".join(data.get("guideline_mentions", []))
                lines.append(f"  {i}. Relevant guidelines: {refs}")

        lines.append("")
        lines.append("Use these patterns to inform your reasoning, but do NOT be anchored by them.")
        lines.append("Each case is unique — patterns are hints, not conclusions.")

        return "\n".join(lines)
