"""
Healtheon — GroupChat Orchestration

This module defines the custom speaker-selection state machine that enforces
the clinical workflow order:

    Intake_Agent → General_Practitioner → Specialist(s) ↔ Intake_Agent (clarification)
                                        → Pathologist → Summarizer → END

Key design decisions (for FYP write-up):
- Temperature 0.2: Reduces LLM stochasticity (hallucinations) in a sensitive domain.
- custom_speaker_selection: Enforces a deterministic state machine on top of LLMs,
  demonstrating Separation of Concerns (each agent has one bounded role).
- max_round=12: Hard circuit-breaker — guarantees the system halts (production-safe AI).
- is_termination_msg on Summarizer: Content-based termination condition.
"""
import autogen
from typing import Optional

from backend.agents.intake_agent import create_intake_agent
from backend.agents.gp_agent import create_gp_agent
from backend.agents.cardiologist_agent import create_cardiologist_agent
from backend.agents.neurologist_agent import create_neurologist_agent
from backend.agents.pulmonologist_agent import create_pulmonologist_agent
from backend.agents.pathologist_agent import create_pathologist_agent
from backend.agents.summarizer_agent import create_summarizer_agent
from backend.config import settings, get_llm_config

# Specialist agent names for routing logic
SPECIALIST_NAMES = {"Cardiologist", "Neurologist", "Pulmonologist"}


def build_group_chat(memory_context: dict = None) -> tuple[autogen.GroupChat, autogen.GroupChatManager, dict]:
    """
    Instantiate all agents and wire them into an AutoGen GroupChat.

    Args:
        memory_context: Optional dict mapping agent names to memory context strings.
                       These are injected into each agent's system prompt.

    Returns:
        groupchat: The AutoGen GroupChat object.
        manager: The GroupChatManager that drives the conversation.
        agents: Dict of agent_name → agent object for external reference.
    """
    mc = memory_context or {}
    # ── Instantiate all agents ─────────────────────────────────────────────
    intake = create_intake_agent(extra_context=mc.get("Intake_Agent", ""))
    gp = create_gp_agent(extra_context=mc.get("General_Practitioner", ""))
    cardiologist = create_cardiologist_agent(extra_context=mc.get("Cardiologist", ""))
    neurologist = create_neurologist_agent(extra_context=mc.get("Neurologist", ""))
    pulmonologist = create_pulmonologist_agent(extra_context=mc.get("Pulmonologist", ""))
    pathologist = create_pathologist_agent(extra_context=mc.get("Pathologist", ""))
    summarizer = create_summarizer_agent(extra_context=mc.get("Summarizer", ""))

    agents_list = [intake, gp, cardiologist, neurologist, pulmonologist, pathologist, summarizer]
    agents_by_name = {a.name: a for a in agents_list}

    # ── Custom Speaker Selection ───────────────────────────────────────────
    def custom_speaker_selection(
        last_speaker: autogen.Agent,
        groupchat: autogen.GroupChat,
    ) -> autogen.Agent:
        """
        Enforces the Healtheon clinical workflow as a Python state machine.

        State transitions:
          (start)           → Intake_Agent
          Intake_Agent      → General_Practitioner (if GP hasn't spoken yet)
                            → [back to the specialist who asked a clarification question]
          General_Practitioner → [specialist(s) mentioned via @-mention in message]
                               → Summarizer (if Pathologist has spoken)
          Cardiologist /
          Neurologist /
          Pulmonologist     → Pathologist (if ≥4 specialist messages OR "Pathologist" mentioned)
                            → Intake_Agent (if specialist just asked a follow-up question)
                            → [auto — let LLM pick next specialist for debate]
          Pathologist       → Summarizer (always; Pathologist speaks last before summary)
          Summarizer        → [termination via is_termination_msg]
        """
        messages = groupchat.messages
        msg_count = len(messages)

        # ── STEP 1: Start → Intake ────────────────────────────────────────
        if msg_count == 0 or last_speaker is None:
            return intake

        last_name = last_speaker.name

        # ── STEP 2: Intake just spoke ─────────────────────────────────────
        if last_name == "Intake_Agent":
            # Has the GP spoken yet? If not, send to GP.
            gp_has_spoken = any(m.get("name") == "General_Practitioner" for m in messages)
            if not gp_has_spoken:
                return gp
            # Otherwise, Intake was answering a specialist's clarification request.
            # Return to the LAST specialist who sent a FOLLOW-UP REQUEST.
            for msg in reversed(messages[:-1]):  # skip the Intake message we just saw
                if msg.get("name") in SPECIALIST_NAMES:
                    return agents_by_name[msg["name"]]
            # Fallback: return to GP
            return gp

        # ── STEP 3: GP just spoke ─────────────────────────────────────────
        if last_name == "General_Practitioner":
            # Has the Pathologist spoken? If so, send to Summarizer.
            if any(m.get("name") == "Pathologist" for m in messages):
                return summarizer
            # Otherwise, route to the first specialist the GP @-mentioned.
            last_gp_msg = next(
                (m["content"] for m in reversed(messages) if m.get("name") == "General_Practitioner"),
                ""
            )
            for specialist_name in ["Cardiologist", "Neurologist", "Pulmonologist"]:
                if f"@{specialist_name}" in last_gp_msg:
                    return agents_by_name[specialist_name]
            # Fallback: let AutoGen decide (may pick any specialist)
            return "auto"

        # ── STEP 4: Specialist just spoke ────────────────────────────────
        if last_name in SPECIALIST_NAMES:
            last_content = messages[-1].get("content", "") if messages else ""

            # Did specialist ask Intake for clarification?
            if "@Intake_Agent" in last_content:
                return intake

            # Has the Pathologist spoken yet?
            pathologist_spoken = any(m.get("name") == "Pathologist" for m in messages)
            if pathologist_spoken:
                return summarizer

            # Count specialist + GP messages to decide if debate is mature
            debate_msgs = [
                m for m in messages
                if m.get("name") in SPECIALIST_NAMES or m.get("name") == "General_Practitioner"
            ]
            # Trigger Pathologist if ≥4 debate turns OR "Pathologist" mentioned
            if len(debate_msgs) >= 4 or "Pathologist" in last_content:
                return pathologist

            # Let AutoGen LLM pick the next debater naturally
            return "auto"

        # ── STEP 5: Pathologist just spoke ───────────────────────────────
        if last_name == "Pathologist":
            return summarizer

        # ── STEP 6: Default / Summarizer ─────────────────────────────────
        return "auto"

    # ── Build GroupChat ────────────────────────────────────────────────────
    groupchat = autogen.GroupChat(
        agents=agents_list,
        messages=[],
        max_round=settings.MAX_ROUNDS,          # Hard limit — prevents infinite loops
        speaker_selection_method=custom_speaker_selection,
        allow_repeat_speaker=False,
    )

    manager = autogen.GroupChatManager(
        groupchat=groupchat,
        llm_config={"config_list": [get_llm_config()]},
    )

    return groupchat, manager, agents_by_name
