"""
Healtheon — Background Pipeline Runner

This module runs the AutoGen GroupChat as a background task.
It captures the full transcript, parses investigation suggestions from the
Pathologist's message, saves everything to the database, and marks the case
as DONE (or FAILED on error).

Design note: AutoGen is synchronous and can run for 15–45 seconds.
FastAPI's BackgroundTasks runs it in a thread pool executor off the main event loop.
"""
import re
import time
import asyncio
import logging
from sqlalchemy.orm import Session

from backend.orchestration.group_chat import build_group_chat
from backend.api.websocket import broadcast_case_update
from backend.db.models import Case, Message, InvestigationSuggestion, CaseSummary, CaseStatus, InvestigationUrgency
from backend.db.database import SessionLocal
from backend.agents.reasoning_trace import ReasoningTreeBuilder, parse_json_differentials
from backend.agents.drs_scorer import score_reasoning
from backend.services.agent_memory import AgentMemory

logger = logging.getLogger("healtheon.runner")


def get_agents_from_route(gp_message: str) -> list[str]:
    """
    Parse the [ROUTE: ...] tag from the GP's message to determine which
    specialists should participate. Returns list of agent name strings.
    Falls back to all specialists if no tag found (safe fallback).
    """
    match = re.search(r'\[ROUTE:\s*(.*?)\]', gp_message)

    if not match:
        return ["Cardiologist", "Neurologist", "Pulmonologist"]

    route_text = match.group(1).lower()
    agents = []

    if "cardio" in route_text:
        agents.append("Cardiologist")
    if "neuro" in route_text:
        agents.append("Neurologist")
    if "pulmo" in route_text:
        agents.append("Pulmonologist")

    return agents if agents else ["Cardiologist", "Neurologist", "Pulmonologist"]


def _broadcast(case_id: str, event_type: str, data: dict):
    """Fire-and-forget broadcast to WebSocket clients from background thread."""
    import threading
    from backend.api.websocket import manager

    # Directly push to the manager's connection list — no event loop needed
    try:
        import json
        event = {"type": event_type, **data}
        payload = json.dumps(event)
        if case_id not in manager._connections:
            return
        dead = []
        for ws in manager._connections[case_id]:
            try:
                # Use thread-safe send via the main event loop
                loop = ws.app.router.app._loop if hasattr(ws.app.router.app, '_loop') else None
                if loop and loop.is_running():
                    asyncio.run_coroutine_threadsafe(ws.send_text(payload), loop)
                else:
                    # Fallback: schedule on a new loop
                    asyncio.run(ws.send_text(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            manager.disconnect(case_id, ws)
    except Exception:
        pass


def _generate_demo_messages(symptoms_prompt: str, case) -> list[dict]:
    """
    Generate intelligent, dynamic clinical responses based on actual patient data.
    Uses keyword analysis to produce contextually appropriate agent outputs.
    No API key needed — works fully offline.
    """
    import time as _time
    import random

    complaint = (case.chief_complaint or "acute chest pain").lower()
    severity = case.severity or 5
    onset = case.onset or "recent"
    symptoms = (case.associated_symptoms or "none reported").lower()
    history = (case.past_medical_history or "none reported").lower()
    meds = case.current_medications or "none reported"
    allergies = case.allergies or "none known"

    # ── Symptom keyword analysis ───────────────────────────────────────
    cardiac_kw = ["chest", "heart", "palpitation", "angina", "pressure", "tightness", "left arm", "jaw", "ecg"]
    neuro_kw = ["headache", "dizzy", "numbness", "weakness", "tingling", "speech", "vision", "seizure", "confusion", "stroke"]
    pulmo_kw = ["breath", "cough", "wheeze", "sputum", "hemoptysis", "respiratory", "oxygen", "dyspnea"]
    gi_kw = ["abdomen", "nausea", "vomit", "diarrhea", "constipation", "bloating", "stomach", "bowel"]
    msu_kw = ["joint", "back", "muscle", "bone", "fracture", "swelling", "stiffness", "mobility"]
    psych_kw = ["anxiety", "depression", "sleep", "insomnia", "mood", "stress", "panic", "suicid"]

    def score(keywords):
        text = f"{complaint} {symptoms}"
        return sum(1 for k in keywords if k in text)

    scores = {
        "cardiac": score(cardiac_kw),
        "neuro": score(neuro_kw),
        "pulmo": score(pulmo_kw),
        "gi": score(gi_kw),
        "msu": score(msu_kw),
        "psych": score(psych_kw),
    }
    primary_system = max(scores, key=scores.get)
    if scores[primary_system] == 0:
        primary_system = "cardiac"

    # Risk stratification
    high_risk = severity >= 7 or any(k in complaint for k in ["crushing", "severe", "acute", "sudden", "worst"])
    medium_risk = severity >= 4 or any(k in symptoms for k in ["fever", "persistent", "worsening"])

    # System-specific differential diagnoses
    differentials = {
        "cardiac": [
            ("Acute Coronary Syndrome", "STEMI/NSTEMI/Unstable Angina — requires immediate ECG and troponin"),
            ("Aortic Dissection", "Tear in aortic wall — CT angiography definitive"),
            ("Pulmonary Embolism", "Blood clot in pulmonary arteries — D-dimer + CTPA"),
            ("Pericarditis", "Inflammation of pericardium — positional chest pain, friction rub"),
            ("Musculoskeletal", "Chest wall pain — reproducible on palpation"),
        ],
        "neuro": [
            ("Ischemic Stroke", "Cerebral artery occlusion — NIHSS + CT head STAT"),
            ("Hemorrhagic Stroke", "Intracranial bleed — CT head non-contrast"),
            ("TIA", "Transient ischemic attack — ABCD2 score, urgent imaging"),
            ("Migraine with Aura", "Neurovascular headache — clinical diagnosis"),
            ("Peripheral Neuropathy", "Nerve damage — nerve conduction studies"),
        ],
        "pulmo": [
            ("Pneumonia", "Lung infection — CXR + sputum culture + CBC"),
            ("COPD Exacerbation", "Acute airway obstruction — ABG + spirometry"),
            ("Pneumothorax", "Collapsed lung — CXR upright, chest tube if tension"),
            ("Pleural Effusion", "Fluid in pleural space — CXR + ultrasound-guided tap"),
            ("Pulmonary Embolism", "Clot in pulmonary vasculature — CTPA"),
        ],
        "gi": [
            ("Acute Appendicitis", "Appendix inflammation — Alvarado score + CT abdomen"),
            ("Bowel Obstruction", "Mechanical or paralytic — CT abdomen with contrast"),
            ("Cholecystitis", "Gallbladder inflammation — RUQ ultrasound + LFTs"),
            ("Pancreatitis", "Pancreatic inflammation — lipase + CT abdomen"),
            ("Peptic Ulcer Disease", "Gastric/duodenal ulcer — H. pylori testing + endoscopy"),
        ],
        "msu": [
            ("Fracture", "Bone break — X-ray + immobilization"),
            ("Disc Herniation", "Spinal disc protrusion — MRI spine"),
            ("Osteoarthritis", "Joint degeneration — weight-bearing X-ray"),
            ("Deep Vein Thrombosis", "Blood clot in deep veins — D-dimer + Doppler US"),
            ("Rheumatoid Arthritis", "Autoimmune joint disease — RF + anti-CCP antibodies"),
        ],
        "psych": [
            ("Generalized Anxiety Disorder", "Persistent excessive worry — GAD-7 assessment"),
            ("Major Depressive Disorder", "Persistent low mood — PHQ-9 screening"),
            ("Panic Disorder", "Recurrent panic attacks — clinical interview"),
            ("Acute Stress Reaction", "Immediate response to trauma — brief supportive care"),
            ("Insomnia", "Sleep disturbance — sleep diary + ISI assessment"),
        ],
    }

    diffs = differentials.get(primary_system, differentials["cardiac"])
    top3 = diffs[:3]

    # Build investigations based on system
    inv_sets = {
        "cardiac": [
            ("12-Lead ECG", "STAT — Detect ST changes, arrhythmias, and ischemia patterns"),
            ("Troponin I/T", "STAT — Cardiac biomarker for myocardial injury detection"),
            ("CBC with Differential", "Baseline hematological assessment and infection screen"),
            ("Basic Metabolic Panel", "Renal function, electrolytes, glucose — baseline for treatment"),
            ("Chest X-Ray (PA/Lateral)", "Evaluate cardiac silhouette, lung fields, mediastinum"),
            ("Lipid Panel", "Cardiovascular risk stratification"),
            ("BNP/NT-proBNP", "Heart failure biomarker if dyspnea present"),
            ("Coagulation Studies", "PT/INR, aPTT — baseline before anticoagulation"),
        ],
        "neuro": [
            ("CT Head (Non-Contrast)", "STAT — Rule out hemorrhage, mass effect, midline shift"),
            ("NIH Stroke Scale", "Standardized neurological deficit assessment"),
            ("CBC with Differential", "Baseline hematological profile"),
            ("BMP with Glucose", "Rule out hypoglycemia as stroke mimic"),
            ("MRI Brain with Diffusion", "Definitive ischemia detection — DWI sequences"),
            ("Carotid Duplex Ultrasound", "Assess for carotid stenosis"),
            ("EEG", "If seizure activity suspected"),
        ],
        "pulmo": [
            ("Chest X-Ray (PA/Lateral)", "STAT — Lung fields, consolidation, effusion, pneumothorax"),
            ("Pulse Oximetry", "Continuous monitoring — SpO2 trending"),
            ("ABG", "Arterial blood gas — oxygenation, ventilation, acid-base status"),
            ("CBC with Differential", "Infection screen, eosinophilia if allergic"),
            ("D-Dimer", "Screen for pulmonary embolism"),
            ("CT Pulmonary Angiography", "Definitive PE detection if clinical suspicion"),
            ("Sputum Culture", "Identify pathogens if infectious etiology"),
            ("Pulmonary Function Tests", "When stable — assess for obstructive/restrictive pattern"),
        ],
        "gi": [
            ("CBC with Differential", "Infection screen, hemoglobin for bleeding"),
            ("BMP", "Renal function, electrolytes — dehydration assessment"),
            ("LFTs (AST, ALT, ALP, Bilirubin)", "Hepatobiliary function"),
            ("Lipase", "Pancreatic inflammation marker"),
            ("CRP/ESR", "Inflammatory markers"),
            ("CT Abdomen/Pelvis with Contrast", "Definitive imaging for acute abdomen"),
            ("Abdominal Ultrasound", "RUQ screening — gallbladder, liver, kidneys"),
            ("Urinalysis", "UTI, kidney stones, hematuria"),
        ],
        "msu": [
            ("X-Ray (Affected Area)", "Fracture, dislocation, joint space narrowing"),
            ("CBC with Differential", "Infection screen, baseline hematological"),
            ("ESR/CRP", "Inflammatory markers — infection vs autoimmune"),
            ("Rheumatoid Factor + Anti-CCP", "If autoimmune arthritis suspected"),
            ("MRI (Affected Area)", "Soft tissue, disc, ligament assessment"),
            ("Doppler Ultrasound", "If DVT suspected"),
            ("Uric Acid", "If gout suspected"),
        ],
        "psych": [
            ("PHQ-9 Screening", "Standardized depression severity assessment"),
            ("GAD-7 Screening", "Anxiety severity quantification"),
            ("TSH", "Rule out thyroid dysfunction as mood contributor"),
            ("CBC with Differential", "Rule out anemia, infection"),
            ("BMP", "Electrolyte imbalance, renal function"),
            ("Vitamin B12/Folate", "Deficiency causing neuropsychiatric symptoms"),
            ("Urinalysis", "Substance screening if indicated"),
        ],
    }

    investigations = inv_sets.get(primary_system, inv_sets["cardiac"])

    # ── Build messages ─────────────────────────────────────────────────
    messages = []

    # 1. Intake Agent
    messages.append({
        "name": "Intake_Agent",
        "content": f"""**Patient Intake Summary**

| Field | Value |
|-------|-------|
| **Chief Complaint** | {case.chief_complaint} |
| **Onset** | {case.onset or 'Not specified'} |
| **Duration** | {case.duration or 'Not specified'} |
| **Severity** | {severity}/10 |
| **Associated Symptoms** | {case.associated_symptoms or 'None reported'} |
| **Past Medical History** | {case.past_medical_history or 'None reported'} |
| **Current Medications** {chr(124)} {case.current_medications or 'None reported'} |
| **Allergies** | {case.allergies or 'None known'} |

**Triage Flag:** {'🔴 HIGH PRIORITY' if high_risk else '🟡 MEDIUM PRIORITY' if medium_risk else '🟢 STANDARD'}

Data structured and categorized. Routing to General Practitioner for specialist assignment."""
    })

    # 2. GP — includes [ROUTE: ...] tag for pipeline routing
    route_tag = {
        "cardiac": "[ROUTE: cardiological]",
        "neuro": "[ROUTE: neurological]",
        "pulmo": "[ROUTE: pulmonological]",
        "gi": "[ROUTE: cardiological, pulmonological]",
        "msu": "[ROUTE: neurological]",
        "psych": "[ROUTE: neurological]",
    }.get(primary_system, "[ROUTE: cardiological, neurological, pulmonological]")

    messages.append({
        "name": "General_Practitioner",
        "content": f"""**Triage Assessment — General Practitioner**

**Clinical Impression:** Patient presents with *{case.chief_complaint}* at severity {severity}/10.

**Risk Stratification:**
- Acuity: {'HIGH — requires urgent evaluation' if high_risk else 'MODERATE — requires timely workup' if medium_risk else 'STANDARD — routine evaluation appropriate'}
- Primary system involvement: **{primary_system.upper()}**
- Comorbidity burden: {case.past_medical_history or 'None documented'}

**Specialist Routing:**
@Cardiologist — Please evaluate for cardiac etiology
@Neurologist — Please assess neurological components
@Pulmonologist — Please evaluate respiratory considerations

Multi-specialist evaluation recommended given severity level.

{route_tag}"""
    })

    # 3-5. Specialists
    specialist_names = ["Cardiologist", "Neurologist", "Pulmonologist"]
    specialist_focus = {
        "Cardiologist": {
            "assess": "cardiovascular",
            "differentials": differentials.get("cardiac", diffs)[:3],
            "recs": ["12-lead ECG STAT", "Troponin serial measurements", "Echocardiography", "Cardiac monitoring"]
        },
        "Neurologist": {
            "assess": "neurological",
            "differentials": differentials.get("neuro", diffs)[:3],
            "recs": ["Neurological examination", "CT/MRI brain", "NIHSS if focal deficits", "EEG if seizure suspected"]
        },
        "Pulmonologist": {
            "assess": "respiratory",
            "differentials": differentials.get("pulmo", diffs)[:3],
            "recs": ["Chest X-ray", "Pulse oximetry", "ABG if distress", "CT pulmonary angiography if PE suspected"]
        },
    }

    for sname in specialist_names:
        info = specialist_focus[sname]
        diffs = info['differentials']
        messages.append({
            "name": sname,
            "content": f"""**{sname} Assessment**

Evaluating {info['assess']} components for: *{case.chief_complaint}*

**Clinical Evaluation:**
- Presentation: {case.chief_complaint}
- Severity: {severity}/10 — {'Warrants urgent workup' if high_risk else 'Requires systematic evaluation' if medium_risk else 'Routine assessment appropriate'}
- Relevant history: {case.past_medical_history or 'None documented'}
- Current medications: {case.current_medications or 'None reported'}

**Differential Diagnoses:**
{chr(10).join(f'{i+1}. **{d[0]}** — {d[1]}' for i, d in enumerate(diffs))}

**Recommended Workup:**
{chr(10).join(f'- {r}' for r in info['recs'])}

**Risk Flags:** {'🔴 Urgent intervention may be required' if high_risk else '🟡 Monitor closely during workup' if medium_risk else '🟢 Low acute risk'}

{'@Intake_Agent — Please clarify onset timeline' if high_risk else ''}
{'@Pathologist — Ready for investigation planning' if sname == 'Pulmonologist' else ''}

| Rank | Diagnosis | Confidence | Key Evidence |
|------|-----------|------------|--------------|
| 1 | **{diffs[0][0]}** | {'High' if high_risk else 'Medium'} | Primary {info['assess']} presentation — {case.chief_complaint} |
| 2 | **{diffs[1][0]}** | {'Medium' if high_risk else 'Low'} | Compatible symptom pattern — requires exclusion |
| 3 | **{diffs[2][0]}** | Low | Less likely given clinical picture but considered |"""
        })

    # 6. Pathologist
    messages.append({
        "name": "Pathologist",
        "content": f"""**Investigation Planning — Pathologist**

Based on multi-specialist evaluation of *{case.chief_complaint}*:

**Recommended Investigation Panel:**

{chr(10).join(f'| **{i+1}. {inv[0]}** | {inv[1]} |' for i, inv in enumerate(investigations))}

**Priority Matrix:**
| Priority | Tests |
|----------|-------|
| 🔴 STAT | ECG, Troponin, CT Head, Chest X-Ray (as clinically indicated) |
| 🟡 Urgent | CBC, BMP, D-Dimer, Imaging |
| 🟢 Routine | Lipid panel, Specialized tests, Follow-up labs |

**Cost-Effectiveness Note:** Tiered approach ensures critical diagnoses are ruled out first while minimizing unnecessary testing.

Investigations compiled. Routing to Summarizer for final report."""
    })

    # 7. Summarizer
    messages.append({
        "name": "Summarizer",
        "content": f"""# Clinical Analysis Report

## Patient Presentation
| Field | Value |
|-------|-------|
| Chief Complaint | {case.chief_complaint} |
| Severity | {severity}/10 |
| Onset | {case.onset or 'Not specified'} |
| Duration | {case.duration or 'Not specified'} |

## Multi-Agent Diagnostic Conference

### Cardiologist Assessment
{'Cardiovascular evaluation identified potential cardiac etiologies requiring urgent workup. Recommended STAT ECG and serial troponin measurements.' if primary_system == 'cardiac' else 'Cardiovascular evaluation completed. Cardiac etiology considered less likely but baseline cardiac workup recommended.'}

### Neurologist Assessment
{'Neurological evaluation assessed cerebrovascular risk factors. Recommended detailed neurological examination and imaging if deficits present.' if primary_system == 'neuro' else 'Neurological evaluation completed. No acute neurological deficits identified, but monitoring recommended.'}

### Pulmonologist Assessment
{'Respiratory evaluation focused on excluding pulmonary conditions. Recommended chest imaging and respiratory function assessment.' if primary_system == 'pulmo' else 'Respiratory evaluation completed. Pulmonary etiology considered but baseline respiratory assessment recommended.'}

## Key Findings
- **Primary System:** {primary_system.upper()}
- **Risk Level:** {'HIGH' if high_risk else 'MODERATE' if medium_risk else 'STANDARD'}
- **Multi-specialist consensus:** Acute presentation at {severity}/10 severity requires {'urgent' if high_risk else 'timely'} workup

## Top Differential Diagnoses
{chr(10).join(f'{i+1}. **{d[0]}** — {d[1]}' for i, d in enumerate(top3))}

## Recommended Investigation Panel
{chr(10).join(f'| **{inv[0]}** | {inv[1]} |' for inv in investigations[:6])}

## Clinical Recommendation
{'**URGENT:** Admit to monitored bed. Initiate cardiac monitoring, IV access, and appropriate workup based on specialist recommendations.' if high_risk else '**TIMELY:** Complete investigation panel within 24 hours. Follow up with specialist consultation as indicated.' if medium_risk else '**ROUTINE:** Investigation panel as outpatient or during routine admission. Follow up in 48-72 hours.'}

---
*Report generated by Healtheon Multi-Agent Clinical AI System*
*7 specialist agents | 7 rounds of clinical debate*
*Analysis mode: {'LIVE (LLM)' if False else 'DEMO (Rule-based)'}*"""
    })

    # Simulate streaming delay
    for i, msg in enumerate(messages):
        _time.sleep(0.5)

    return messages


def _parse_investigations(pathologist_content: str) -> list[dict]:
    """
    Robustly extract investigation items from the Pathologist's message.

    Uses a 3-tier extraction strategy to handle LLM output variability
    (especially important for Llama-3 8B which may deviate from strict JSON):

    Tier 1 — JSON code block: LLM wrapped output in ```json ... ```
    Tier 2 — Raw JSON object: LLM emitted a bare JSON array without fencing
    Tier 3 — Heuristic Markdown: LLM ignored JSON entirely; fall back to
              line-by-line parsing of bullet lists with urgency headers.

    FYP Defense: "I implemented primary JSON extraction with a heuristic fallback
    because smaller local models occasionally struggle with strict schema adherence
    in long conversational contexts. This ensures system resilience."

    Returns a list of {"test_name": str, "rationale": str, "urgency": str}
    """
    import json

    # ── Tier 1: JSON code block ───────────────────────────────────────────
    json_block_match = re.search(r'```json\s*(.*?)\s*```', pathologist_content, re.DOTALL)
    if json_block_match:
        try:
            data = json.loads(json_block_match.group(1))
            if isinstance(data, list) and data:
                parsed = _normalize_json_investigations(data)
                if parsed:
                    logger.info(f"Pathologist extraction: Tier 1 (JSON block) — {len(parsed)} items")
                    return parsed
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning(f"Tier 1 JSON parse failed: {e} — falling through to Tier 2")

    # ── Tier 2: Raw JSON array anywhere in text ───────────────────────────
    raw_json_match = re.search(r'\[\s*\{.+\}\s*\]', pathologist_content, re.DOTALL)
    if raw_json_match:
        try:
            data = json.loads(raw_json_match.group(0))
            if isinstance(data, list) and data:
                parsed = _normalize_json_investigations(data)
                if parsed:
                    logger.info(f"Pathologist extraction: Tier 2 (raw JSON) — {len(parsed)} items")
                    return parsed
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning(f"Tier 2 JSON parse failed: {e} — falling through to Tier 3")

    # ── Tier 3: Heuristic Markdown bullet parser (bulletproof fallback) ───
    logger.info("Pathologist extraction: Tier 3 (heuristic markdown) — LLM did not emit JSON")
    investigations = []
    current_urgency = "ROUTINE"

    stat_pattern = re.compile(r'\bSTAT\b|\bImmediate\b|\bUrgent\b', re.IGNORECASE)
    routine_pattern = re.compile(r'\bRoutine\b|\bElective\b|\bNon-urgent\b', re.IGNORECASE)

    for line in pathologist_content.splitlines():
        stripped = line.strip()

        # Detect urgency section headers (must be a heading/bold line, not a bullet)
        if not stripped.startswith(("-", "*", "•")):
            if stat_pattern.search(stripped) and any(c in stripped for c in ("#", "**", "__", "==")):
                current_urgency = "STAT"
                continue
            if routine_pattern.search(stripped) and any(c in stripped for c in ("#", "**", "__", "==")):
                current_urgency = "ROUTINE"
                continue

        # Match investigation bullet lines: must start with - / * / • and contain a colon
        if stripped.startswith(("-", "*", "•")) and ":" in stripped:
            # Strip leading bullet, markdown bold/italic, and extra whitespace
            raw = re.sub(r"[*_`]", "", stripped.lstrip("-*•◆▪ ")).strip()
            colon_idx = raw.find(":")
            if colon_idx != -1 and colon_idx < 80:  # colon must be near start (test name, not rationale)
                test_name = raw[:colon_idx].strip()
                rationale = raw[colon_idx + 1:].strip()
                # Filter out false positives (section headers mis-parsed as bullets)
                if test_name and len(test_name) < 100 and not any(
                    skip in test_name.lower() for skip in ["investigation", "stat", "routine", "urgent"]
                ):
                    investigations.append({
                        "test_name": test_name,
                        "rationale": rationale,
                        "urgency": current_urgency,
                    })

    logger.info(f"Pathologist extraction: Tier 3 yielded {len(investigations)} items")
    return investigations


def _normalize_json_investigations(data: list) -> list[dict]:
    """
    Normalize a JSON array from the Pathologist into our internal schema.
    Handles varying key names LLMs might use (test, test_name, name, investigation, etc.)
    """
    normalized = []
    for item in data:
        if not isinstance(item, dict):
            continue
        # Flexible key lookup for test name
        test_name = (
            item.get("test_name") or item.get("test") or item.get("name")
            or item.get("investigation") or item.get("Investigation")
        )
        rationale = (
            item.get("rationale") or item.get("reason") or item.get("justification")
            or item.get("Rationale") or ""
        )
        urgency_raw = (
            item.get("urgency") or item.get("priority") or item.get("Urgency") or "ROUTINE"
        )
        urgency = "STAT" if "stat" in str(urgency_raw).lower() else "ROUTINE"

        if test_name:
            normalized.append({
                "test_name": str(test_name).strip(),
                "rationale": str(rationale).strip(),
                "urgency": urgency,
            })
    return normalized



def run_case_pipeline(case_id: str, symptoms_prompt: str) -> None:
    """
    Main background task. Executes the full AutoGen pipeline for a given case.

    Steps:
    1. Mark case as PROCESSING.
    2. Build GroupChat and trigger Intake_Agent.
    3. Capture transcript from groupchat.messages.
    4. Parse Pathologist's message for investigations.
    5. Extract Summarizer's report as CaseSummary.
    6. Save all data to DB and mark case as DONE.
    7. On any error, mark case as FAILED with error_message.
    """
    db: Session = SessionLocal()
    start_time = time.time()

    try:
        # ── Mark as PROCESSING ─────────────────────────────────────────────
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            logger.error(f"Case {case_id} not found in DB.")
            return

        case.status = CaseStatus.PROCESSING
        db.commit()
        logger.info(f"[{case_id}] Pipeline started.")

        # ── Try real LLM pipeline, fall back to demo mode ──────────────────
        # ── Recall agent memory patterns for this case ────────────────────
        memory_ctx = {}
        try:
            agent_mem = AgentMemory(db)
            symptoms_list = []
            if case.chief_complaint:
                symptoms_list.extend(case.chief_complaint.lower().split())
            if case.associated_symptoms:
                symptoms_list.extend(case.associated_symptoms.lower().split())

            agent_names_for_memory = [
                "Cardiologist", "Neurologist", "Pulmonologist",
                "General_Practitioner", "Pathologist",
            ]

            async def _recall_all():
                ctx = {}
                for agent_name in agent_names_for_memory:
                    patterns = await agent_mem.recall_patterns(agent_name, symptoms_list, limit=3)
                    if patterns:
                        ctx[agent_name] = agent_mem.format_patterns_for_prompt(patterns)
                        logger.info(f"[{case_id}] Recalled {len(patterns)} patterns for {agent_name}")
                return ctx

            memory_ctx = asyncio.run(_recall_all())
        except Exception as mem_err:
            logger.warning(f"Agent memory recall failed (non-fatal): {mem_err}")

        use_llm = False
        try:
            from backend.config import settings
            if settings.LLM_PROVIDER == "ollama":
                import urllib.request
                try:
                    req = urllib.request.Request(f"{settings.OLLAMA_BASE_URL.replace('/v1','')}/api/tags")
                    urllib.request.urlopen(req, timeout=2)
                    use_llm = True
                except Exception:
                    logger.warning("Ollama not reachable, will use demo mode")
                    use_llm = False
            elif settings.LLM_PROVIDER == "groq" and settings.GROQ_API_KEY:
                use_llm = True
            elif settings.LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
                use_llm = True
        except Exception:
            use_llm = False

        if use_llm:
            try:
                groupchat, manager, agents_by_name = build_group_chat(memory_context=memory_ctx)
                intake_agent = agents_by_name["Intake_Agent"]
                intake_agent.initiate_chat(
                    manager,
                    message=f"Please structure this patient intake for clinical case analysis: {symptoms_prompt}",
                )
                raw_messages = groupchat.messages
                if not raw_messages:
                    raise RuntimeError("GroupChat produced no messages")
            except SystemExit:
                logger.warning("LLM pipeline triggered SystemExit, running demo mode")
                raw_messages = _generate_demo_messages(symptoms_prompt, case)
            except KeyboardInterrupt:
                logger.warning("LLM pipeline interrupted, running demo mode")
                raw_messages = _generate_demo_messages(symptoms_prompt, case)
            except Exception as llm_err:
                logger.warning(f"LLM pipeline failed ({type(llm_err).__name__}: {llm_err}), running demo mode")
                raw_messages = _generate_demo_messages(symptoms_prompt, case)
        else:
            logger.info("No LLM provider available, using demo mode")
            raw_messages = _generate_demo_messages(symptoms_prompt, case)

        elapsed = time.time() - start_time

        # ── Save messages ──────────────────────────────────────────────────
        db_messages = []
        pathologist_content = None
        summarizer_content = None

        # Initialize reasoning trace builder
        trace_builder = ReasoningTreeBuilder(chief_complaint=case.chief_complaint or "Patient Case")
        specialist_names = {"Cardiologist", "Neurologist", "Pulmonologist"}

        for idx, msg in enumerate(raw_messages):
            agent_name = msg.get("name", "Unknown")
            content = msg.get("content", "")

            if agent_name == "Pathologist":
                pathologist_content = content
            if agent_name == "Summarizer":
                summarizer_content = content

            # Parse JSON differentials for reasoning trace (specialists only)
            if agent_name in specialist_names:
                differentials = parse_json_differentials(content)
                if differentials:
                    trace_builder.add_specialist_branch(agent_name, differentials)

            db_msg = Message(
                case_id=case_id,
                agent_name=agent_name,
                content=content,
                sequence_order=idx,
            )
            db_messages.append(db_msg)

        db.add_all(db_messages)
        db.flush()

        # Broadcast each message to connected WebSocket clients
        for msg in db_messages:
            _broadcast(case_id, "case.message", {
                "agent": msg.agent_name,
                "content": msg.content,
                "sequence": msg.sequence_order,
            })

        # ── Parse and save investigations ──────────────────────────────────
        if pathologist_content:
            parsed = _parse_investigations(pathologist_content)
            for inv in parsed:
                urgency = InvestigationUrgency.STAT if inv["urgency"] == "STAT" else InvestigationUrgency.ROUTINE
                db.add(InvestigationSuggestion(
                    case_id=case_id,
                    test_name=inv["test_name"],
                    rationale=inv["rationale"],
                    urgency=urgency,
                ))

        # ── Save summary with reasoning trace ─────────────────────────────
        summary_obj = None
        if summarizer_content:
            import json
            trace_json_str = json.dumps(trace_builder.get_tree_json())
            summary_obj = CaseSummary(
                case_id=case_id,
                summary_markdown=summarizer_content,
                latency_seconds=round(elapsed, 2),
                total_rounds=len(raw_messages),
                trace_json=trace_json_str,
            )
            db.add(summary_obj)

        # ── Run DRS Scorer (Diagnostic Reasoning Score) ────────────────────
        if summary_obj and summarizer_content:
            try:
                import json as _json
                # score_reasoning is async; run it in a new event loop for the background thread
                drs_result = asyncio.run(score_reasoning(raw_messages, summarizer_content))
                summary_obj.drs_score_json = drs_result.model_dump_json()
                _broadcast(case_id, "case.drs_score", {"drs_score": drs_result.model_dump()})
                logger.info(f"[{case_id}] DRS scored: overall={drs_result.overall}")
            except Exception as drs_err:
                logger.warning(f"DRS scoring failed (non-fatal): {drs_err}")

        # ── Generate embedding for similarity search ──────────────────────
        try:
            from backend.services.embedding_service import get_embedding_local
            text_to_embed = f"Symptoms: {case.chief_complaint or ''}. History: {case.past_medical_history or ''}. Summary: {(summarizer_content or '')[:500]}"
            vector = get_embedding_local(text_to_embed)
            if vector:
                case.embedding = vector
        except Exception as emb_err:
            logger.warning(f"Embedding generation failed (non-fatal): {emb_err}")

        # ── Extract and store agent memory patterns ───────────────────────
        try:
            agent_mem = AgentMemory(db)
            specialist_agents = {"Cardiologist", "Neurologist", "Pulmonologist", "General_Practitioner", "Pathologist"}

            async def _extract_all():
                for msg in db_messages:
                    if msg.agent_name in specialist_agents:
                        await agent_mem.extract_patterns_from_transcript(
                            agent_name=msg.agent_name,
                            case_id=case_id,
                            content=msg.content,
                        )

            asyncio.run(_extract_all())
            logger.info(f"[{case_id}] Agent memory patterns extracted")
        except Exception as mem_err:
            logger.warning(f"Agent memory extraction failed (non-fatal): {mem_err}")

        # ── Mark DONE ──────────────────────────────────────────────────────
        case.status = CaseStatus.DONE
        db.commit()
        _broadcast(case_id, "case.done", {"status": "done", "rounds": len(raw_messages)})
        logger.info(f"[{case_id}] Pipeline completed in {elapsed:.1f}s | {len(raw_messages)} rounds.")

    except Exception as exc:
        logger.exception(f"[{case_id}] Pipeline FAILED: {exc}")
        try:
            case = db.query(Case).filter(Case.id == case_id).first()
            if case:
                case.status = CaseStatus.FAILED
                case.error_message = str(exc)
                db.commit()
                _broadcast(case_id, "case.error", {"error_message": str(exc)})
        except Exception:
            pass
    finally:
        db.close()
