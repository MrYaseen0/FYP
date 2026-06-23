# 📚 Healtheon — Complete UI & Project Documentation

## 🎯 Project Overview

**Healtheon** is an educational proof-of-concept multi-agent AI medical analysis system built as a university Final Year Project (FYP). It demonstrates how multiple AI agents can collaborate to analyze patient cases through clinical reasoning.

### ⚠️ Critical Disclaimer
- **Educational purposes only** — NOT a medical device
- **No medical advice** — for demonstration of AI orchestration techniques
- **Synthetic data only** — no real patient information stored
- **Not for clinical use** — always consult qualified healthcare professionals

### Tech Stack
| Component | Technology |
|-----------|-----------|
| **Backend** | FastAPI (Python 3.11+) |
| **Frontend** | React 19 + Vite |
| **Database** | SQLite (SQLAlchemy ORM) |
| **AI Orchestration** | Microsoft AutoGen (pyautogen) |
| **LLM Options** | OpenAI GPT-4o-mini or Ollama Llama-3 |

---

## 📑 Table of Contents
1. [System Architecture](#system-architecture)
2. [UI Pages Guide](#ui-pages-guide)
   - [Dashboard](#dashboard--home)
   - [Patient Form](#patient-form--submit)
   - [Case Detail](#case-detail--casescaseid)
   - [Patient Record](#patient-record--record)
   - [System Orchestration](#system-orchestration--orchestration)
   - [Agent Fleet](#agent-fleet--fleet)
   - [Case Analytics](#case-analytics--analytics)
3. [Data Flow & APIs](#data-flow--apis)
4. [Component Architecture](#component-architecture)
5. [Design System](#design-system)
6. [User Workflows](#user-workflows)
| **Styling** | Tailwind CSS + Vanilla CSS |

---

## 🏗️ System Architecture

### High-Level Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                     PATIENT CASE SUBMISSION                      │
│                    (Frontend: PatientForm)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                   MULTI-AGENT PIPELINE                           │
│                                                                  │
│  Intake → GP → Specialists ↔ Specialists → Pathologist → Summary │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│              CASE DETAIL VIEW & MONITORING                       │
│                   (Frontend: CaseDetail)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Pipeline Order
1. **Intake Agent** — Structures symptoms, takes patient history
2. **General Practitioner (GP)** — Triages and routes to appropriate specialists
3. **Specialists** (Cardiologist, Neurologist, Pulmonologist) — Debate for 3 turns max
4. **Pathologist** — Compiles investigation recommendations
5. **Summarizer** — Generates final educational report

---

## 📱 Frontend Pages & Functionality

### 1. **Dashboard** (`/`)
**Purpose:** Overview of all submitted cases and system status

#### Layout & Components:
```
┌────────────────────────────────────────────────────────────┐
│  Page Title: "Clinical Orchestration"                      │
│  Subtitle: "X cases · Y active"                           │
├────────────────────────────────────────────────────────────┤
│ [⬇ Load Demo Case] [＋ New Case]                         │
├────────────────────────────────────────────────────────────┤
│  HEALTHEON OS v2.0.4 ACTIVE                              │
│  Total: 10 | Processing: 2 | Completed: 7 | Failed: 1   │
├────────────────────────────────────────────────────────────┤
│  CASE CARDS GRID:                                         │
│  ┌─────────────────────────┐  ┌─────────────────────────┐ │
│  │ #HLT-A1B2C3            │  │ #HLT-D4E5F6            │ │
│  │ Crushing chest pain...  │  │ Severe headache...      │ │
│  │ Pending (3 hrs ago)     │  │ Done (2 hrs ago)        │ │
│  └─────────────────────────┘  └─────────────────────────┘ │
│  ┌─────────────────────────┐  ┌─────────────────────────┐ │
│  │ [more cards...]         │  │ [more cards...]         │ │
│  └─────────────────────────┘  └─────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

#### Key Features:
- **Live System Status:** Shows "HEALTHEON OS" with version, status indicators
- **Case Statistics:** Real-time counts of total, processing, completed, failed cases
- **Case Cards:** Grid of all cases with:
  - Case ID (formatted as #HLT-XXXXXX)
  - Chief complaint (patient's primary symptom)
  - Onset info & severity (e.g., "🕒 2 hours ago" "⚡ 7/10")
  - Status badge (Pending/Processing/Done/Failed)
  - Timestamp when created
- **Quick Actions:**
  - "Load Demo Case" — Pre-fills form with synthetic case
  - "New Case" — Navigate to PatientForm page
- **Live Monitoring Badge:** Shows when cases are actively processing
- **Error Display:** Shows if backend is unreachable
- **Empty State:** Shows prompt if no cases exist

#### Data Flow:
1. Page loads → fetches list of all cases from `/api/cases`
2. Auto-refreshes every 5 seconds to show updated statuses
3. Clicking a case card navigates to CaseDetail page with case ID

---

### 2. **Patient Form / New Case Submission** (`/submit`)
**Purpose:** Submit a new patient case to trigger the multi-agent pipeline

#### Layout & Components:
```
┌────────────────────────────────────────────────────────────┐
│  Page Title: "New Case Submission"                         │
│  Page Sub: "All data is synthetic — educational only."     │
│                            [← Back]                        │
├────────────────────────────────────────────────────────────┤
│  ⚠ DISCLAIMER BOX (Educational Proof-of-Concept)         │
│    "This system does not provide medical advice..."        │
├────────────────────────────────────────────────────────────┤
│  FORM CARD:                                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Patient Presentation                               │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │  Chief Complaint * [__________________________________] │ │
│  │                                                      │ │
│  │  [Onset]              [Duration]                     │ │
│  │  [_________________] [_________________]             │ │
│  │                                                      │ │
│  │  Severity: 5 / 10   [========o========]             │ │
│  │            ↑         Mild(1) Moderate(5) Severe(10) │ │
│  │                                                      │ │
│  │  Associated Symptoms                                │ │
│  │  [________________________________________________]   │ │
│  │                                                      │ │
│  │  [Past Medical History]  [Current Medications]       │ │
│  │  [__________________]   [__________________]         │ │
│  │                                                      │ │
│  │  Allergies [___________________________]             │ │
│  │                                                      │ │
│  │  [▶ Launch Agent Pipeline] [Clear]                  │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

#### Form Fields:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Chief Complaint | Text | ✓ | Main symptom (min 3 chars, max 500) |
| Onset | Text | | When symptoms started (e.g., "2 hours ago") |
| Duration | Text | | How long symptoms persist (e.g., "Ongoing") |
| Severity | Slider | | 1-10 scale with visual feedback |
| Associated Symptoms | Textarea | | Related symptoms |
| Past Medical History | Textarea | | Previous conditions (e.g., "Hypertension, T2DM") |
| Current Medications | Textarea | | Active medications (e.g., "Metformin 500mg BD") |
| Allergies | Text | | Known allergies |

#### Key Features:
- **Severity Slider:** Visual feedback with color indicators
- **Disclaimer Banner:** Emphasizes educational nature
- **Error Validation:** Shows field errors before submission
- **Pre-fill Support:** Can receive demo data from Dashboard
- **Submission Feedback:** Loading state while pipeline starts
- **Auto-redirect:** After successful submission, redirects to CaseDetail page

#### Data Flow:
1. User fills form with patient presentation
2. Click "Launch Agent Pipeline" button
3. Frontend validates required fields
4. Sends POST to `/api/cases` with form data
5. Backend creates case, returns `case_id`
6. Frontend navigates to `/cases/{case_id}`

---

### 3. **Case Detail & Agent Monitoring** (`/cases/:caseId`)
**Purpose:** Real-time monitoring of agent conversation and pipeline progress

#### Layout (Pending/Processing State):
```
┌────────────────────────────────────────────────────────────┐
│  [← Back] Case #HLT-XXXXXX  Status: PROCESSING            │
│  Chief Complaint: "Crushing chest pain radiating left arm"│
├────────────────────────────────────────────────────────────┤
│  SYNTHETIC VITALS                                          │
│  ┌───────────────┬──────────────┬───────────┐             │
│  │ HR: 102 bpm   │ BP: 155/88   │ SpO2: 96% │             │
│  └───────────────┴──────────────┴───────────┘             │
├────────────────────────────────────────────────────────────┤
│  AGENT CONVERSATION TRANSCRIPT                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  🔵 IA: Intake Agent (T-45s)                        │ │
│  │  "I have reviewed the patient presentation..."        │ │
│  │                                                        │ │
│  │  🟢 GP: General Practitioner (T-38s)                │ │
│  │  "This case suggests acute coronary syndrome..."      │ │
│  │                                                        │ │
│  │  🔴 CA: Cardiologist (T-32s)                       │ │
│  │  "The presentation is highly suggestive of..."       │ │
│  │                                                        │ │
│  │  ⏳ Neurologist is thinking...                       │ │
│  │  Assessing neurological picture…                      │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│  ⏸ Awaiting Agent Response...                            │
└────────────────────────────────────────────────────────────┘
```

#### Layout (Completed State):
```
┌────────────────────────────────────────────────────────────┐
│  [← Back] Case #HLT-XXXXXX  Status: DONE ✓               │
│  Chief Complaint: "Crushing chest pain..."                │
│  Completed in: 3 min 45s | 11 agent turns                │
├────────────────────────────────────────────────────────────┤
│  SYNTHETIC VITALS                                          │
│  ┌───────────────┬──────────────┬───────────┐             │
│  │ HR: 102 bpm   │ BP: 155/88   │ SpO2: 96% │             │
│  └───────────────┴──────────────┴───────────┘             │
├────────────────────────────────────────────────────────────┤
│  FULL AGENT TRANSCRIPT [Collapsible sections]             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🔵 Intake Agent                                       │ │
│  │ "Structured patient symptoms and history..."          │ │
│  │                                                        │ │
│  │ 🟢 General Practitioner                              │ │
│  │ "Primary differential: Acute Coronary Syndrome..."    │ │
│  │                                                        │ │
│  │ [← show more]                                         │ │
│  │                                                        │ │
│  │ 🟡 Summarizer - Final Report                         │ │
│  │ ╔════════════════════════════════════════════════╗    │ │
│  │ ║ # Case Summary                                 ║    │ │
│  │ ║ ## Differential Diagnosis                      ║    │ │
│  │ ║ 1. Acute Coronary Syndrome (ACS) — Primary   ║    │ │
│  │ ║ 2. Aortic Dissection — Excluded               ║    │ │
│  │ ║ 3. Tension Pneumothorax — Excluded            ║    │ │
│  │ ║                                                ║    │ │
│  │ ║ ## Recommended Investigations (STAT)           ║    │ │
│  │ ║ - 12-lead ECG                                  ║    │ │
│  │ ║ - High-sensitivity troponin                    ║    │ │
│  │ ║ - Chest X-ray                                  ║    │ │
│  │ ╚════════════════════════════════════════════════╝    │ │
│  │                                                        │ │
│  │ [Download Report as PDF] [Copy to Clipboard]          │ │
│  └────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│  INVESTIGATION SUGGESTIONS                                │
│  ┌─────────────────────┬──────────┐                       │
│  │ Test Name           │ Urgency  │                       │
│  ├─────────────────────┼──────────┤                       │
│  │ 12-lead ECG         │ STAT     │                       │
│  │ Troponin (hsTn)     │ STAT     │                       │
│  │ Chest X-ray         │ STAT     │                       │
│  │ CBC                 │ ROUTINE  │                       │
│  └─────────────────────┴──────────┘                       │
│                                                            │
│  [⟳ Re-run Pipeline] [✓ Approve & Close]                 │
└────────────────────────────────────────────────────────────┘
```

#### Key Features:

**Processing State:**
- Shows "Thinking Log" with simulated agent steps (helps UX feel responsive)
  - Intake: "Structuring patient symptoms..."
  - GP: "Triaging — identifying red flags..."
  - Specialists: Agent-specific thinking steps
  - Summarizer: "Generating final educational report..."
- Real transcript appears as messages arrive from backend
- Auto-scrolls to latest message
- Polls backend every 4 seconds for updates

**Completed State:**
- Shows full multi-turn transcript with all agent messages
- Each message labeled with agent name, role, color indicator
- Final Markdown summary rendered as formatted report
- Investigation suggestions in table format with urgency levels
- Metrics display: total time, total agent turns
- Action buttons: Re-run pipeline, Approve & Close

**Synthetic Vitals:**
- Algorithmically generated based on case severity
- Visual indicators for normal/abnormal ranges
- Updates during processing to show "evolution"

**Agent Indicators:**
- Color-coded dots for each agent role
- Order follows clinical pipeline
- Completed agents ✓, current agent animates

#### Data Flow:
1. URL parameter `caseId` loaded
2. Frontend fetches `/api/cases/{caseId}` immediately
3. If status is "processing" or "pending":
   - Shows thinking log with timed steps
   - Polls backend every 4 seconds
   - Real messages inserted as they arrive
4. When status becomes "done" or "failed":
   - Stops polling
   - Shows full transcript + summary
5. User can re-run failed cases with re-run button

---

### 4. **System Orchestration** (`/orchestration`)
**Purpose:** Visualize and explain the multi-agent orchestration architecture

#### Expected Layout:
```
┌────────────────────────────────────────────────────────────┐
│  System Orchestration Diagram                              │
│                                                            │
│  ┌──────────────┐                                         │
│  │ Patient Form │                                         │
│  └───────┬──────┘                                         │
│          │                                                │
│  ┌───────▼──────────┐                                     │
│  │  Intake Agent    │ ← Structures symptoms              │
│  └───────┬──────────┘                                     │
│          │                                                │
│  ┌───────▼──────────────────┐                             │
│  │  GP Agent (Triage)       │ ← Routes to specialists    │
│  └───────┬──────────────────┘                             │
│          │                                                │
│  ┌───────▼──────────────────────────────────┐             │
│  │  Specialist Debate (3 turns max)         │             │
│  │  ├─ Cardiologist                         │             │
│  │  ├─ Neurologist                          │             │
│  │  └─ Pulmonologist                        │             │
│  └───────┬──────────────────────────────────┘             │
│          │                                                │
│  ┌───────▼──────────┐                                     │
│  │ Pathologist      │ ← Compiles investigations         │
│  └───────┬──────────┘                                     │
│          │                                                │
│  ┌───────▼──────────┐                                     │
│  │ Summarizer       │ ← Final report                     │
│  └──────────────────┘                                     │
│                                                            │
│  Design Decisions:                                        │
│  - Temperature 0.2: Reduces hallucinations               │
│  - Max 12 rounds: Hard circuit-breaker                   │
│  - Prompt isolation: Each agent bounded role             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### Key Components:
- Workflow diagram showing agent pipeline order
- Each agent box shows role/responsibility
- Design decision explanations
- Links to agent configuration pages

---

### 5. **Agent Fleet Configuration** (`/fleet`)
**Purpose:** Manage and configure individual agent parameters

#### Layout:
```
┌────────────────────────────────────────────────────────────┐
│  Agent Fleet Configuration                                │
│  Manage autonomous medical analysis nodes                  │
│                         [History] [＋ New Agent]           │
├────────────────────────────────────────────────────────────┤
│  ACTIVE FLEET (3 nodes online)                            │
│                                                            │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │ 🩺 General Pract.    │  │ 🧬 Path. Diagnostic  │       │
│  │ ID: AGT-GP-01        │  │ ID: AGT-PTH-04       │       │
│  │ Role: Orchestrator   │  │ Role: Specialist     │       │
│  │ Model: Llama-3-8B ✓  │  │ Model: Llama-3-8B ✓  │       │
│  │ Status: ONLINE       │  │ Status: ONLINE       │       │
│  │                      │  │                      │       │
│  │ [Config] [⋮]        │  │ [Config] [⋮]        │       │
│  └──────────────────────┘  └──────────────────────┘       │
│                                                            │
│  ┌──────────────────────┐                                 │
│  │ 💊 Treatment Planner │                                 │
│  │ ID: AGT-TPL-06       │                                 │
│  │ ...                  │                                 │
│  └──────────────────────┘                                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### Key Features:
- Agent cards showing:
  - Agent name & ID
  - Role type (Orchestrator/Specialist)
  - Model engine (Llama-3-8B, etc.)
  - Status (Online/Offline/Error)
- Configuration buttons for each agent
- Version history access

---

### 6. **Agent Lab** (`/lab`)
**Purpose:** Test & debug individual agents in isolation

#### Expected Layout:
```
┌────────────────────────────────────────────────────────────┐
│  Agent Lab — Test & Debug                                  │
│                                                            │
│  [Select Agent: ▼ GP_Agent]                               │
│                                                            │
│  INPUT MESSAGE:                                            │
│  [________________________________]                       │
│  [Send Test Message]                                      │
│                                                            │
│  RESPONSE:                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Agent response appears here...                         │ │
│  │ With token count, latency metrics                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                            │
│  LOGS:                                                    │
│  [show debug output]                                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### 7. **Case Analytics** (`/analytics`)
**Purpose:** Analyze patterns across completed cases

#### Expected Metrics:
- Cases by status distribution
- Average pipeline latency
- Average agent turns per case
- Common diagnoses
- Specialization usage frequency
- Error rates

---

### 8. **Patient Record** (`/record`)
**Purpose:** Manage patient records (future feature)

---

## 🔌 Backend API Endpoints

### Core Cases API

#### `POST /api/cases` — Create New Case
```
Request:
{
  "chief_complaint": "Crushing chest pain",
  "onset": "2 hours ago",
  "duration": "Ongoing",
  "severity": 9,
  "associated_symptoms": "Diaphoresis, nausea",
  "past_medical_history": "Hypertension, T2DM",
  "current_medications": "Metformin 500mg BD, Lisinopril 10mg",
  "allergies": "None known"
}

Response (202 Accepted):
{
  "case_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Case created. Pipeline triggered in background."
}
```

#### `GET /api/cases` — List All Cases
```
Query Parameters:
- skip: int (default 0) — pagination offset
- limit: int (default 50) — number of cases to return

Response:
{
  "cases": [
    {
      "case_id": "550e8400...",
      "chief_complaint": "Crushing chest pain",
      "onset": "2 hours ago",
      "severity": 9,
      "status": "done",
      "created_at": "2023-06-07T10:30:00Z"
    },
    ...
  ],
  "total": 42,
  "skip": 0,
  "limit": 50
}
```

#### `GET /api/cases/{id}` — Get Full Case Details
```
Response:
{
  "case_id": "550e8400...",
  "chief_complaint": "Crushing chest pain",
  "status": "done",
  "onset": "2 hours ago",
  "duration": "Ongoing",
  "severity": 9,
  "associated_symptoms": "Diaphoresis, nausea",
  "past_medical_history": "Hypertension, T2DM",
  "current_medications": "Metformin 500mg BD, Lisinopril 10mg",
  "allergies": "None known",
  "created_at": "2023-06-07T10:30:00Z",
  "updated_at": "2023-06-07T10:34:00Z",
  
  "transcript": [
    {
      "agent": "Intake_Agent",
      "content": "I have reviewed the patient presentation...",
      "sequence": 0
    },
    {
      "agent": "General_Practitioner",
      "content": "This case suggests ACS. I'm routing to...",
      "sequence": 1
    },
    ...
  ],
  
  "investigations": [
    {
      "test": "12-lead ECG",
      "rationale": "Assess for ST-segment changes",
      "urgency": "STAT"
    },
    ...
  ],
  
  "summary": {
    "summary_markdown": "# Case Summary\n## Differential Diagnosis\n...",
    "latency_seconds": 225.3,
    "total_rounds": 11
  }
}
```

#### `POST /api/cases/{id}/run` — Re-trigger Pipeline
```
Request: (empty body)

Response (202 Accepted):
{
  "case_id": "550e8400...",
  "status": "pending",
  "message": "Case re-queued for processing."
}
```

### Synthetic Data API

#### `GET /api/synthetic/cases` — Get 10 Demo Cases
```
Response:
{
  "cases": [
    {
      "chief_complaint": "Severe crushing chest pain...",
      "onset": "1 hour ago",
      "severity": 9,
      ...
    },
    ...
  ]
}
```

### Health Check

#### `GET /` — Root Health Check
```
Response:
{
  "service": "Healtheon API",
  "status": "running",
  "docs": "/docs",
  "disclaimer": "⚠️ Educational proof-of-concept only..."
}
```

#### `GET /health` — Simple Health Check
```
Response:
{
  "status": "ok"
}
```

---

## 🧠 Multi-Agent Pipeline Explained

### Agent Roles & Responsibilities

#### 1. **Intake Agent** (`Intake_Agent`)
- **Purpose:** Capture and structure patient information
- **Responsibilities:**
  - Review patient presentation (symptoms, history, meds, allergies)
  - Ask clarification questions if needed
  - Structure data for downstream agents
- **Input:** Patient form data
- **Output:** Structured complaint summary

#### 2. **General Practitioner** (`General_Practitioner`)
- **Purpose:** Initial clinical triage and routing
- **Responsibilities:**
  - Identify red flags / urgent conditions
  - Generate preliminary differential diagnosis
  - Route case to appropriate specialists
  - Coordinate specialist discussion
- **Input:** Structured patient data
- **Output:** Triage decision, specialist routing

#### 3. **Specialist Agents** (Cardiologist, Neurologist, Pulmonologist)
- **Purpose:** Deep-dive specialty assessment
- **Responsibilities:**
  - Assess case from specialty perspective
  - Debate differentials for up to 3 turns
  - Ask questions or challenge other specialists
  - May ask Intake for clarification
- **Interaction Pattern:**
  - Each speaks once per round
  - Can debate with other specialists
  - Limited to 3 rounds of specialist debate

#### 4. **Pathologist** (`Pathologist`)
- **Purpose:** Compile investigation recommendations
- **Responsibilities:**
  - Review specialist debate
  - Suggest diagnostic tests/imaging
  - Prioritize investigations (STAT vs ROUTINE)
  - Prepare for summarization
- **Input:** Full specialist discussion
- **Output:** Investigation suggestions with urgency levels

#### 5. **Summarizer** (`Summarizer`)
- **Purpose:** Generate final educational report
- **Responsibilities:**
  - Synthesize all agent input
  - Generate Markdown-formatted report
  - Include differential diagnosis
  - Include investigation recommendations
  - Include educational disclaimer
- **Input:** All previous agent messages
- **Output:** Final Markdown summary

### State Machine Logic (Custom Speaker Selection)

```
START
  ↓
Intake_Agent (always first)
  ↓
GP_Agent (routes to specialists)
  ↓
[Specialist Debate Loop - max 3 turns]
  ├─ Cardiologist
  ├─ Neurologist
  ├─ Pulmonologist
  └─ Can ask Intake_Agent for clarification
  ↓
Pathologist (after ≥4 specialist messages)
  ↓
Summarizer (always last)
  ↓
TERMINATION (via is_termination_msg check)
```

### Key Design Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| **Temperature** | 0.2 | Reduces hallucinations in medical context |
| **Max Rounds** | 12 | Hard circuit-breaker prevents infinite loops |
| **Specialist Debate** | 3 turns | Ensures reasonable discussion time |
| **Prompt Isolation** | Bounded roles | Each agent has strict scope (no role creep) |
| **State Machine** | Custom selection | Deterministic workflow on top of LLMs |

---

## 📊 Data Models

### Case Model
```python
class Case:
    id: str                           # UUID
    chief_complaint: str              # Patient's primary symptom
    onset: str                        # When symptoms started
    duration: str                     # How long symptoms persist
    severity: int                     # 1-10 scale
    associated_symptoms: str          # Related symptoms
    past_medical_history: str         # Previous conditions
    current_medications: str          # Active medications
    allergies: str                    # Known allergies
    status: CaseStatus                # pending, processing, done, failed
    error_message: str                # Set if status=failed
    created_at: datetime              # When case was created
    updated_at: datetime              # Last update time
    
    # Relationships
    messages: List[Message]           # Agent conversation
    investigations: List[Investigation]
    summary: CaseSummary              # Final report
```

### Message Model (Transcript)
```python
class Message:
    id: str                           # UUID
    case_id: str                      # Foreign key to Case
    agent_name: str                   # e.g., "General_Practitioner"
    content: str                      # Agent's message
    sequence_order: int               # Turn order (0-indexed)
    token_count: int                  # For evaluation metrics
    created_at: datetime
```

### Investigation Suggestion Model
```python
class InvestigationSuggestion:
    id: str
    case_id: str
    test_name: str                    # e.g., "12-lead ECG"
    rationale: str                    # Why this test
    urgency: InvestigationUrgency     # STAT or ROUTINE
    created_at: datetime
```

### Case Summary Model
```python
class CaseSummary:
    id: str
    case_id: str
    summary_markdown: str             # Markdown-formatted report
    latency_seconds: float            # Wall-clock time
    total_rounds: int                 # Agent turns used
    created_at: datetime
```

---

## 🔄 Complete User Flow Example

### Scenario: Submitting a Chest Pain Case

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: User opens Dashboard (/)                            │
│ ├─ Sees list of previous cases                              │
│ └─ Clicks [+ New Case] button                               │
└────────────────┬────────────────────────────────────────────┘

┌────────────────▼────────────────────────────────────────────┐
│ Step 2: User fills PatientForm (/submit)                    │
│ ├─ Enters: "Crushing chest pain"                            │
│ ├─ Onset: "1 hour ago"                                      │
│ ├─ Severity: 8/10                                           │
│ ├─ Associated: "Diaphoresis, nausea, SOB"                   │
│ ├─ PMH: "Hypertension, T2DM"                                │
│ ├─ Meds: "Metformin, Lisinopril"                            │
│ ├─ Allergies: "None known"                                  │
│ └─ Clicks [▶ Launch Agent Pipeline]                         │
└────────────────┬────────────────────────────────────────────┘

┌────────────────▼────────────────────────────────────────────┐
│ Step 3: Backend Processing                                  │
│ ├─ POST /api/cases → creates Case record (status=pending)   │
│ ├─ Triggers background task: run_case_pipeline()            │
│ └─ Returns case_id immediately                              │
└────────────────┬────────────────────────────────────────────┘

┌────────────────▼────────────────────────────────────────────┐
│ Step 4: User redirected to CaseDetail (/cases/{caseId})     │
│ ├─ Page loads with "Processing..." status                   │
│ ├─ Shows thinking log (simulated steps)                      │
│ └─ Polls backend every 4 seconds for updates                │
└────────────────┬────────────────────────────────────────────┘

┌────────────────▼────────────────────────────────────────────┐
│ Step 5a: Agent Pipeline Execution (Backend)                 │
│ ├─ Intake_Agent: Structures symptoms                        │
│ │   "I have reviewed the patient presentation..."           │
│ ├─ GP_Agent: Triages and routes                             │
│ │   "Differential: ACS, Aortic Dissection, Pneumothorax"    │
│ ├─ Cardiologist: Cardiovascular assessment                  │
│ │   "Most likely ACS given presentation..."                 │
│ ├─ Neurologist: CNS assessment                              │
│ │   "No focal neuro deficits reported..."                   │
│ ├─ Pulmonologist: Respiratory assessment                    │
│ │   "Could suggest pneumothorax, but..."                    │
│ ├─ Pathologist: Investigates & compiles                     │
│ │   Suggests: ECG (STAT), Troponin (STAT), CXR (STAT)       │
│ └─ Summarizer: Generates final report (Markdown)            │
│    "# Case Summary\n## Differential Diagnosis..."           │
└────────────────┬────────────────────────────────────────────┘

┌────────────────▼────────────────────────────────────────────┐
│ Step 5b: Frontend Updates                                   │
│ ├─ Real transcript messages appear as they're saved         │
│ ├─ Agent indicators show who's speaking                     │
│ ├─ Page auto-scrolls to latest message                      │
│ └─ Vitals update to show "case progression"                 │
└────────────────┬────────────────────────────────────────────┘

┌────────────────▼────────────────────────────────────────────┐
│ Step 6: Pipeline Complete                                   │
│ ├─ Status changes to "done"                                 │
│ ├─ Polling stops                                            │
│ ├─ Full transcript displayed                                │
│ ├─ Summary Markdown rendered                                │
│ ├─ Investigation table shown (with urgencies)               │
│ └─ Metrics: "Completed in 3 min 45s, 11 agent turns"       │
└────────────────┬────────────────────────────────────────────┘

┌────────────────▼────────────────────────────────────────────┐
│ Step 7: User Actions                                        │
│ ├─ [← Back] → Returns to Dashboard                          │
│ ├─ [⟳ Re-run] → Re-triggers failed case                     │
│ └─ [✓ Approve] → Marks case as reviewed                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 UI Color Scheme

The application uses a modern medical interface with:
- **Primary Teal** (#5EAAA8) — Calming, professional
- **Warm Orange** (#FFA726) — Accents, alerts
- **Mint Green** (#A5D6A7) — Success states
- **Soft Red** (#EF9A9A) — Errors/warnings
- **Light Gray** (#F5F7FA) — Backgrounds
- **Dark Gray** (#333333) — Text

**Agent Colors** (coded by role):
- 🔵 Intake Agent: Blue (#3b82f6)
- 🟢 GP: Green (#10b981)
- 🔴 Cardiologist: Red (#ef4444)
- 🟣 Neurologist: Purple (#8b5cf6)
- 🔵 Pulmonologist: Cyan (#06b6d4)
- 🟠 Pathologist: Amber (#f59e0b)
- 🟡 Summarizer: Yellow (#fcd34d)

---

## 🚀 Running the Project

### Start Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API key
uvicorn backend.main:app --reload --port 8000
```

### Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### URLs
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:5173

---

## 📝 Key Takeaways

1. **Multi-Agent Orchestration:** Shows how LLMs can be coordinated for complex tasks
2. **Safety by Design:** State machine, temperature control, circuit-breaker (max_rounds)
3. **Educational Focus:** Synthetic data only, strict role boundaries
4. **Real-time Monitoring:** UX shows live agent conversation
5. **Scalable Architecture:** Can add more agents, more specialists, more evaluation metrics

---

## ⚖️ Important Notes

- **NOT for medical use** — Educational demonstration only
- **Synthetic data only** — No real patient information
- **Always consult professionals** — Never use output for real medical decisions
- **Temperature 0.2** — Intentionally low to prevent hallucinations
- **Custom state machine** — Enforces workflow on top of LLMs (not magic!)

