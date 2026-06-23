"""
Healtheon — Reasoning Trace Tree Builder
Collects specialist differential data and builds a tree structure
for visualization with react-d3-tree on the frontend.
"""
from dataclasses import dataclass, field
import json
import re


@dataclass
class ReasoningNode:
    name: str               # e.g., "Cardiologist", "STEMI"
    confidence: str         # e.g., "HIGH", "85%"
    details: str            # e.g., "Evidence: chest pain"
    children: list = field(default_factory=list)

    def to_dict(self):
        result = {
            "name": f"{self.name} [{self.confidence}]" if self.confidence != "N/A" else self.name,
            "attributes": {"details": self.details, "confidence": self.confidence},
        }
        if self.children:
            result["children"] = [c.to_dict() for c in self.children]
        return result


class ReasoningTreeBuilder:
    def __init__(self, chief_complaint: str = "Patient Case"):
        self.tree = ReasoningNode(
            name=chief_complaint[:60],
            confidence="N/A",
            details="Initial presentation",
            children=[],
        )

    def add_specialist_branch(self, agent_name: str, differentials: list[dict]):
        """
        differentials should look like:
        [ {"dx": "STEMI", "conf": "HIGH", "reason": "pain pattern"}, ... ]
        """
        branch = ReasoningNode(
            name=agent_name,
            confidence="N/A",
            details="Specialist Analysis",
            children=[],
        )

        for d in differentials:
            leaf = ReasoningNode(
                name=d.get("dx", "Unknown"),
                confidence=d.get("conf", "?"),
                details=d.get("reason", ""),
            )
            branch.children.append(leaf)

        self.tree.children.append(branch)
        return branch

    def get_tree_json(self) -> dict:
        """Returns the JSON format that react-d3-tree needs."""
        return self.tree.to_dict()


def parse_json_differentials(agent_content: str) -> list[dict]:
    """
    Extract differentials from the <JSON_DIFFERENTIALS>...</JSON_DIFFERENTIALS> tag
    in an agent's response. Returns a list of dicts with dx, conf, reason keys.
    Falls back to empty list if no tag found.
    """
    match = re.search(r'<JSON_DIFFERENTIALS>\s*(\[.*?\])\s*</JSON_DIFFERENTIALS>', agent_content, re.DOTALL)
    if not match:
        return []

    try:
        data = json.loads(match.group(1))
        if isinstance(data, list):
            return [d for d in data if isinstance(d, dict) and "dx" in d]
    except (json.JSONDecodeError, KeyError, TypeError):
        pass

    return []
