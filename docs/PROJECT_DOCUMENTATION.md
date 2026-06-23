# Healtheon OS — Complete Project Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Backend](#3-backend)
4. [Frontend](#4-frontend)
5. [Authentication System](#5-authentication-system)
6. [AI Agent Pipeline](#6-ai-agent-pipeline)
7. [Database Schema](#7-database-schema)
8. [API Reference](#8-api-reference)
9. [Testing](#9-testing)
10. [Configuration](#10-configuration)
11. [Development Guide](#11-development-guide)

---

## 1. Project Overview

**Healtheon OS** is a multi-agent AI clinical education platform (v2.1.0). It simulates a clinical case analysis conference using 7 specialized AI agents orchestrated via AutoGen GroupChat. The platform demonstrates multi-agent AI orchestration for a university Final Year Project (FYP).

> **Disclaimer:** This is an educational proof-of-concept. It does not provide medical advice, diagnosis, or treatment. It is not a medical device.

### Key Features

- **Multi-Agent AI Pipeline:** 7 specialist agents (Intake, GP, Cardiologist, Neurologist, Pulmonologist, Pathologist, Summarizer) debate and converge on diagnoses
- **Real-Time Streaming:** Watch agents confer live via WebSocket
- **JWT Authentication:** Role-based access control (admin/doctor/user) with httpOnly cookies
- **Full Clinical Dashboard:** Patients, appointments, prescriptions, lab orders, health metrics, billing
- **Admin Panel:** User management, audit logs, system settings
- **Guest Mode:** Free access without registration
- **Password Reset:** Email-based reset flow with JWT tokens
- **Email Verification:** 6-digit code verification via SMTP

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI (Python 3.11+) |
| AI Orchestration | Microsoft AutoGen (`pyautogen`) |
| LLM | OpenAI GPT-4o-mini / Ollama Llama-3 / Groq (free tier) |
| Database | SQLite via SQLAlchemy |
| Frontend | React 19 + Vite 8 |
| Routing | React Router 7 |
| HTTP Client | Axios with interceptors |
| Styling | Custom CSS (clinical white theme) |
| Testing | pytest (backend) + Vitest (frontend) |
| CI/CD | GitHub Actions |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  React 19 + Vite 8                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Landing  │ │ Login    │ │Dashboard │ │ Case Detail      │  │
│  │ Page     │ │ Screen   │ │ (P/D/A)  │ │ + Agent Timeline │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│           │              │              │                       │
│           └──────────────┼──────────────┘                       │
│                          │ Axios + WebSocket                    │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                     FastAPI Server (:8000)                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    API ROUTERS                           │    │
│  │  /api/auth    /api/cases    /api/admin    /api/patient  │    │
│  │  /api/doctor  /api/clinical /api/messages /api/notify   │    │
│  │  /api/departments          /api/synthetic               │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │  JWT Auth    │ │  Rate Limiter│ │  Audit Middleware     │    │
│  │  + Cookies   │ │  (per IP)    │ │  (logs all requests) │    │
│  └──────────────┘ └──────────────┘ └──────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               AI ORCHESTRATION ENGINE                     │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────────────┐ │   │
│  │  │ Intake  │→ │   GP    │→ │ Specialists (Cardio/     │ │   │
│  │  │ Agent   │  │  Agent  │  │ Neuro/Pulmo) debate      │ │   │
│  │  └─────────┘  └─────────┘  └──────────┬──────────────┘ │   │
│  │                                        ↓                 │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │   │
│  │  │Pathologist│← │Summarizer│  │ GroupChat (max 12)   │  │   │
│  │  │  Agent   │  │  Agent   │  │ Custom speaker select│  │   │
│  │  └──────────┘  └──────────┘  └──────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                       │
│  ┌───────────────────────┼──────────────────────────────────┐   │
│  │                  SQLite Database                          │   │
│  │  users | cases | messages | appointments | health_metrics │   │
│  │  medical_records | prescriptions | notifications | audit  │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Patient submits case → POST /api/cases
2. Backend returns 202 Accepted, starts background pipeline
3. Pipeline runner checks LLM availability:
   ├── LLM available → Run 7-agent GroupChat
   └── No LLM → Demo mode (keyword-based responses)
4. Each agent message → saved to DB + broadcast via WebSocket
5. Frontend receives WebSocket events → renders agent timeline
6. Pipeline completes → summary + investigations saved
7. Case status: PENDING → PROCESSING → DONE (or FAILED)
```

---

## 3. Backend

### 3.1 File Structure

```
backend/
├── main.py                    # FastAPI app, lifespan, router registration
├── config.py                  # Pydantic Settings (env vars)
├── auth.py                    # JWT auth, RBAC, user CRUD, password hashing
├── security.py                # Rate limiter, httpOnly cookies, refresh tokens
├── audit_middleware.py         # Middleware logging all API requests
├── email_service.py           # SMTP: verification codes, password reset emails
├── seed_data.py               # Demo data seeder (users, appointments, etc.)
├── db/
│   ├── database.py            # SQLAlchemy engine, SessionLocal, Base
│   ├── models.py              # Core models: User, Case, Message, etc.
│   ├── models_extended.py     # Extended: Appointment, HealthMetric, etc.
│   └── audit_models.py        # AuditLog model
├── api/
│   ├── auth.py                # Auth endpoints (10 routes)
│   ├── cases.py               # Case CRUD + pipeline trigger
│   ├── admin.py               # Admin management endpoints
│   ├── patient.py             # Patient-specific endpoints
│   ├── doctor.py              # Doctor-specific endpoints
│   ├── clinical.py            # Notes, lab orders, billing
│   ├── notifications.py       # Notification management
│   ├── messages.py            # Messaging system
│   ├── departments.py         # Department listing
│   ├── websocket.py           # WebSocket + SSE streaming
│   └── synthetic.py           # 10 pre-built demo cases
├── agents/
│   ├── intake_agent.py        # Data structuring agent
│   ├── gp_agent.py            # Triage & routing agent
│   ├── cardiologist_agent.py  # Cardiovascular specialist
│   ├── neurologist_agent.py   # Neurological specialist
│   ├── pulmonologist_agent.py # Respiratory specialist
│   ├── pathologist_agent.py   # Investigation advisor
│   ├── summarizer_agent.py    # Final report compiler
│   └── clinical_guardrails.py # Shared behavioral rules
├── orchestration/
│   ├── group_chat.py          # AutoGen GroupChat builder
│   └── runner.py              # Background pipeline runner
├── evaluation/
│   └── run_evaluation.py      # FYP evaluation metrics
└── tests/
    ├── conftest.py            # Test fixtures, test DB setup
    ├── unit/                  # Unit tests (auth, guardrails, password reset)
    └── integration/           # Integration tests (API endpoints)
```

### 3.2 Core Modules

#### `main.py` — Application Entry Point
- Creates FastAPI app with lifespan (table creation + admin seed + demo data seed)
- Registers 10 routers (auth, cases, admin, patient, doctor, clinical, notifications, messages, departments, websocket)
- Adds CORS middleware (localhost:5173) and AuditMiddleware
- Health check at `/` and `/health`

#### `config.py` — Configuration
- Pydantic Settings loaded from `.env`
- LLM config (provider, API keys, model, temperature, seed, max tokens)
- Database URL, CORS origins
- Auth secret key, admin password
- SMTP settings for email delivery

#### `auth.py` — Authentication Core
- Password hashing: bcrypt via passlib
- JWT operations: create_access_token, decode_token
- Role definitions: admin (level 100), doctor (level 50), user (level 10)
- User CRUD: register, authenticate, approve, reject, get_by_email
- Password reset: create_reset_token, verify_reset_token, reset_user_password
- FastAPI dependencies: get_current_user, require_role, require_admin

#### `security.py` — Security Layer
- `RateLimiter`: In-memory sliding window per IP, thread-safe
- `set_auth_cookies`: httpOnly cookies for access + refresh tokens
- `clear_auth_cookies`: Cookie cleanup on logout
- `create_refresh_token`: 7-day token stored in DB
- `rotate_refresh_token`: One-time-use rotation
- `revoke_refresh_token`: Token invalidation

---

## 4. Frontend

### 4.1 File Structure

```
frontend/src/
├── main.jsx                  # React entry: BrowserRouter + StrictMode
├── App.jsx                   # Root: AuthProvider → AppShell (3 routing modes)
├── api.js                    # Axios instance + all API functions
├── context/
│   ├── AuthContext.jsx        # Auth state: login, logout, guest mode, auto-refresh
│   └── WebSocketContext.jsx   # WebSocket provider for real-time updates
├── components/
│   ├── Sidebar.jsx            # Role-based navigation sidebar
│   ├── Navbar.jsx             # Top navbar with breadcrumbs
│   ├── Logo.jsx               # Animated SVG medical logo
│   ├── ErrorBoundary.jsx      # React error boundary
│   ├── AutocompleteInput.jsx  # Medical autocomplete input
│   ├── RadialOrbitalTimeline.jsx  # Agent pipeline visualization
│   ├── SupportModal.jsx       # Help/support modal
│   ├── LiveWallpaper.jsx      # Animated background
│   ├── GlassCard.jsx          # Glass morphism card
│   ├── GlowCard.jsx           # Glowing card
│   ├── RippleButton.jsx       # Button with ripple effect
│   ├── ScrollReveal.jsx       # Scroll animation
│   ├── Typewriter.jsx         # Typewriter text effect
│   └── ... (15+ UI components)
├── pages/
│   ├── LandingPage.jsx        # Public landing page
│   ├── LoginScreen.jsx        # Login form
│   ├── RegisterFlow.jsx       # Multi-step registration
│   ├── ForgotPasswordPage.jsx # Forgot password
│   ├── ResetPasswordPage.jsx  # Reset password with token
│   ├── AboutUsPage.jsx        # Developer profile page
│   ├── PatientDashboard.jsx   # Patient home
│   ├── DoctorDashboard.jsx    # Doctor home
│   ├── PatientForm.jsx        # Case submission form
│   ├── CaseDetail.jsx         # Case detail + agent timeline
│   ├── SettingsPage.jsx       # User settings
│   ├── NotificationsPage.jsx  # Notifications
│   ├── MessagesPage.jsx       # Messaging
│   ├── AdminDashboard.jsx     # Admin home
│   ├── AdminUsersPage.jsx     # User management
│   └── ... (30+ pages)
├── data/
│   └── medicalDict.js         # Medical dictionary (~300 terms)
└── test/
    ├── setup.js               # Vitest setup (mocks)
    ├── test-utils.jsx          # Custom render with providers
    └── *.test.jsx              # 13 test files (150 tests)
```

### 4.2 Three Routing Modes

The app has three distinct routing modes based on authentication state:

**Unauthenticated** — Public pages:
- `/` LandingPage
- `/login` LoginScreen
- `/register` RegisterFlow
- `/forgot-password` ForgotPasswordPage
- `/reset-password` ResetPasswordPage
- `/about` AboutUsPage

**Guest Mode** — Free access (restricted routes):
- `/submit` PatientForm
- `/cases/:caseId` CaseDetail
- `/record` PatientRecord
- `/analytics` CaseAnalytics
- `/fleet` AgentFleet
- `/lab` AgentLab
- `/orchestration` SystemOrchestration

**Authenticated** — Full app shell (Sidebar + Navbar):
- All guest routes PLUS:
- `/patient` PatientDashboard
- `/doctor` DoctorDashboard
- `/patients` PatientsPage (doctor/admin)
- `/appointments` AppointmentsPage
- `/prescriptions` PrescriptionsPage
- `/notes` ClinicalNotesPage (doctor/admin)
- `/lab-orders` LabOrdersPage (doctor/admin)
- `/messages` MessagesPage
- `/health-metrics` HealthMetricsPage
- `/billing` BillingPage
- `/settings` SettingsPage
- `/notifications` NotificationsPage
- `/admin` AdminDashboard (admin only)
- `/admin/users` AdminUsersPage (admin only)
- `/admin/roles` AdminRolesPage (admin only)
- `/admin/audit` AuditLogsPage (admin only)

### 4.3 Key Components

#### Sidebar
- Role-based navigation: admin sees 8 items, doctor sees 8, user sees 6
- Bottom nav: Settings, Notifications
- System status indicator (green dot)
- User profile card with logout
- Animated logo at top

#### Navbar
- Logo + breadcrumb trail
- About Us button (non-admin)
- Support modal trigger
- System Online status
- User info + avatar
- Notification/settings icon buttons

#### Logo
- Dynamic SVG with animated elements:
  - Medical cross with heart
  - 3 orbiting petals
  - Rotating dashed rings
  - Pulsing center node
  - 6 sparkle stars
  - Connection lines
  - 4-stop gradient text
- Props: size, showText, animate

#### AutocompleteInput
- Reusable input with dropdown suggestions
- Medical dictionaries: 120 symptoms, 100 conditions, 130 medications, 60 allergens
- Keyboard navigation (ArrowUp/Down, Enter, Escape)
- Comma-separated token support
- Max 10 suggestions shown

#### RadialOrbitalTimeline
- Pure JSX+CSS component (no external deps)
- Visualizes the 7-agent pipeline flow
- Shows agent status (completed/in-progress/pending)
- Transparent background, white nodes, green accents

---

## 5. Authentication System

### 5.1 JWT Flow

```
Login Request
    │
    ├── POST /api/auth/login { email, password }
    │
    ├── Server validates credentials against DB
    │
    ├── Creates JWT access token (24hr expiry)
    │
    ├── Creates refresh token (7-day, stored in DB)
    │
    └── Returns:
        ├── Access token (in response body)
        ├── httpOnly cookie: ht_access_token
        └── httpOnly cookie: ht_refresh_token

Token Refresh
    │
    ├── POST /api/auth/refresh (sends ht_refresh_token cookie)
    │
    ├── Server validates refresh token in DB
    │
    ├── Rotates: invalidates old, creates new pair
    │
    └── Returns new access + refresh tokens

Auto-Refresh (Frontend)
    │
    ├── Axios interceptor catches 401 responses
    │
    ├── Tries /api/auth/refresh automatically
    │
    ├── If success: retries original request
    │
    └── If failure: redirects to /login
```

### 5.2 Role-Based Access Control

| Role | Level | Dashboard | Key Permissions |
|------|-------|-----------|-----------------|
| **admin** | 100 | `/admin` | Full access: cases, admin, users, audit, pipeline |
| **doctor** | 50 | `/doctor` | Cases, patients, prescriptions, clinical notes |
| **user** | 10 | `/patient` | Create cases, view own data |

### 5.3 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Register | 3 attempts | 1 hour |
| Guest token | 10 attempts | 15 minutes |
| Send code | 3 attempts | 10 minutes |
| Password reset | 3 attempts | 1 hour |

### 5.4 Guest Mode

- No registration required
- Gets JWT with 15-minute expiry
- Auto-refreshes at 13 minutes
- Restricted to case submission and viewing
- Banner at top: "You're browsing in Free Access mode"
- Can exit to sign in for full access

### 5.5 Approval Workflow

```
User Registers → status: "pending"
    │
    ├── Admin sees pending user in AdminUsersPage
    │
    ├── Admin clicks "Approve" → status: "approved"
    │   └── User can now log in
    │
    └── Admin clicks "Reject" → status: "rejected"
        └── User gets 403 on login
```

---

## 6. AI Agent Pipeline

### 6.1 The 7 Agents

| # | Agent | Role | Key Behavior |
|---|-------|------|--------------|
| 1 | **Intake** | Data Structuring | Structures symptoms into Patient_Context/Presentation/Clinical_Exam. Flags red flags. Max 2 follow-ups. Never diagnoses. |
| 2 | **GP** | Triage & Routing | Classifies urgency (CRITICAL/HIGH/MODERATE/LOW). Routes to specialists via @-mentions. Summarizes debate. |
| 3 | **Cardiologist** | Cardiovascular | Cardiovascular differentials only. Must play Devil's Advocate before agreeing. References ESC/AHA guidelines. |
| 4 | **Neurologist** | Neurology | Neurological differentials only. Devil's Advocate protocol. References AHA/ASA stroke guidelines. |
| 5 | **Pulmonologist** | Respiratory | Pulmonary differentials only. Devil's Advocate protocol. References BTS/NICE guidelines. |
| 6 | **Pathologist** | Investigations | Speaks ONCE after debate. Outputs JSON array of test suggestions with urgency (STAT/ROUTINE). |
| 7 | **Summarizer** | Final Report | Reads entire GroupChat. Outputs structured Markdown Clinical Analysis Report. Triggers termination. |

### 6.2 Pipeline Flow

```
Patient submits case
        │
        ▼
┌─────────────────┐
│   Intake Agent   │ ← Extracts structured data, flags red flags
│   (1-3 turns)    │
└────────┬────────┘
         │ @General_Practitioner
         ▼
┌─────────────────┐
│   GP Agent       │ ← Triage, urgency classification, routes to specialists
│   (1 turn)       │
└────────┬────────┘
         │ @Cardiologist @Neurologist @Pulmonologist
         ▼
┌─────────────────────────────────────────────────┐
│           Specialist Debate (up to 6 turns)      │
│  ┌──────────────┐                                │
│  │ Cardiologist  │ ← Cardio differentials        │
│  └──────┬───────┘                                │
│         │ @Neurologist                           │
│  ┌──────▼───────┐                                │
│  │ Neurologist   │ ← Neuro differentials         │
│  └──────┬───────┘                                │
│         │ @Pulmonologist                         │
│  ┌──────▼───────┐                                │
│  │ Pulmonologist │ ← Pulmo differentials         │
│  └──────┬───────┘                                │
│         │ (may loop for devil's advocate)        │
└────────┬────────────────────────────────────────┘
         │ @Pathologist (after 4+ debate turns)
         ▼
┌─────────────────┐
│  Pathologist     │ ← Investigation suggestions (JSON)
│  (1 turn)        │
└────────┬────────┘
         │ @Summarizer
         ▼
┌─────────────────┐
│  Summarizer      │ ← Final Markdown report
│  (1 turn)        │   (triggers termination)
└─────────────────┘
```

### 6.3 Orchestration Details

- **Max rounds:** 12 (hard circuit-breaker)
- **Speaker selection:** Custom state machine (not round-robin)
- **Termination:** Content-based — looks for "Clinical Analysis Report" header in Summarizer output
- **Pathologist trigger:** After 4+ debate turns OR explicit "@Pathologist" mention
- **Demo mode:** If no LLM available, generates keyword-based responses for each agent

### 6.4 Clinical Guardrails

All agents share behavioral rules:
- **No prescribing** — Never recommend specific medications
- **No autonomous decisions** — Always defer to physician judgment
- **Probabilistic language** — Use "suggests", "consistent with", never "definitely"
- **Scope compliance** — Each agent stays within its specialty
- **Red flag escalation** — Critical findings flagged immediately
- **Edge case handling** — Incomplete info, contradictions, out-of-scope

---

## 7. Database Schema

### 7.1 Entity Relationship

```
users ──────┬──── cases
            │       │
            │       ├── messages (agent transcripts)
            │       ├── investigation_suggestions
            │       └── case_summaries
            │
            ├── appointments (patient ↔ doctor)
            ├── health_metrics (vitals over time)
            ├── medical_records
            ├── prescriptions
            ├── notifications
            ├── chat_messages (doctor ↔ patient)
            └── refresh_tokens
```

### 7.2 All Tables

#### `users`
| Field | Type | Notes |
|-------|------|-------|
| id | String PK | `usr_xxxxxxxx` |
| username | String UNIQUE | Indexed |
| email | String UNIQUE | Indexed |
| full_name | String | |
| password_hash | String | bcrypt |
| role | String | admin/doctor/user |
| institution | String | |
| status | String | pending/approved/rejected |
| avatar | String | 2-char initials |
| created_at | DateTime | |

#### `cases`
| Field | Type | Notes |
|-------|------|-------|
| id | String PK | `case_xxxxxxxx` |
| chief_complaint | String | Required |
| onset | String | When symptoms started |
| duration | String | How long |
| severity | Integer | 1-10 |
| associated_symptoms | Text | |
| past_medical_history | Text | |
| current_medications | Text | |
| allergies | Text | |
| symptoms_structured | Text | JSON from Intake Agent |
| status | Enum | pending/processing/done/failed |
| error_message | Text | Set on failure |
| created_at | DateTime | |
| updated_at | DateTime | Auto-updated |

#### `messages`
| Field | Type | Notes |
|-------|------|-------|
| id | String PK | |
| case_id | String FK | → cases.id |
| agent_name | String | Who said it |
| content | Text | The message |
| sequence_order | Integer | Order in conversation |
| token_count | Integer | |
| created_at | DateTime | |

#### `investigation_suggestions`
| Field | Type | Notes |
|-------|------|-------|
| id | String PK | |
| case_id | String FK | → cases.id |
| test_name | String | e.g., "ECG", "Troponin" |
| rationale | Text | Why this test |
| urgency | Enum | STAT/ROUTINE |
| created_at | DateTime | |

#### `case_summaries`
| Field | Type | Notes |
|-------|------|-------|
| id | String PK | |
| case_id | String FK UNIQUE | 1:1 with case |
| summary_markdown | Text | Final report |
| latency_seconds | Float | How long pipeline took |
| total_rounds | Integer | Agent turns used |
| created_at | DateTime | |

#### `appointments`
| Field | Type | Notes |
|-------|------|-------|
| id | String PK | |
| patient_id | String FK | → users.id |
| doctor_id | String FK | → users.id |
| appointment_date | String | |
| appointment_time | String | |
| appointment_type | String | consultation |
| status | String | scheduled/completed/cancelled/no-show |
| notes | Text | |
| created_at | DateTime | |

#### `health_metrics`
| Field | Type | Notes |
|-------|------|-------|
| id | String PK | |
| user_id | String FK | → users.id |
| metric_type | String | heart_rate/blood_pressure/weight/etc. |
| value | String | |
| unit | String | |
| recorded_at | DateTime | |

#### `medical_records`
| Field | Type | Notes |
|-------|------|-------|
| id | String PK | |
| user_id | String FK | → users.id |
| doctor_id | String FK | nullable |
| record_type | String | lab_report/progress_note/etc. |
| title | String | |
| description | Text | |
| date | String | |
| status | String | active |
| created_at | DateTime | |

#### `prescriptions`
| Field | Type | Notes |
|-------|------|-------|
| id | String PK | |
| patient_id | String FK | → users.id |
| doctor_id | String FK | → users.id |
| medication_name | String | |
| dosage | String | |
| frequency | String | |
| duration | String | |
| instructions | Text | |
| status | String | active/completed/discontinued |
| created_at | DateTime | |

#### `notifications`
| Field | Type | Notes |
|-------|------|-------|
| id | String PK | |
| user_id | String FK | → users.id |
| title | String | |
| message | Text | |
| notification_type | String | info/warning/success/etc. |
| is_read | Boolean | Default false |
| link | String | Deep link |
| created_at | DateTime | |

#### `chat_messages`
| Field | Type | Notes |
|-------|------|-------|
| id | String PK | |
| sender_id | String FK | → users.id |
| receiver_id | String FK | → users.id |
| content | Text | |
| is_read | Boolean | |
| created_at | DateTime | |

#### `departments`
| Field | Type | Notes |
|-------|------|-------|
| id | String PK | |
| name | String | |
| description | Text | |
| head_doctor_id | String FK | nullable |
| staff_count | Integer | |
| created_at | DateTime | |

#### `refresh_tokens`
| Field | Type | Notes |
|-------|------|-------|
| id | Integer PK | Auto-increment |
| token | String UNIQUE | 64-byte random |
| user_id | String | |
| expires_at | DateTime | 7 days |
| created_at | DateTime | |

#### `audit_logs`
| Field | Type | Notes |
|-------|------|-------|
| id | String PK | |
| user_id | String | |
| username | String | |
| action | String | e.g., "auth.login.success" |
| resource_type | String | case/auth/admin |
| resource_id | String | |
| details | Text | JSON |
| ip_address | String | IPv4/IPv6 |
| user_agent | String | |
| status_code | String | |
| created_at | DateTime | |

---

## 8. API Reference

### 8.1 Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login, returns JWT + cookies | None |
| POST | `/api/auth/register` | Self-register (pending approval) | None |
| GET | `/api/auth/me` | Get current user info | Bearer |
| POST | `/api/auth/refresh` | Refresh token rotation | Cookie |
| POST | `/api/auth/logout` | Clear cookies + revoke refresh | Cookie |
| POST | `/api/auth/forgot-password` | Send reset email | None |
| POST | `/api/auth/reset-password` | Reset password with token | None |
| POST | `/api/auth/send-code` | Send verification code | None |
| POST | `/api/auth/verify-email` | Verify email with code | None |
| POST | `/api/auth/guest-token` | Get guest JWT | None |

### 8.2 Cases

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cases` | Create case → triggers AI pipeline (202) |
| GET | `/api/cases` | List cases (skip/limit params) |
| GET | `/api/cases/{id}` | Get case + transcript + summary |
| POST | `/api/cases/{id}/run` | Re-trigger pipeline |
| DELETE | `/api/cases/{id}` | Soft delete case |

### 8.3 Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | System-wide statistics |
| GET | `/api/admin/logs` | Audit logs |
| GET | `/api/admin/users` | All users |
| GET | `/api/admin/users/pending` | Pending approval users |
| POST | `/api/admin/users/{username}/approve` | Approve user |
| POST | `/api/admin/users/{username}/reject` | Reject user |
| PUT | `/api/admin/users/{username}/role` | Change role |

### 8.4 Patient

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patient/appointments` | Patient's appointments |
| GET | `/api/patient/health-metrics` | Patient's vitals |
| POST | `/api/patient/health-metrics` | Log new metric |
| GET | `/api/patient/medical-records` | Patient's records |
| GET | `/api/patient/prescriptions` | Patient's prescriptions |
| GET | `/api/patient/profile` | Patient profile + stats |
| PUT | `/api/patient/profile` | Update profile |

### 8.5 Doctor

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctor/patients` | Doctor's patients |
| GET | `/api/doctor/appointments` | Doctor's appointments |
| POST | `/api/doctor/appointments` | Book appointment |
| GET | `/api/doctor/prescriptions` | Doctor's prescriptions |
| POST | `/api/doctor/prescriptions` | Create prescription |
| GET | `/api/doctor/medical-records` | Doctor's records |
| POST | `/api/doctor/medical-records` | Create record |
| GET | `/api/doctor/cases` | All cases |
| GET | `/api/doctor/stats` | Dashboard stats |
| GET | `/api/doctor/profile` | Doctor profile |

### 8.6 Clinical

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clinical/notes` | Clinical notes |
| POST | `/api/clinical/notes` | Create note |
| GET | `/api/clinical/lab-orders` | Lab orders |
| POST | `/api/clinical/lab-orders` | Create lab order |
| PUT | `/api/clinical/lab-orders/{id}` | Update lab order status |
| GET | `/api/clinical/billing` | Billing summary |

### 8.7 Notifications & Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | All notifications + unread count |
| POST | `/api/notifications/{id}/read` | Mark as read |
| POST | `/api/notifications/read-all` | Mark all read |
| GET | `/api/messages` | All messages |
| GET | `/api/messages/conversations` | Conversation list |
| GET | `/api/messages/{contact_id}` | Messages with contact |
| POST | `/api/messages/{receiver_id}` | Send message |

### 8.8 WebSocket

| Protocol | Endpoint | Description |
|----------|----------|-------------|
| WS | `/ws/case/{id}?token=xxx` | Real-time case updates |
| SSE | `/api/cases/{id}/stream?token=xxx` | SSE fallback |

---

## 9. Testing

### 9.1 Backend Tests (pytest)

```bash
python -m pytest backend/tests/ -q                    # Run all
python -m pytest backend/tests/unit/ -q               # Unit only
python -m pytest backend/tests/integration/ -q        # Integration only
python -m pytest backend/tests/ --cov=backend         # With coverage
```

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `unit/test_auth.py` | 47 | JWT, hashing, RBAC, registration, auth |
| `unit/test_password_reset.py` | 10 | Token create/verify, password reset |
| `unit/test_clinical_guardrails.py` | 39 | Guardrails content, escalation rules |
| `integration/test_auth_api.py` | 30 | Login, register, me, guest, logout |
| `integration/test_api_endpoints.py` | 42 | Cases, patient, doctor, clinical |
| `integration/test_edge_cases.py` | 44 | Invalid JSON, auth, RBAC, SQL injection |
| `integration/test_password_reset.py` | 13 | Forgot + reset password flow |

**Total: ~225 backend tests**

### 9.2 Frontend Tests (Vitest)

```bash
cd frontend
npx vitest run                           # Run all
npx vitest run --coverage                # With coverage
npx vitest                               # Watch mode
```

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `AuthContext.test.jsx` | 12 | Login, logout, guest mode |
| `api.test.js` | 11 | API functions, interceptors |
| `Sidebar.test.jsx` | 10 | Navigation, role-based items |
| `Navbar.test.jsx` | 8 | Breadcrumbs, user info |
| `Logo.test.jsx` | 11 | SVG rendering, props |
| `LoginScreen.test.jsx` | 13 | Form, validation, submission |
| `LandingPage.test.jsx` | 12 | Hero, features, agents |
| `ForgotPasswordPage.test.jsx` | 9 | Form, submit, success/error |
| `ResetPasswordPage.test.jsx` | 12 | Token, form, strength, submit |
| `ErrorBoundary.test.jsx` | 6 | Error catch, fallback |
| `AutocompleteInput.test.jsx` | 16 | Filtering, keyboard, selection |
| `medicalDict.test.js` | 14 | Dictionary data validation |
| `AboutUsPage.test.jsx` | 17 | Profile, social, skills |

**Total: 150 frontend tests**

### 9.3 CI Pipeline

`.github/workflows/test.yml` runs on push/PR:
1. **Backend:** Python 3.11 → ruff lint → pytest with coverage → upload XML + HTML
2. **Frontend:** Node 20 → npm ci → eslint → vitest with coverage → upload report
3. **Build:** Vite production build → verify dist/

---

## 10. Configuration

### 10.1 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | (required) | JWT signing secret |
| `ADMIN_PASSWORD` | `ChangeMe123!` | Seed admin password |
| `LLM_PROVIDER` | `ollama` | `openai` / `ollama` / `groq` |
| `OPENAI_API_KEY` | `""` | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` | Ollama endpoint |
| `OLLAMA_MODEL` | `llama3` | Ollama model |
| `GROQ_API_KEY` | `""` | Groq API key (free) |
| `GROQ_MODEL` | `llama3-8b-8192` | Groq model |
| `LLM_TEMPERATURE` | `0.2` | LLM temperature |
| `LLM_SEED` | `42` | Reproducibility seed |
| `LLM_MAX_TOKENS` | `1024` | Max tokens per call |
| `MAX_ROUNDS` | `12` | Max GroupChat rounds |
| `DATABASE_URL` | `sqlite:///./healtheon.db` | Database URL |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed origins |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | `""` | SMTP username |
| `SMTP_PASSWORD` | `""` | SMTP password |
| `VITE_API_BASE_URL` | `""` (proxy) | Backend URL |

### 10.2 Test Accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@healtheon.local` | `Admin@2026` | admin |
| `sarah@hospital.edu` | `Doctor123!` | doctor |
| `john@patient.com` | `Patient123!` | user |

### 10.3 Synthetic Cases (10)

1. Classic STEMI Presentation
2. Thunderclap Headache
3. Suspected Pulmonary Embolism
4. Acute Ischaemic Stroke
5. Diabetic Ketoacidosis
6. Community-Acquired Pneumonia
7. Aortic Dissection
8. Sepsis (Urosepsis)
9. Tension Pneumothorax
10. Hypertensive Emergency

---

## 11. Development Guide

### 11.1 Quick Start

```bash
# Backend
pip install -r requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### 11.2 Project Commands

```bash
# Run tests
python -m pytest backend/tests/ -q          # Backend
npx vitest run                              # Frontend

# Lint
ruff check backend/                         # Python
npm run lint                                # JavaScript

# Build
npm run build                               # Frontend production build
```

### 11.3 Adding New API Endpoints

1. Create route in `backend/api/your_module.py`
2. Add router to `backend/main.py`: `app.include_router(your_router)`
3. Add tests in `backend/tests/integration/test_your_module.py`

### 11.4 Adding New Pages

1. Create `frontend/src/pages/YourPage.jsx`
2. Add route in `frontend/src/App.jsx`
3. Add nav item in `frontend/src/components/Sidebar.jsx`
4. Add breadcrumb in `frontend/src/components/Navbar.jsx`
5. Add test in `frontend/src/test/YourPage.test.jsx`

---

*Documentation generated for Healtheon OS v2.1.0*
