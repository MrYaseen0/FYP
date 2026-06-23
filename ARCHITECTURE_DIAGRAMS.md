# 📊 Healtheon - Visual Architecture & Flowcharts

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      HEALTHEON SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────┐                            │
│  │   FRONTEND (React + Vite)        │                            │
│  │   Port: 5173                     │                            │
│  ├─────────────────────────────────┤                            │
│  │ • Dashboard (/)                  │                            │
│  │ • Patient Form (/submit)         │                            │
│  │ • Case Detail (/cases/:id)       │                            │
│  │ • Patient Record (/record)       │                            │
│  │ • System Orchestration (/...)    │                            │
│  │ • Agent Fleet (/fleet)           │                            │
│  │ • Case Analytics (/analytics)    │                            │
│  └────────────────┬────────────────┘                            │
│                   │                                               │
│                   │ HTTP/REST API                                │
│                   │ (Axios client)                               │
│                   │                                               │
│  ┌────────────────▼────────────────┐                            │
│  │   BACKEND (FastAPI)              │                            │
│  │   Port: 8000                     │                            │
│  ├─────────────────────────────────┤                            │
│  │ Routers:                         │                            │
│  │ • /api/cases                     │                            │
│  │ • /api/synthetic                 │                            │
│  │                                  │                            │
│  │ Services:                        │                            │
│  │ • Case CRUD                      │                            │
│  │ • Background task queue          │                            │
│  │ • AutoGen orchestration          │                            │
│  │ • Error handling                 │                            │
│  └────────────────┬────────────────┘                            │
│                   │                                               │
│                   │ SQLAlchemy ORM                               │
│                   │                                               │
│  ┌────────────────▼────────────────┐                            │
│  │   DATABASE (SQLite)              │                            │
│  │   File: healtheon.db             │                            │
│  ├─────────────────────────────────┤                            │
│  │ Tables:                          │                            │
│  │ • Cases                          │                            │
│  │ • Messages (Transcript)          │                            │
│  │ • Summaries                      │                            │
│  │ • Investigations                 │                            │
│  └─────────────────────────────────┘                            │
│                                                                   │
│  ┌─────────────────────────────────┐                            │
│  │  AI ORCHESTRATION (AutoGen)      │                            │
│  ├─────────────────────────────────┤                            │
│  │ Group Chat Manager               │                            │
│  │ • 7 Agent instances              │                            │
│  │ • Custom speaker selection       │                            │
│  │ • Max rounds: 12                 │                            │
│  │ • Temperature: 0.2               │                            │
│  └─────────────────────────────────┘                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Request/Response Flow Diagram

```
USER INTERACTION FLOW
═════════════════════════════════════════════════════════════════

1. SUBMIT CASE
   ┌─────────────┐
   │   User      │
   └──────┬──────┘
          │ Clicks "Launch Agent Pipeline"
          │
          ▼
   ┌─────────────────────────────────────┐
   │  React Form Validation              │
   │  • Check chief_complaint (required) │
   │  • Validate all fields              │
   └──────┬──────────────────────────────┘
          │ Valid ✓
          │
          ▼
   ┌─────────────────────────────────────┐
   │  Axios POST /api/cases              │
   │  Body: {chief_complaint, ...}       │
   │  Timeout: 15s                       │
   └──────┬──────────────────────────────┘
          │
          ▼
   ┌─────────────────────────────────────┐
   │  FastAPI Backend                    │
   │  • Validate with Pydantic           │
   │  • Create Case record (PENDING)     │
   │  • Save to SQLite                   │
   │  • Queue background task            │
   │  • Return 202 Accepted              │
   └──────┬──────────────────────────────┘
          │ case_id: "abc-123"
          │
          ▼
   ┌─────────────────────────────────────┐
   │  Background Task Starts             │
   │  run_case_pipeline(case_id, ...)    │
   │  • Status: PROCESSING               │
   │  • AutoGen GroupChat begins         │
   └─────────────────────────────────────┘


2. MONITOR CASE (POLLING)
   ┌────────────────────────┐
   │ Case Detail Page Loads  │
   │ (/cases/:caseId)       │
   └────────────┬───────────┘
                │
                ▼
   ┌────────────────────────┐
   │ setInterval(() => {    │
   │   GET /api/cases/{id}  │
   │ }, 4000)               │
   │ Polling every 4 secs   │
   └────────────┬───────────┘
                │
         ┌──────┴──────┐
         │             │
         ▼             ▼
    Status =      Status =
    PROCESSING    DONE
         │             │
         │             ├─→ Stop polling
         │             ├─→ Show results
         │             └─→ Enable "Approve"
         │
         ├─→ Update transcript
         ├─→ Update vitals
         └─→ Continue polling


3. AGENT PROCESSING (BACKEND)
   ┌──────────────────────────────────────┐
   │  Background Task (run_case_pipeline)  │
   │  Status: PROCESSING                  │
   └──────────────┬───────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────┐
   │  AutoGen GroupChat initializes       │
   │  • Create 7 Agent instances          │
   │  • Load system prompts               │
   │  • Set parameters (temp=0.2)         │
   └──────────────┬───────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────┐
   │  Intake Agent starts                 │
   │  • Reads chief_complaint             │
   │  • Structures patient presentation   │
   │  • Creates initial prompt            │
   │  • Sends message to group chat       │
   │  • Message saved to DB               │
   └──────────────┬───────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────┐
   │  Speaker Selection Logic             │
   │  Next speaker = GP Agent             │
   └──────────────┬───────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────┐
   │  GP Agent processes                  │
   │  • Reads Intake summary              │
   │  • Triages patient                   │
   │  • Routes to specialists             │
   │  • Sends differential diagnosis      │
   │  • Message saved to DB               │
   └──────────────┬───────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────┐
   │  [Debate Phase - 3 rounds]           │
   │  Cardiologist, Neurologist, etc.    │
   │  • Each agent analyzes case          │
   │  • Agents respond to each other      │
   │  • Consensus building                │
   │  • Up to 12 total turns              │
   └──────────────┬───────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────┐
   │  Pathologist Agent finalizes         │
   │  • Reviews all evidence              │
   │  • Compiles investigations           │
   │  • Determines tests needed           │
   │  • Messages saved                    │
   └──────────────┬───────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────┐
   │  Summarizer Agent generates report   │
   │  • Creates final summary             │
   │  • Provides recommendations          │
   │  • Contains disclaimer               │
   │  • Saves CaseSummary to DB           │
   │  • Triggers termination signal       │
   └──────────────┬───────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────┐
   │  GroupChat terminates                │
   │  • Status: DONE                      │
   │  • All messages committed            │
   │  • Final summary saved               │
   │  • Background task completes         │
   └──────────────────────────────────────┘


4. DISPLAY RESULTS
   ┌──────────────────────────────────────┐
   │  Frontend polling detects DONE       │
   │  GET /api/cases/{id} → status=DONE   │
   └──────────────┬───────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────┐
   │  Stop polling (clearInterval)        │
   │  Display:                            │
   │  ✓ Full transcript                   │
   │  ✓ Final summary                     │
   │  ✓ Investigation suggestions         │
   │  ✓ Agent consensus                   │
   │  ✓ "Approve" button                  │
   │  ✓ "Rerun Pipeline" button           │
   └──────────────────────────────────────┘
```

---

## Agent Communication Flow

```
INSIDE THE GROUPCHAT
════════════════════════════════════════════════════════════════

Turn 1: Intake_Agent speaks
┌──────────────────────────┐
│ INTAKE AGENT             │
│ Chief Complaint: Chest   │
│ pain for 2 hours         │
│ Severity: 9/10           │
│ PMH: HTN, T2DM           │
│ Requires: Immediate eval │
└──────────────────────────┘
         │
         ▼ (saved to Messages table)
    Database updated


Turn 2: Speaker selector → GP_Agent
┌──────────────────────────┐
│ GP AGENT (Primary Route) │
│ Analysis: Red flags      │
│ • Crushing chest pain    │
│ • Onset acute            │
│ • Diaphoresis noted      │
│ Dx: Likely ACS           │
│ Next: Need specialist    │
│ review                   │
└──────────────────────────┘
         │
         ▼ (saved to Messages table)
    Database updated


Turn 3-5: Debate Phase (Specialists)
┌──────────────────────────┐
│ CARDIOLOGIST AGENT       │
│ Assessment:              │
│ • Crush chest pain       │
│ • Diaphoresis            │
│ • Risk: STEMI            │
│ Recommend: Troponin,     │
│ ECG STAT                 │
└──────────────────────────┘
         │
┌──────────────────────────┐
│ NEUROLOGIST AGENT        │
│ Finding:                 │
│ • No focal neuro deficits│
│ • No CVA signs           │
│ • Agrees: Cardiac focus  │
└──────────────────────────┘
         │
┌──────────────────────────┐
│ PULMONOLOGIST AGENT      │
│ Observation:             │
│ • RR elevated (24/min)   │
│ • SOB present            │
│ • Check pulmonary edema  │
│ • CXR recommended        │
└──────────────────────────┘


Turn 6: Pathologist synthesizes
┌──────────────────────────┐
│ PATHOLOGIST AGENT        │
│ Lab compilation:         │
│ Recommend STAT:          │
│ • Troponin (hs)          │
│ • ECG                    │
│ • CXR                    │
│ • CBC, CMP               │
│ • D-Dimer                │
│ Evidence: Strong for ACS │
└──────────────────────────┘


Turn 7: Summarizer finalizes
┌──────────────────────────┐
│ SUMMARIZER AGENT         │
│                          │
│ FINAL REPORT:            │
│ ════════════════         │
│ Diagnosis: Acute Anterior│
│ STEMI (95% confidence)   │
│                          │
│ Findings:                │
│ • High troponin          │
│ • ST elevation V2-V4     │
│ • Diaphoresis            │
│                          │
│ Recommendations:         │
│ • Activate STEMI protocol│
│ • Cardiology consult STAT│
│ • Prepare for cath lab   │
│                          │
│ ⚠️ DISCLAIMER:           │
│ Educational demo only    │
│ Not for clinical use     │
│                          │
│ [TERMINATION SIGNAL]     │
└──────────────────────────┘
         │
         ▼
  GroupChat terminates
  Status: DONE
  Summary saved to DB
```

---

## Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                       HEALTHEON DB                           │
│                      (SQLite/ORM)                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ CASES TABLE                                          │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ case_id (PK)          │ UUID                         │   │
│  │ status                │ pending|processing|done|fail │   │
│  │ chief_complaint       │ Text                        │   │
│  │ onset                 │ Text                        │   │
│  │ duration              │ Text                        │   │
│  │ severity              │ Integer (1-10)              │   │
│  │ associated_symptoms   │ Text                        │   │
│  │ past_medical_history  │ Text                        │   │
│  │ current_medications   │ Text                        │   │
│  │ allergies             │ Text                        │   │
│  │ error_message         │ Text (nullable)             │   │
│  │ created_at            │ Timestamp                   │   │
│  │ updated_at            │ Timestamp                   │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                                     │
│         │ One-to-Many                                        │
│         │                                                     │
│         ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ MESSAGES TABLE (Transcript)                          │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ id (PK)               │ Integer                      │   │
│  │ case_id (FK)          │ UUID → Cases.case_id         │   │
│  │ agent                 │ String (agent name)          │   │
│  │ message               │ Text (agent response)        │   │
│  │ timestamp             │ Timestamp                    │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                                     │
│         └─ Multiple messages per case                        │
│           Example: 7 agents × multiple turns                 │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ CASE_SUMMARY TABLE                                   │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ id (PK)               │ Integer                      │   │
│  │ case_id (FK)          │ UUID → Cases.case_id         │   │
│  │ summary_text          │ Text (final report)          │   │
│  │ created_at            │ Timestamp                    │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                                     │
│         └─ One per case (populated when DONE)               │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ INVESTIGATION_SUGGESTIONS TABLE                      │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ id (PK)               │ Integer                      │   │
│  │ case_id (FK)          │ UUID → Cases.case_id         │   │
│  │ investigation         │ Text (suggested test)        │   │
│  │ created_at            │ Timestamp                    │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                                     │
│         └─ Multiple per case (tests suggested)               │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Example Data:
═════════════
Cases: 1 row
  case_id: abc-123-uuid
  status: done
  chief_complaint: Crushing chest pain
  severity: 9

Messages: 7+ rows
  case_id: abc-123-uuid, agent: Intake_Agent, message: "..."
  case_id: abc-123-uuid, agent: GP_Agent, message: "..."
  case_id: abc-123-uuid, agent: Cardiologist, message: "..."
  ... (more agents)

Summary: 1 row
  case_id: abc-123-uuid, summary_text: "FINAL REPORT: ..."

Investigations: 5+ rows
  case_id: abc-123-uuid, investigation: "Troponin (hs)"
  case_id: abc-123-uuid, investigation: "ECG"
  ... (more tests)
```

---

## Component Hierarchy

```
App.jsx (Root)
├── Sidebar
│   ├── Navigation links
│   ├── Active page highlight
│   └── Logo
│
├── Navbar
│   ├── Page title/breadcrumb
│   ├── User profile
│   └── Notifications
│
├── Main Content (Routes)
│   │
│   ├─ Route: /
│   │  └── Dashboard.jsx
│   │      ├── Page Header
│   │      ├── System Status Bar
│   │      ├── Cases Grid
│   │      │   └── CaseCard (repeating)
│   │      └── DisclaimerBanner
│   │
│   ├─ Route: /submit
│   │  └── PatientForm.jsx
│   │      ├── Form Header
│   │      ├── Disclaimer Box
│   │      └── Form Fields
│   │          ├── Chief Complaint Input
│   │          ├── Onset/Duration Inputs
│   │          ├── Severity Slider
│   │          ├── Symptoms Textarea
│   │          ├── PMH Textarea
│   │          ├── Medications Textarea
│   │          └── Allergies Input
│   │
│   ├─ Route: /cases/:caseId
│   │  └── CaseDetail.jsx
│   │      ├── Header (Status + Actions)
│   │      ├── Main Content (3 columns)
│   │      │   ├── Transcript Column (Center)
│   │      │   │   └── AgentBubble[] (repeating)
│   │      │   ├── Timeline Column (Right)
│   │      │   └── Vitals Column (Right)
│   │      └── Footer (Approve/Rerun buttons)
│   │
│   ├─ Route: /record
│   │  └── PatientRecord.jsx
│   │      ├── Header Section
│   │      └── Two Columns
│   │          ├── Left: Timeline + Analytics
│   │          └── Right: Vitals + Clinical History
│   │
│   ├─ Route: /orchestration
│   │  └── SystemOrchestration.jsx
│   │      ├── Profile Section
│   │      ├── AI Orchestration Section
│   │      ├── Security Vault Section
│   │      └── Right Sidebar (Settings)
│   │
│   ├─ Route: /fleet
│   │  └── AgentFleet.jsx
│   │      ├── Fleet Header
│   │      └── Three Columns
│   │          ├── Fleet List + Agent Cards
│   │          ├── Global Parameters
│   │          └── Agent Config Panel
│   │
│   └─ Route: /analytics
│      └── CaseAnalytics.jsx
│          ├── Header
│          └── Two Columns
│              ├── Left: Metrics + Historical Table
│              └── Right: Synthesis Engine

Legend:
═══════
.jsx = React component
[] = Array of components (repeating)
```

---

## State Management Flow

```
Frontend State Management (React Hooks)
════════════════════════════════════════════════════════════════

DASHBOARD PAGE
──────────────
useState(cases, [])           ← List of all cases
useState(loading, true)       ← Fetch in progress?
useState(error, '')           ← Error message
useState(loadingDemo, false)  ← Demo load in progress?

useEffect(() => {
  fetchCases()
  const interval = setInterval(fetchCases, 5000)
  return () => clearInterval(interval)
}, [])


PATIENT FORM PAGE
──────────────────
useState(form, EMPTY_OBJECT)  ← Form field values
useState(submitting, false)   ← Submit in progress?
useState(error, '')           ← Validation error

useEffect(() => {
  const prefilledData = location.state?.prefill
  if (prefilledData) setForm(...prefilledData)
}, [location.state])


CASE DETAIL PAGE
────────────────
useState(data, null)          ← Full case data + transcript
useState(loading, true)       ← Fetch in progress?
useState(error, '')           ← Error message
useState(thinking, [])        ← Thinking timeline steps
useState(rerunning, false)    ← Rerun in progress?
useState(approved, false)     ← User approved?

useEffect(() => {
  fetchCase()
  const pollRef = setInterval(fetchCase, 4000)
  
  return () => {
    clearInterval(pollRef)
    if (status === 'done' || status === 'failed') {
      clearInterval(pollRef)  // Stop polling
    }
  }
}, [caseId])

useEffect(() => {
  // Thinking timeline animation
  if (status === 'processing') {
    THINKING.forEach(({delay, agent, text}) => {
      setTimeout(() => setThinking(prev => [...prev, {agent, text}]), delay)
    })
  }
}, [status])
```

---

## API Polling Patterns

```
DASHBOARD POLLING
─────────────────
Every 5 seconds:

GET /api/cases?skip=0&limit=50
  ↓
Response: {total: 25, cases: [...]}
  ↓
Update state: setCases(data.cases)
  ↓
Re-render with latest cases


CASE DETAIL POLLING
───────────────────
Every 4 seconds:

GET /api/cases/{caseId}
  ↓
Response: {
  case_id, status, chief_complaint,
  transcript: [
    {agent, message, timestamp},
    {agent, message, timestamp},
    ...
  ],
  summary: {summary_text, ...},
  investigations: [...]
}
  ↓
Update state: setData(response)
  ↓
Scroll transcript to bottom
  ↓
if (status === 'done' || 'failed') {
  clearInterval(pollRef)  // Stop polling
}

POLLING CLEANUP LOGIC:
─────────────────────
useEffect(() => {
  const ref = setInterval(fetch, 4000)
  
  return () => {
    clearInterval(ref)  // On component unmount
  }
}, [])
```

---

## Error Handling Flow

```
ERROR SCENARIOS & RECOVERY
═════════════════════════════════════════════════════════════════

Scenario 1: Backend Not Running
─────────────────────────────────
Dashboard loads
  ↓
GET /api/cases fails
  ↓
Axios error caught
  ↓
setError('Cannot reach backend. Is it running?')
  ↓
Display error message
  ↓
Continue polling (may succeed when server starts)


Scenario 2: Form Validation Error
──────────────────────────────────
User clicks "Launch Agent Pipeline"
  ↓
Frontend validation: chief_complaint required?
  ↓
If missing: setError('Chief complaint is required')
  ↓
Display error, don't submit


Scenario 3: Case Processing Failed
────────────────────────────────────
Case status: processing
  ↓
Agents encounter error
  ↓
Status changes to: failed
  ↓
error_message saved to DB
  ↓
Frontend polling detects failed status
  ↓
Display error message
  ↓
Show "Rerun Pipeline" button
  ↓
User can clear and restart


Scenario 4: API Timeout
────────────────────────
Axios timeout: 15 seconds
  ↓
Request cancelled
  ↓
Error caught: 'Failed to submit'
  ↓
Retry is possible
  ↓
User can try again
```

---

## Performance Optimization

```
POLLING OPTIMIZATION
═════════════════════
❌ Poll too frequently: Waste bandwidth
✅ Poll every 4-5s: Balance responsiveness & resources

COMPONENT OPTIMIZATION
══════════════════════
❌ Re-render entire page on small change
✅ useState + useCallback: Update only affected state
✅ useRef: Don't trigger re-render for polling interval

TRANSCRIPT RENDERING
════════════════════
❌ Render 100 messages: Slow
✅ Virtualize list: Only visible items rendered
✅ Markdown only on display: Don't re-parse

FORM HANDLING
═════════════
❌ Validate on every keystroke
✅ Validate on submit
✅ Debounce API calls
```

---

**Diagram Version**: 1.0
**Last Updated**: 2024
**Format**: ASCII Diagrams
