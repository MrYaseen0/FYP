# Healtheon — Multi-Agent AI Medical Education System
## University Final Year Project (FYP)

> ⚠️ **EDUCATIONAL PROOF-OF-CONCEPT ONLY**
> This system demonstrates multi-agent AI orchestration for a university FYP.
> It does **not** provide medical advice, diagnosis, or treatment.
> It is **not** a medical device and must **not** be used for clinical decision-making.
> Always consult a qualified healthcare professional for real medical concerns.

---

## Architecture

```
healtheon/
├── backend/       # Python FastAPI + AutoGen AI agents
│   ├── agents/    # 6 agent definitions (Intake, GP, Cardiologist, Neurologist, Pulmonologist, Pathologist, Summarizer)
│   ├── orchestration/  # GroupChat + custom state machine speaker selection
│   ├── api/       # REST endpoints
│   └── db/        # SQLAlchemy models (SQLite)
└── frontend/      # React + Vite doctor dashboard
    └── src/
        ├── pages/ # PatientForm, Dashboard, CaseDetail
        └── components/ # AgentBubble, DisclaimerBanner, Navbar
```

## Agent Pipeline

```
Patient Form → Intake Agent → GP Agent → Specialists (Cardiologist / Neurologist / Pulmonologist)
                                       ↕  (debate, up to 3 turns)
                                       → Pathologist → Summarizer → Final Report
```

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Copy and fill in your environment
cp .env.example .env
# Edit .env: set OPENAI_API_KEY=sk-... (or use Ollama)

# Install dependencies (Python 3.11+)
pip install -r requirements.txt

# Start the server
uvicorn backend.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
Swagger docs: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### 3. LLM Backend Options

**Option A — OpenAI API (recommended for quick start):**
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

**Option B — Ollama (local Llama-3, more impressive for FYP):**
```bash
# Install Ollama: https://ollama.ai
ollama pull llama3
ollama serve
```
```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3
```

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/cases` | Submit a new case → triggers AI pipeline |
| `GET` | `/api/cases` | List all cases |
| `GET` | `/api/cases/{id}` | Get case + transcript + summary |
| `POST` | `/api/cases/{id}/run` | Re-trigger failed case |
| `GET` | `/api/synthetic/cases` | Get 10 pre-built synthetic demo cases |

## FYP Design Decisions (for write-up)

1. **Temperature 0.2** — Low LLM temperature reduces hallucinations; critical for a sensitive domain.
2. **`custom_speaker_selection`** — Python state machine enforces the clinical workflow on top of LLMs (Separation of Concerns principle applied to AI agents).
3. **`max_round=12`** — Hard circuit-breaker; guarantees the system halts (production-safe AI design).
4. **`is_termination_msg`** — Content-based termination on Summarizer output; double safety net.
5. **Prompt Isolation** — Each agent has a strictly bounded role; the Intake Agent cannot diagnose, the Pathologist cannot diagnose, etc.
6. **All synthetic data** — No real PHI stored or processed; fully compliant educational demo.

## Evaluation

Run all 10 synthetic cases through the pipeline:

```bash
cd backend
python -m evaluation.run_all  # (see evaluation/ folder for scripts)
```

Metrics collected:
- Latency per case (seconds)
- Total agent turns used
- Token usage estimate
- % transcripts containing required disclaimer text
- % transcripts where agent stayed within role scope (manual review)

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Agent Orchestration | Microsoft AutoGen (`pyautogen`) |
| LLM | OpenAI GPT-4o-mini or Ollama Llama-3 8B |
| Backend API | FastAPI (Python 3.11+) |
| Database | SQLite (via SQLAlchemy) |
| Frontend | React + Vite |
| Styling | Vanilla CSS (glassmorphism dark theme) |
| Testing | pytest + vitest |

---

## Testing

### Backend Tests

```bash
# Run all backend tests
python -m pytest backend/tests/ -q

# Run with coverage
python -m pytest backend/tests/ --cov=backend --cov-report=term-missing

# Run specific test categories
python -m pytest backend/tests/unit/ -q           # Unit tests (auth, guardrails, password reset)
python -m pytest backend/tests/integration/ -q     # Integration tests (API endpoints)
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npx vitest run

# Run with coverage
npx vitest run --coverage

# Run in watch mode
npx vitest
```

### CI Pipeline

Automated tests run on every push/PR via GitHub Actions:
- **Backend:** pytest + ruff lint + coverage report
- **Frontend:** vitest + eslint + coverage report
- **Build:** Verifies production build succeeds

See `.github/workflows/test.yml` for the full pipeline configuration.

## Disclaimer

This project is a proof-of-concept for educational purposes only. It was developed as a university
final-year project to demonstrate multi-agent AI orchestration techniques. The system does not provide
medical advice, diagnosis, or treatment. It is not a medical device. The outputs must not be used for
clinical decision-making. Always consult a qualified, licensed healthcare professional.
