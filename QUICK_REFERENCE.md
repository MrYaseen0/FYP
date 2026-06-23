# Healtheon — Quick Reference Guide

## 📍 Page Routing Map

```
/                    → Dashboard (case overview)
/submit              → PatientForm (new case submission)
/cases/:caseId       → CaseDetail (agent monitoring & results)
/orchestration       → System Orchestration (workflow diagram)
/fleet               → Agent Fleet Configuration
/lab                 → Agent Lab (isolated testing)
/analytics           → Case Analytics
/record              → Patient Record Management
```

---

## 🔌 API Quick Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/cases` | Create new case → trigger pipeline |
| `GET` | `/api/cases` | List all cases (paginated) |
| `GET` | `/api/cases/{id}` | Get full case details + transcript + summary |
| `POST` | `/api/cases/{id}/run` | Re-run failed/pending case |
| `GET` | `/api/synthetic/cases` | Get 10 demo synthetic cases |
| `GET` | `/` | Root health check + disclaimer |
| `GET` | `/health` | Simple health check (returns `{"status": "ok"}`) |

---

## 👨‍⚕️ Agent Pipeline Order

1. **Intake_Agent** — Patient data structuring
2. **General_Practitioner** — Triage & specialist routing
3. **Specialists** — Debate (Cardiologist, Neurologist, Pulmonologist)
4. **Pathologist** — Investigation recommendations
5. **Summarizer** — Final report generation

---

## 📊 Case Status States

| Status | Meaning | User Action |
|--------|---------|------------|
| `pending` | Queued, hasn't started | Wait or re-run |
| `processing` | Pipeline running | Monitor & wait |
| `done` | Completed successfully | Review transcript + summary |
| `failed` | Error occurred | View error message, re-run |

---

## 🎨 Form Fields (PatientForm)

| Field | Type | Required | Max Length |
|-------|------|----------|-----------|
| Chief Complaint | text | ✓ | 500 chars |
| Onset | text | | 200 chars |
| Duration | text | | 200 chars |
| Severity | slider | | 1-10 scale |
| Associated Symptoms | textarea | | 1000 chars |
| Past Medical History | textarea | | 1000 chars |
| Current Medications | textarea | | 1000 chars |
| Allergies | text | | 500 chars |

---

## 📱 Dashboard Features

- **Real-time Stats:** Total cases, processing, completed, failed
- **Case Grid:** All cases displayed as clickable cards
- **Auto-refresh:** Updates every 5 seconds
- **Quick Actions:** "Load Demo Case", "New Case"
- **Live Monitor Badge:** Shows when cases are processing

---

## 📖 CaseDetail Features

**While Processing:**
- Thinking log with step-by-step agent actions
- Real transcript as messages arrive
- Synthetic vitals display
- Auto-scroll to latest message

**After Completion:**
- Full multi-turn transcript
- Markdown-formatted summary
- Investigation suggestions table
- Metrics: total time, agent turns
- Re-run & approve buttons

---

## 🔧 Configuration Files

### Backend Environment (`.env`)
```bash
LLM_PROVIDER=openai          # or 'ollama'
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.2
MAX_ROUNDS=12
DATABASE_URL=sqlite:///./healtheon.db
CORS_ORIGINS=["http://localhost:5173"]
```

### Frontend Port
- Development: `http://localhost:5173`
- API URL: `http://localhost:8000`

---

## 🧪 Testing Endpoints

### Create & Monitor a Case (cURL examples)

```bash
# 1. Create case
curl -X POST http://localhost:8000/api/cases \
  -H "Content-Type: application/json" \
  -d '{
    "chief_complaint": "Crushing chest pain",
    "onset": "1 hour ago",
    "severity": 8,
    "associated_symptoms": "Diaphoresis, nausea",
    "past_medical_history": "Hypertension",
    "current_medications": "Lisinopril 10mg",
    "allergies": "None known"
  }'

# Response: case_id = "550e8400-..."

# 2. Poll for updates
curl http://localhost:8000/api/cases/550e8400-...

# 3. List all cases
curl http://localhost:8000/api/cases?skip=0&limit=50

# 4. Get synthetic demo case
curl http://localhost:8000/api/synthetic/cases
```

---

## 🎯 Key Design Principles

1. **Temperature 0.2** — Reduce hallucinations
2. **Custom State Machine** — Enforce workflow (not left to LLM)
3. **Max Rounds = 12** — Hard circuit-breaker
4. **Prompt Isolation** — Each agent has bounded role
5. **Synthetic Data Only** — No real PHI
6. **Educational Disclaimer** — Everywhere

---

## ⏱️ Expected Timings

| Step | Duration |
|------|----------|
| Intake Agent processing | ~5-8 seconds |
| GP initial assessment | ~6-10 seconds |
| Each specialist | ~5-10 seconds |
| Pathologist | ~5-8 seconds |
| Summarizer | ~8-12 seconds |
| **Total pipeline** | **~4-5 minutes** |

---

## 🐛 Common Issues

### Backend won't start
- Check Python 3.11+ is installed
- Check `pip install -r requirements.txt` completed
- Check `.env` has valid `OPENAI_API_KEY` (if using OpenAI)
- Check port 8000 is available

### Frontend won't start
- Check Node 16+ is installed
- Check `npm install` completed in `/frontend`
- Check port 5173 is available
- Check backend is running (API calls will fail if not)

### Case stuck in "processing"
- Check backend logs for errors
- Check LLM API is reachable (OpenAI or Ollama)
- Manually re-run case with `POST /api/cases/{id}/run`

### No transcript appearing
- Check browser console for network errors
- Check API is returning messages (GET `/api/cases/{id}`)
- Check case status is not "failed"

---

## 📚 File Structure Quick Reference

```
c:\final fyp idea\
├── backend/
│   ├── main.py                    ← FastAPI app entry
│   ├── config.py                  ← Settings & LLM config
│   ├── agents/                    ← 7 agent definitions
│   ├── api/
│   │   ├── cases.py               ← Cases endpoints
│   │   └── synthetic.py           ← Demo data endpoints
│   ├── db/
│   │   ├── models.py              ← SQLAlchemy models
│   │   └── database.py            ← DB initialization
│   ├── orchestration/
│   │   ├── group_chat.py          ← Agent orchestration
│   │   └── runner.py              ← Pipeline execution
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                ← Router & main layout
│   │   ├── api.js                 ← API client
│   │   ├── index.css              ← Global styles
│   │   ├── pages/                 ← Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── PatientForm.jsx
│   │   │   ├── CaseDetail.jsx
│   │   │   ├── SystemOrchestration.jsx
│   │   │   ├── AgentFleet.jsx
│   │   │   ├── AgentLab.jsx
│   │   │   └── CaseAnalytics.jsx
│   │   └── components/            ← Shared components
│   │       ├── Navbar.jsx
│   │       ├── Sidebar.jsx
│   │       ├── AgentBubble.jsx
│   │       └── DisclaimerBanner.jsx
│   └── package.json
│
├── UI_DOCUMENTATION.md            ← Full documentation
└── README.md                       ← Project overview
```

---

## 🚀 Development Workflow

### Starting the App
```bash
# Terminal 1: Backend
cd backend
uvicorn backend.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Testing a Case
1. Open `http://localhost:5173`
2. Click "New Case" or "Load Demo Case"
3. Fill form and submit
4. Watch real-time agent conversation
5. Review final summary when done

### Building for Production
```bash
# Backend
# No build needed (FastAPI runs directly)

# Frontend
cd frontend
npm run build
# Outputs to frontend/dist/
```

---

## 📖 For Your FYP Write-up

Key sections to cover:
1. **Multi-Agent Architecture** — How agents coordinate
2. **Custom Speaker Selection** — State machine design
3. **Safety Mechanisms** — Temperature, max_rounds, role isolation
4. **Workflow Enforcement** — Clinical pipeline order
5. **Evaluation Metrics** — Latency, turns, token usage
6. **Educational Value** — Why synthetic data, why this approach

---

## 🔗 External Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [AutoGen Docs](https://microsoft.github.io/autogen/)
- [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/en/20/)

---

**Created:** 2026-06-07  
**Last Updated:** 2026-06-07  
**Status:** Complete Documentation

