# Project Details: Healtheon OS

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Problem Statement & Solutions](#2-problem-statement--solutions)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [User Roles & Access Control](#5-user-roles--access-control)
6. [Complete UI Flow](#6-complete-ui-flow)
7. [Database Schema (17 Tables)](#7-database-schema-17-tables)
8. [API Endpoints (~91 Endpoints)](#8-api-endpoints-91-endpoints)
9. [AI Agent System](#9-ai-agent-system)
10. [Educational Features (FYP-Specific)](#10-educational-features-fyp-specific)
11. [Security Implementation](#11-security-implementation)
12. [Special Features](#12-special-features)
13. [Testing Coverage](#13-testing-coverage)
14. [Deployment & Configuration](#14-deployment--configuration)
15. [Complete Feature List](#15-complete-feature-list)

---

## 1. Project Overview

**Healtheon OS** is a secure, AI-powered clinical decision support platform designed as a Final Year Project (FYP). It combines multi-agent AI reasoning with role-based healthcare management, featuring a hidden admin panel, real-time WebSocket streaming, persistent storage, and an orbital timeline visualization of the AI diagnostic pipeline.

### Key Metrics
| Metric | Value |
|---|---|
| Total API Endpoints | ~91 |
| Database Tables | 17 |
| Frontend Pages | 37 |
| Reusable Components | 16 |
| AI Agent Types | 10 |
| Unit Tests | 138 (backend) |
| Frontend Tests | 150 |
| Total Tests | 288 |
| Frontend Bundle (gzipped) | ~198 KB JS + ~126 KB CSS |

---

## 2. Problem Statement & Solutions

### Problems Addressed

| Problem | Solution |
|---|---|
| No unified clinical AI platform with admin controls | Full role-based system with hidden admin panel |
| No real-time AI diagnostic streaming | WebSocket-based group chat with 10 specialized agents |
| No persistent user/patient data | SQLAlchemy + SQLite (PostgreSQL-ready) |
| No multi-step registration with approval | 3-step signup → admin approval → email notification |
| No structured diagnostic output | Confidence tables, differential rankings, reasoning trace trees |
| No feedback mechanism for AI cases | Thumbs up/down feedback per user per case |
| No diagnostic quality scoring | Diagnostic Reasoning Score (DRS) with 5 dimensions |
| No student learning mode | Multi-step Socratic learning with guess-first predictions |
| No medical image analysis | Multi-file case attachments with GPT-4o Vision analysis |
| No health document processing | 15 auto-detected document types with AI analysis |
| No case similarity search | pgvector + brute-force cosine similarity engine |
| No clinical export standard | FHIR R4 Bundle export |
| No agent memory/pattern learning | Persistent agent memory with pattern recognition |

---

## 3. Technology Stack

### Backend
| Technology | Purpose |
|---|---|
| Python 3.11 | Runtime |
| FastAPI | Web framework |
| SQLAlchemy 2.0 | ORM |
| SQLite / PostgreSQL | Database |
| JWT (PyJWT) | Authentication |
| passlib + bcrypt 4.1.3 | Password hashing |
| websockets | Real-time streaming |
| smtplib (stdlib) | Email verification |
| autogen 0.4 | Multi-agent orchestration |
| hashlib + struct | Local embedding fallback |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| Vite 8 | Build tool |
| React Router v7 | Client-side routing |
| Axios | HTTP client |
| Vitest | Unit testing |
| react-d3-tree | Reasoning trace visualization |
| react-markdown | Markdown rendering |
| Lucide React | Icons (lazy-loaded) |
| react-hot-toast | Notifications |
| jsdom | Test environment |

### AI / LLM
| Technology | Purpose |
|---|---|
| OpenAI GPT-4o | Primary LLM + Vision |
| Ollama (local) | Free local LLM alternative |
| Groq | Free tier cloud LLM |
| Hash-based fallback | When no LLM available |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Healtheon OS Architecture                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                    Frontend (React 19 + Vite 8)               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐    │   │
│  │  │  Public   │ │ Patient  │ │ Doctor   │ │ Hidden Admin │    │   │
│  │  │ Landing   │ │Dashboard │ │Dashboard │ │  Dashboard   │    │   │
│  │  │   Page    │ │          │ │          │ │ (Shift+Ctrl+A)│   │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │   │
│  │       │             │            │               │            │   │
│  │  ┌────┴─────────────┴────────────┴───────────────┴──────┐    │   │
│  │  │            Axios Interceptor (JWT Bearer)             │    │   │
│  │  └───────────────────────┬───────────────────────────────┘    │   │
│  └──────────────────────────┼────────────────────────────────────┘   │
│                              │ HTTPS (8000)                          │
│  ┌──────────────────────────┼────────────────────────────────────┐   │
│  │                    Backend (FastAPI)                           │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐    │   │
│  │  │   Auth   │ │  Cases   │ │ Patient  │ │    Admin     │    │   │
│  │  │  Router  │ │  Router  │ │  Router  │ │   (28 endpts)│    │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘    │   │
│  │       │             │            │               │            │   │
│  │  ┌────┴─────────────┴────────────┴───────────────┴──────┐    │   │
│  │  │              Orchestration Layer                      │    │   │
│  │  │  runner.py → pre-flight → pipeline → store results   │    │   │
│  │  └───────────────────────┬───────────────────────────────┘    │   │
│  │                          │                                    │   │
│  │  ┌───────────────────────┴───────────────────────────────┐    │   │
│  │  │              Agent Layer (autogen)                     │    │   │
│  │  │  GP → [ROUTE: X] → Specialist Agents → Group Chat     │    │   │
│  │  └───────────────────────┬───────────────────────────────┘    │   │
│  │                          │                                    │   │
│  │  ┌───────────────────────┴───────────────────────────────┐    │   │
│  │  │              Persistence (SQLAlchemy 2.0)              │    │   │
│  │  │  SQLite (dev) / PostgreSQL+pgvector (prod)            │    │   │
│  │  └───────────────────────────────────────────────────────┘    │   │
│  └───────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. User Roles & Access Control

### Role Hierarchy
```
Superuser (admin)
  └── Full database access (all 17 tables)
  └── 28 admin endpoints (hidden from other roles)
  └── Shift+Ctrl+A to access admin panel

Doctor
  └── View assigned patients
  └── Manage cases, prescriptions, medical records
  └── View AI pipeline results

Patient (user)
  └── Submit cases, view own data
  └── View AI pipeline results
  └── Download clinical reports
  └── Access health analysis tools
```

### Access Control Matrix
| Resource | Guest | User | Doctor | Admin |
|---|---|---|---|---|
| Landing page | ✅ | ✅ | ✅ | ✅ |
| Patient dashboard | ❌ | ✅ | ❌ | ✅ |
| Doctor dashboard | ❌ | ❌ | ✅ | ✅ |
| Admin panel (hidden) | ❌ | ❌ | ❌ | ✅ |
| Health analysis | ✅ | ✅ | ✅ | ✅ |
| Case submission | ❌ | ✅ | ✅ | ✅ |
| FHIR export | ❌ | ✅ | ✅ | ✅ |
| AI pipeline | ❌ | ✅ | ✅ | ✅ |

---

## 6. Complete UI Flow

### 6.1 Unauthenticated User Flow
```
healtheon.local/
  └── Landing Page (public)
       ├── Hero with typing animation + floating shapes + cursor trail
       ├── 5 animated feature cards (AI Agents, Real-time, Secure, Analytics, FHIR)
       ├── How It Works (3-step)
       ├── Agent Showcase (9 cards with roles)
       ├── Call to Action → Login
       └── Footer with developer info + social links
            │
            ├── Login Screen
            │    ├── Auto role detection (JWT → role)
            │    ├── Forgot Password → /forgot-password
            │    └── Register → /register (3-step)
            │
            ├── Register Flow (3 steps)
            │    ├── Step 1: Personal Info (name, email, phone, DOB)
            │    ├── Step 2: Medical Info (blood type, conditions, allergies)
            │    ├── Step 3: Review + Submit
            │    └── "Awaiting Approval" page
            │
            ├── Forgot Password Flow
            │    ├── Enter email → 6-digit code sent
            │    └── Enter code + new password → redirect to login
            │
            └── Health Analysis (accessible without login)
                 ├── Upload document (drag & drop)
                 ├── Auto-detect document type
                 ├── AI analysis with structured results
                 └── Analysis history
```

### 6.2 Patient Dashboard Flow
```
/patient (standalone layout, no sidebar)
  ├── Dashboard home
  │    ├── Patient Profile Card
  │    ├── Health Metrics charts (interactive recharts)
  │    ├── Active Prescriptions
  │    └── Recent Appointments
  ├── Appointments
  │    ├── Appointment Calendar
  │    └── New Appointment Modal
  ├── Health Records
  │    ├── Medical Records table
  │    ├── Lab Results
  │    └── Health Trends
  ├── Prescriptions
  │    ├── Active Medications
  │    └── Medication History
  ├── Messages (with doctors)
  │    └── Conversation list + chat
  ├── Notifications
  │    └── Mark read / mark all read
  ├── Profile Settings
  │    └── Edit personal/medical info
  ├── Submit New Case → PatientForm
  │    ├── Multi-step form (symptoms, history, meds, allergies, onset, duration)
  │    ├── Autocomplete inputs (300+ medical terms)
  │    └── POST /api/cases → 202 Accepted
  ├── Case Detail → CaseDetail page
  │    ├── Agent Pipeline (animated orbital timeline)
  │    ├── Specialist Messages (expandable cards)
  │    ├── Confidence Tables
  │    ├── Differential Rankings
  │    ├── Investigations (table)
  │    ├── Final Report (expandable)
  │    ├── Download Report (HTML)
  │    ├── Reasoning Trace Tree (react-d3-tree)
  │    ├── DRSDisplay (5-dimension animated bars)
  │    ├── Feedback (👍/👎)
  │    ├── Guess-First Learning Gate (3 steps)
  │    ├── Multi-file Attachments (drag & drop, AI analysis)
  │    └── Approve Findings button
  ├── Cases List
  │    └── Status cards with pipeline progress
  ├── Health Analysis
  │    ├── Upload + AI analysis
  │    └── Analysis history
  ├── About Us
  │    └── Full standalone developer page
  └── FHIR Export
       └── Download FHIR R4 Bundle (JSON)
```

### 6.3 Doctor Dashboard Flow
```
/doctor (standalone layout, no sidebar)
  ├── Dashboard home
  │    ├── Overview cards (patients, cases, pending)
  │    ├── Recent cases
  │    └── Patient activity feed
  ├── Patients list
  │    └── Patient detail with medical history
  ├── Cases management
  │    ├── Case list with filters
  │    └── Case detail → same CaseDetail as patient
  ├── Prescriptions
  │    ├── Create new prescription
  │    └── Prescription history
  ├── Appointments
  │    ├── Calendar view
  │    └── Appointment management
  ├── Medical Records
  │    └── Create/edit records
  ├── Messages
  │    └── Patient conversations
  ├── Notifications
  │    └── Mark read / mark all read
  ├── Health Analysis
  │    └── Document upload + AI analysis
  └── About Us
       └── Full standalone developer page
```

### 6.4 Admin Dashboard (Hidden) Flow
```
Admin Panel (accessed via Shift+Ctrl+A or /admin)
  ├── 8-Tab Superuser Dashboard
  │
  │    Tab 1: Overview
  │    ├── Stats cards (total users, cases, messages)
  │    ├── User distribution (role breakdown)
  │    ├── Case pipeline stats
  │    └── System health indicators
  │
  │    Tab 2: Users
  │    ├── User management table with search
  │    ├── Role filter (all/user/doctor/admin)
  │    ├── Ban/unban users
  │    ├── Change user roles
  │    └── User detail view
  │
  │    Tab 3: Cases
  │    ├── Case list with search
  │    ├── Status filters (all/pending/completed)
  │    └── Case detail (full AI pipeline results)
  │
  │    Tab 4: Agent Memory
  │    ├── Memory patterns table
  │    ├── Per-agent accuracy stats
  │    └── Pattern frequency analysis
  │
  │    Tab 5: Learning
  │    ├── All student predictions
  │    ├── Usernames attached
  │    └── Step-by-step accuracy tracking
  │
  │    Tab 6: DRS Scores
  │    ├── Average DRS scores
  │    ├── Score distribution
  │    ├── Per-case DRS details
  │    └── Dimension breakdown (completeness, accuracy, etc.)
  │
  │    Tab 7: Database
  │    ├── All 17 tables browser
  │    ├── Paginated data view
  │    └── Search within tables
  │
  │    Tab 8: System Health
  │    ├── Database size
  │    ├── LLM status
  │    ├── Row counts per table
  │    └── System runtime info
  │
  └── User Management Pages
       ├── AdminUsersPage (dedicated user management)
       └── AuditLogsPage (activity logs)
```

---

## 7. Database Schema (17 Tables)

### Core Tables

#### 1. `users`
```sql
- id: Integer, PK
- email: String(255), unique, indexed
- hashed_password: String(255)
- full_name: String(100)
- phone: String(20), nullable
- role: String(20), default="user" (user/doctor/admin)
- is_active: Boolean, default=True
- is_approved: Boolean, default=False
- avatar_color: String(7), default="#067857"
- created_at: DateTime
- last_login: DateTime, nullable
```

#### 2. `cases`
```sql
- id: Integer, PK
- user_id: Integer, FK → users.id
- title: String(200)
- symptoms: Text
- patient_history: Text
- current_medications: Text
- allergies: Text
- onset: String(100), nullable
- duration: String(100), nullable
- status: String(20), default="pending" (pending/processing/completed)
- embedding: JSON, nullable (for similarity search)
- created_at: DateTime
- completed_at: DateTime, nullable
```

#### 3. `messages`
```sql
- id: Integer, PK
- case_id: Integer, FK → cases.id
- role: String(20) (user/assistant/system)
- content: Text
- agent_name: String(100), nullable
- created_at: DateTime
```

#### 4. `case_summaries`
```sql
- id: Integer, PK
- case_id: Integer, FK → cases.id
- summary_text: Text
- confidence_score: Float
- risk_level: String(20)
- differential_rankings: JSON
- reasoning_trace: JSON
- drs_score_json: JSON
- created_at: DateTime
```

#### 5. `investigation_suggestions`
```sql
- id: Integer, PK
- case_id: Integer, FK → cases.id
- investigation: String(200)
- rationale: Text
- priority: String(20) (routine/urgent/emergent)
- category: String(50), nullable
- created_at: DateTime
```

#### 6. `refresh_tokens`
```sql
- id: Integer, PK
- token: String(500), unique
- user_id: Integer, FK → users.id
- expires_at: DateTime
- revoked: Boolean, default=False
- created_at: DateTime
```

### Extended Tables

#### 7. `appointments`
```sql
- id: Integer, PK
- patient_id: Integer, FK → users.id
- doctor_id: Integer, FK → users.id
- appointment_date: DateTime
- status: String(20), default="scheduled"
- notes: Text, nullable
- created_at: DateTime
```

#### 8. `health_metrics`
```sql
- id: Integer, PK
- user_id: Integer, FK → users.id
- metric_type: String(50) (blood_pressure/heart_rate/blood_sugar/etc)
- value: Float
- unit: String(20)
- recorded_at: DateTime
- notes: Text, nullable
```

#### 9. `medical_records`
```sql
- id: Integer, PK
- user_id: Integer, FK → users.id
- record_type: String(50) (lab_result/imaging/diagnosis/etc)
- title: String(200)
- description: Text
- file_path: String(500), nullable
- created_at: DateTime
```

#### 10. `notifications`
```sql
- id: Integer, PK
- user_id: Integer, FK → users.id
- title: String(200)
- message: Text
- is_read: Boolean, default=False
- notification_type: String(50)
- created_at: DateTime
```

#### 11. `chat_messages`
```sql
- id: Integer, PK
- sender_id: Integer, FK → users.id
- receiver_id: Integer, FK → users.id
- content: Text
- is_read: Boolean, default=False
- created_at: DateTime
```

#### 12. `prescriptions`
```sql
- id: Integer, PK
- patient_id: Integer, FK → users.id
- doctor_id: Integer, FK → users.id
- medication: String(200)
- dosage: String(100)
- frequency: String(100)
- duration: String(100)
- instructions: Text, nullable
- is_active: Boolean, default=True
- created_at: DateTime
```

#### 13. `departments`
```sql
- id: Integer, PK
- name: String(100)
- description: Text
- head_doctor_id: Integer, FK → users.id, nullable
- created_at: DateTime
```

### Educational/AI Tables

#### 14. `case_feedback`
```sql
- id: Integer, PK
- case_id: Integer, FK → cases.id
- user_id: Integer, FK → users.id
- rating: Integer (1-5)
- comment: Text, nullable
- is_positive: Boolean
- created_at: DateTime
UNIQUE(case_id, user_id) -- one feedback per user per case
```

#### 15. `student_predictions`
```sql
- id: Integer, PK
- case_id: Integer, FK → cases.id
- user_id: Integer, FK → users.id
- step_number: Integer (1-3)
- diagnosis_guess: String(200)
- urgency_guess: String(50)
- created_at: DateTime
```

#### 16. `agent_patterns`
```sql
- id: Integer, PK
- agent_name: String(100)
- pattern_type: String(50) (symptom_condition/condition_recommendation/etc)
- pattern_key: String(200)
- pattern_value: Text
- confidence: Float
- usage_count: Integer, default=1
- created_at: DateTime
- last_used: DateTime
```

#### 17. `case_attachments`
```sql
- id: Integer, PK
- case_id: Integer, FK → cases.id
- user_id: Integer, FK → users.id
- attachment_type: String(50) (ecg/xray/lab_report/photo/other)
- original_filename: String(255)
- stored_filename: String(255)
- file_path: String(500)
- file_size: Integer
- mime_type: String(100)
- ai_findings: Text, nullable
- ai_analysis_type: String(50), nullable
- metadata_json: JSON, nullable
- created_at: DateTime
```

---

## 8. API Endpoints (~91 Endpoints)

### Auth Router (12 endpoints)
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login (rate limited: 5/15min) |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/refresh` | Refresh JWT token |
| POST | `/api/auth/logout` | Logout (clear cookies) |
| GET | `/api/auth/guest-token` | Get guest JWT (rate limited: 10/15min) |
| POST | `/api/auth/send-code` | Send 6-digit verification code (rate limited: 3/10min) |
| POST | `/api/auth/verify-email` | Verify email with 6-digit code |
| POST | `/api/auth/forgot-password` | Send password reset link (rate limited: 3/hr) |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/change-password` | Change password (authenticated) |
| POST | `/api/auth/update-profile` | Update profile (authenticated) |

### Cases Router (5 endpoints)
| Method | Path | Description |
|---|---|---|
| POST | `/api/cases` | Submit new case (returns 202) |
| GET | `/api/cases` | List user's cases |
| GET | `/api/cases/{id}` | Get case detail |
| POST | `/api/cases/{id}/approve` | Approve case findings |
| POST | `/api/cases/{id}/feedback` | Submit feedback (upsert per user) |

### Admin Router (28 endpoints)
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/stats` | System statistics |
| GET | `/api/admin/health` | System health (DB, LLM, runtime) |
| GET | `/api/admin/users` | List all users |
| PUT | `/api/admin/users/{id}/role` | Change user role |
| PUT | `/api/admin/users/{id}/ban` | Ban/unban user |
| GET | `/api/admin/users/{id}` | User detail |
| GET | `/api/admin/cases` | List all cases |
| GET | `/api/admin/cases/{id}` | Case detail (full data) |
| GET | `/api/admin/database/{table}` | Query any table (paginated) |
| GET | `/api/admin/agent-memory` | All agent memory patterns |
| GET | `/api/admin/predictions` | All student predictions |
| GET | `/api/admin/feedback` | All feedback entries |
| GET | `/api/admin/drs` | DRS analytics |
| GET | `/api/admin/drs/case/{case_id}` | DRS for specific case |
| GET | `/api/admin/drs/averages` | Average DRS scores |
| GET | `/api/admin/drs/distribution` | Score distribution |
| GET | `/api/admin/health-metrics` | All health metrics |
| GET | `/api/admin/appointments` | All appointments |
| GET | `/api/admin/prescriptions` | All prescriptions |
| GET | `/api/admin/notifications` | All notifications |
| GET | `/api/admin/chat-messages` | All chat messages |
| GET | `/api/admin/medical-records` | All medical records |
| GET | `/api/admin/departments` | All departments |

### Patient Router (8 endpoints)
| Method | Path | Description |
|---|---|---|
| GET | `/api/patient/profile` | Get patient profile |
| PUT | `/api/patient/profile` | Update profile |
| GET | `/api/patient/health-metrics` | List health metrics |
| POST | `/api/patient/health-metrics` | Add health metric |
| GET | `/api/patient/medical-records` | List medical records |
| GET | `/api/patient/prescriptions` | List prescriptions |
| GET | `/api/patient/appointments` | List appointments |
| POST | `/api/patient/appointments` | Book appointment |

### Doctor Router (9 endpoints)
| Method | Path | Description |
|---|---|---|
| GET | `/api/doctor/patients` | List assigned patients |
| GET | `/api/doctor/cases` | List cases |
| GET | `/api/doctor/cases/{id}` | Case detail |
| GET | `/api/doctor/appointments` | List appointments |
| PUT | `/api/doctor/appointments/{id}` | Update appointment |
| GET | `/api/doctor/prescriptions` | List prescriptions |
| POST | `/api/doctor/prescriptions` | Create prescription |
| GET | `/api/doctor/stats` | Doctor statistics |
| GET | `/api/doctor/medical-records` | List medical records |

### Clinical Router (6 endpoints)
| Method | Path | Description |
|---|---|---|
| GET | `/api/clinical/notes` | List clinical notes |
| POST | `/api/clinical/notes` | Create clinical note |
| GET | `/api/clinical/lab-orders` | List lab orders |
| POST | `/api/clinical/lab-orders` | Order lab test |
| GET | `/api/clinical/billing` | List billing |
| POST | `/api/clinical/billing` | Create billing entry |

### Learning Router (2 endpoints)
| Method | Path | Description |
|---|---|---|
| POST | `/api/learning/cases/{id}/predict` | Submit prediction (3 steps) |
| GET | `/api/learning/predictions` | Get user's predictions |

### Multimodal Router (6 endpoints)
| Method | Path | Description |
|---|---|---|
| POST | `/api/multimodal/cases/{id}/upload` | Upload 1-5 files (ECG/X-ray/Lab/Photo/Other) |
| GET | `/api/multimodal/cases/{id}/attachments` | List attachments |
| GET | `/api/multimodal/attachments/{id}` | Get attachment detail |
| GET | `/api/multimodal/attachments/{id}/file` | Serve attachment file |
| DELETE | `/api/multimodal/attachments/{id}` | Delete attachment |
| POST | `/api/multimodal/cases/{id}/upload-image` | Legacy single-file upload |

### Health Analysis Router (6 endpoints)
| Method | Path | Description |
|---|---|---|
| POST | `/api/health/analyze` | Upload + auto-detect + AI analysis |
| GET | `/api/health/analyses` | List user's analyses |
| GET | `/api/health/analyses/{id}` | Get analysis detail |
| GET | `/api/health/files/{id}` | Serve analyzed file |
| DELETE | `/api/health/analyses/{id}` | Delete analysis |
| GET | `/api/health/supported-types` | List 15 document types |

### Messages Router (3 endpoints)
| Method | Path | Description |
|---|---|---|
| GET | `/api/messages` | List all messages |
| GET | `/api/messages/conversations` | List conversations |
| POST | `/api/messages` | Send message |

### Notifications Router (3 endpoints)
| Method | Path | Description |
|---|---|---|
| GET | `/api/notifications` | List notifications |
| PUT | `/api/notifications/{id}/read` | Mark as read |
| PUT | `/api/notifications/read-all` | Mark all as read |

### Similarity Router (1 endpoint)
| Method | Path | Description |
|---|---|---|
| GET | `/api/similarity/cases/{id}` | Find similar cases (pgvector + brute-force) |

### FHIR Router (1 endpoint)
| Method | Path | Description |
|---|---|---|
| GET | `/api/fhir/cases/{id}` | Export case as FHIR R4 Bundle |

### WebSocket (1 endpoint)
| Method | Path | Description |
|---|---|---|
| WS | `/ws/cases/{id}` | Real-time AI pipeline streaming |

---

## 9. AI Agent System

### Agent Roster
| Agent | Role | Specialty |
|---|---|---|
| **GP Agent** | General Practitioner | Triage, routing to specialists |
| **Cardiologist** | Heart specialist | Cardiac conditions, ECG analysis |
| **Neurologist** | Brain specialist | Neurological conditions |
| **Pulmonologist** | Lung specialist | Respiratory conditions |
| **Endocrinologist** | Hormone specialist | Metabolic/hormonal conditions |
| **Gastroenterologist** | GI specialist | Digestive system conditions |
| **Dermatologist** | Skin specialist | Dermatological conditions |
| **Hematologist** | Blood specialist | Blood disorders |
| **Nephrologist** | Kidney specialist | Renal conditions |
| **Oncologist** | Cancer specialist | Cancer screening/triage |

### Pipeline Flow
```
User submits case
  → runner.py pre-flight (LLM availability check)
  → GP Agent receives case + 300-term medical dictionary
  → GP outputs [ROUTE: cardiological] tag
  → get_agents_from_route() parses tag → activates Cardiologist
  → Group chat: GP + Cardiologist + Clinical Guardrails
  → Specialist outputs Differential Rankings + Confidence Assessment
  → Hidden <JSON_DIFFERENTIALS> tag for DRS scoring
  → Final summary stored in DB
  → DRS auto-scored (5 dimensions)
  → Agent memory patterns extracted & stored
  → Embedding generated for similarity search
  → WebSocket streams all agent messages to frontend
```

### Smart Demo Mode (No LLM)
When no LLM provider is available:
- Pre-flight detects Ollama/Groq/OpenAI status
- Falls back to keyword-based dynamic analysis
- Generates 7 agent responses with routing tags
- Includes confidence tables and differential rankings
- All data stored in DB identically to real pipeline

---

## 10. Educational Features (FYP-Specific)

### 10.1 Confidence Tables
Every specialist automatically generates:
- **Differential Rankings**: Top 5 possible diagnoses with percentages
- **Confidence Assessment**: Agent's confidence in its analysis
- **Hidden `<JSON_DIFFERENTIALS>`**: Machine-readable for DRS scoring

### 10.2 Reasoning Trace Tree
- Visual tree showing diagnostic reasoning steps
- Built by `ReasoningTreeBuilder` class
- Rendered via `react-d3-tree` in CaseDetail
- Expandable/collapsible nodes

### 10.3 Diagnostic Reasoning Score (DRS)
5 dimensions scored 0-100:
1. **Completeness** — Did agent consider all relevant factors?
2. **Accuracy** — Are differentials medically appropriate?
3. **Specificity** — Are findings specific vs vague?
4. **Evidence-Based** — Is reasoning grounded in evidence?
5. **Clinical Reasoning** — Logical flow from symptoms to diagnosis

Scored via LLM (Groq/OpenAI/Ollama) with heuristic fallback.

### 10.4 Multi-Step Socratic Learning
3-step learning mode:
1. **Step 1**: Student predicts top diagnosis
2. **Step 2**: Student predicts urgency level
3. **Step 3**: Student provides reasoning

Each step unlocks the next. "You vs AI" comparison after all steps.

### 10.5 Guess-First Learning Gate
- CaseDetail initially shows locked "Learning Mode"
- Student must make predictions before seeing AI results
- Prevents anchoring bias
- Tracks accuracy over time

### 10.6 Case Similarity Engine
- pgvector for PostgreSQL (cosine similarity)
- Brute-force fallback for SQLite
- Embeddings stored per case
- "Find similar cases" endpoint

### 10.7 FHIR R4 Export
- Exports case as valid FHIR Bundle
- Includes: Patient, Observations, ServiceRequests, DocumentReference
- `application/fhir+json` Content-Type
- Downloadable from CaseDetail

### 10.8 Medical Image Upload
- Multi-file drag-and-drop (1-5 files)
- 5 attachment types: ECG, X-ray, Lab Report, Photo, Other
- GPT-4o Vision analysis per type
- Type-specific prompts (ECG: rate/rhythm/ST/T-waves; X-ray: anatomy/fractures)

### 10.9 Health Document Analysis
15 auto-detected document types:
| Category | Types |
|---|---|
| Blood Tests | blood_test, metabolic_panel, lipid_panel, thyroid_panel |
| Diabetes | diabetes_panel |
| Urine | urine_test |
| Cardiac | ecg, cardiac_marker |
| Imaging | chest_xray, imaging_other |
| Genetics | dna_genetic |
| Hormones | hormone_panel |
| Coagulation | coagulation_panel |
| Vitamins | vitamin_mineral_panel |
| Infectious | infectious_disease |

### 10.10 Agent Memory & Pattern Recognition
- Stores symptom→condition patterns
- Stores condition→recommendation patterns
- Confidence tracking per pattern
- Usage count for frequency analysis
- Admin can view all patterns in Agent Memory tab

---

## 11. Security Implementation

### Authentication
| Feature | Implementation |
|---|---|
| Password hashing | bcrypt 4.1.3 via passlib |
| JWT tokens | 30min access, HTTP-only cookies for guests |
| Refresh tokens | 7-day, stored in DB, rotated on use |
| Guest access | Unique `guest_xxxxx` ID, 30min expiry |
| Email verification | 6-digit codes, 10min expiry |
| Password reset | JWT-based tokens, separate secret, 1hr expiry |

### Password Complexity (Enforced)
- Minimum 10 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character

### Rate Limiting
| Endpoint | Limit |
|---|---|
| Login | 5 attempts / 15 min |
| Register | 3 attempts / hour |
| Guest token | 10 requests / 15 min |
| Send code | 3 requests / 10 min |
| Password reset | 3 requests / hour |

### CORS & Headers
- CORS restricted to `localhost:5173`, `localhost:8000`, `127.0.0.1`
- Error details hidden in production
- WebSocket requires valid JWT

### RBAC Enforcement
- Every page load validates JWT against `/api/auth/me`
- Role-based route guards in frontend
- Backend endpoints filter by `user_id`
- Admin endpoints require `role == "admin"`

---

## 12. Special Features

### 12.1 Animated Logo
- Dynamic SVG with orbital dots, pulsing nodes, rotating rings
- Heartbeat center with sparkle stars
- Connection lines between nodes
- 4-stop gradient text (green shades)
- Hover scale effect

### 12.2 Animated Backgrounds (10+)
| Component | Description |
|---|---|
| Aurora | Canvas-based gradient waves |
| FloatingShapes | CSS-animated geometric shapes |
| CursorTrail | Mouse-following sparkle particles |
| RippleButton | Click ripple effect |
| GlowCard | Hover glow animation |
| GlassCard | Glassmorphism with backdrop blur |
| AnimatedBorder | Rotating gradient border |
| Typewriter | Character-by-character reveal |
| ScrollReveal | Intersection Observer animations |
| Confetti | Celebration particles |

### 12.3 Radial Orbital Timeline
- Pure JSX + CSS, transparent background
- White node circles with green accents
- Animated connection lines
- Click nodes to expand specialist details
- Pipeline progress indicator

### 12.4 Autocomplete Inputs
- 300+ medical terms (120 symptoms, 100 conditions, 130 medications, 60 allergens)
- Keyboard navigation (↑↓ Enter Esc)
- Fuzzy matching
- Multi-value token support (comma-separated)

### 12.5 Support Modal
- 3 tabs: Contact Us, Complaint, Developer
- Floating animated SVG social icons
- Developer profile with photo
- Complaint form with categories
- Social links: LinkedIn, Facebook, Instagram, GitHub, WhatsApp, X

### 12.6 About Us Page
- Full standalone page (not modal)
- Green gradient hero with floating orbs
- Developer photo with glow ring
- Stats grid with animated numbers
- Skills with animated progress bars
- Journey timeline
- Social grid with hover effects

### 12.7 Landing Page
- Hero with typing animation
- 5 feature cards with icons
- 3-step "How It Works"
- 9 agent showcase cards
- CTA section
- Footer with developer info

### 12.8 Downloadable Reports
- HTML-styled clinical reports
- Includes: patient info, symptoms, agent messages, DRS score, summary
- Download from CaseDetail page

---

## 13. Testing Coverage

### Backend Unit Tests (138 tests, all passing)
| Test File | Tests | Coverage |
|---|---|---|
| `test_auth.py` | 49 | JWT, login, register, rate limiting, validation |
| `test_clinical_guardrails.py` | 39 | Guardrails, escalation, confidence tables |
| `test_agent_memory.py` | 13 | Store/recall/stats, pattern recognition |
| `test_drs_scorer.py` | 14 | DRS scoring, heuristic fallback |
| `test_fhir_export.py` | 11 | FHIR Bundle, Patient, Observations |
| `test_learning.py` | 10 | Student predictions, step validation |
| `test_password_reset.py` | 10 | Token creation, verification, expiry |

### Frontend Unit Tests (150 tests, all passing)
| Test File | Tests | Coverage |
|---|---|---|
| `LoginScreen.test.jsx` | 13 | Login form, validation, navigation |
| `LandingPage.test.jsx` | 12 | Landing page sections, animations |
| `AboutUsPage.test.jsx` | 17 | About page, developer profile |
| `ForgotPasswordPage.test.jsx` | 9 | Password reset flow |
| `ResetPasswordPage.test.jsx` | 12 | New password form, strength indicator |
| `App.test.jsx` | 10 | Routing, auth context |
| `Navbar.test.jsx` | 14 | Navigation, support modal |
| `Sidebar.test.jsx` | 12 | Role-based nav items |
| `AuthContext.test.jsx` | 12 | Login, logout, guest mode |
| `PatientDashboard.test.jsx` | 10 | Dashboard layout, data display |
| `DoctorDashboard.test.jsx` | 11 | Doctor-specific features |
| `AdminDashboard.test.jsx` | 13 | Admin panel, 8 tabs |
| `PatientForm.test.jsx` | 13 | Form submission, validation |

### CI Pipeline
```yaml
# .github/workflows/test.yml
- Backend: ruff lint + pytest + coverage
- Frontend: eslint + vitest + coverage
- Build: Vite production build
- Artifact: Coverage reports uploaded
```

---

## 14. Deployment & Configuration

### Quick Start
```bash
# Backend
pip install -r requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

### Environment Variables (.env)
```env
SECRET_KEY=your-secret-key
ADMIN_PASSWORD=Admin@2026
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=sk-... (optional, for Vision)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password
SMTP_FROM=no-reply@healtheon.local
```

### Test Accounts
| Role | Email | Password |
|---|---|---|
| Admin | admin@healtheon.local | Admin@2026 |
| Doctor | sarah@hospital.edu | Doctor123! |
| Patient | john@patient.com | Patient123! |

### Directory Structure
```
healtheon/
├── backend/
│   ├── api/           # 11 route modules (~91 endpoints)
│   ├── agents/        # 10 AI agents
│   ├── services/      # agent_memory, embedding_service
│   ├── orchestration/ # runner.py, group_chat.py
│   ├── db/            # database.py, models.py, models_extended.py
│   ├── auth.py        # JWT + password hashing
│   ├── security.py    # Rate limiting, cookies
│   ├── config.py      # Settings
│   ├── email_service.py # SMTP email
│   ├── main.py        # FastAPI app
│   ├── seed_data.py   # Demo data seeding
│   ├── uploads/       # Case attachments
│   │   └── health/    # Health analysis files
│   └── tests/         # 138 unit tests
├── frontend/
│   ├── src/
│   │   ├── pages/     # 37 page components
│   │   ├── components/ # 16 reusable components
│   │   ├── api.js     # All API functions
│   │   ├── App.jsx    # Routes
│   │   └── context/   # AuthContext
│   ├── public/        # Static assets
│   └── test/          # 150 tests
├── .github/workflows/ # CI pipeline
├── docs/              # Documentation
└── project_details.md # This file
```

---

## 15. Complete Feature List

### Authentication & Access
- [x] Single login with auto role detection
- [x] 3-step registration with admin approval
- [x] Email verification (6-digit codes via SMTP)
- [x] Password reset (JWT tokens, email flow)
- [x] Password strength indicator (5-level scoring)
- [x] Guest access without login
- [x] Hidden admin panel (Shift+Ctrl+A)
- [x] JWT refresh token rotation
- [x] HTTP-only cookies for guests
- [x] Rate limiting on auth endpoints

### Patient Features
- [x] Patient dashboard (standalone layout)
- [x] Health metrics with interactive charts
- [x] Medical records management
- [x] Prescription tracking
- [x] Appointment booking
- [x] Case submission with autocomplete
- [x] Real-time AI pipeline streaming
- [x] Downloadable clinical reports (HTML)
- [x] FHIR R4 export
- [x] Guess-first learning mode
- [x] Multi-step Socratic learning (3 steps)
- [x] Case similarity search
- [x] Health document analysis (15 types)
- [x] Medical image upload with AI analysis
- [x] Feedback system (👍/👎)

### Doctor Features
- [x] Doctor dashboard
- [x] Patient list with filters
- [x] Case management
- [x] Prescription creation
- [x] Appointment management
- [x] Medical record creation
- [x] Patient messaging

### Admin Features
- [x] 8-tab superuser dashboard
- [x] System statistics
- [x] User management (ban, role change)
- [x] Database browser (17 tables)
- [x] Agent memory patterns viewer
- [x] Student predictions viewer
- [x] DRS analytics (averages, distribution)
- [x] System health monitoring

### AI & Educational
- [x] 10 specialized AI agents
- [x] GP routing with [ROUTE:] tags
- [x] Confidence tables (Differential Rankings)
- [x] Reasoning trace tree (react-d3-tree)
- [x] Diagnostic Reasoning Score (5 dimensions)
- [x] Multi-step Socratic learning
- [x] Guess-first learning gate
- [x] Case similarity (pgvector + brute-force)
- [x] Agent memory & pattern recognition
- [x] FHIR R4 Bundle export
- [x] Medical image analysis (GPT-4o Vision)
- [x] Health document auto-detection (15 types)
- [x] Smart demo mode (no LLM required)

### UI/UX
- [x] Pure white clinical UI
- [x] Medical Green #067857 primary
- [x] Animated SVG logo
- [x] 10+ animated components
- [x] Radial orbital timeline
- [x] Autocomplete medical inputs
- [x] Drag-and-drop file upload
- [x] Real-time notifications
- [x] Breadcrumb navigation
- [x] Responsive design
- [x] Error boundary
- [x] Toast notifications

### Security
- [x] JWT authentication
- [x] bcrypt password hashing
- [x] RBAC enforcement
- [x] Rate limiting
- [x] CORS restrictions
- [x] Password complexity validation
- [x] Email verification
- [x] Password reset tokens
- [x] HTTP-only cookies
- [x] Refresh token rotation

### Testing & CI
- [x] 138 backend unit tests
- [x] 150 frontend unit tests
- [x] GitHub Actions CI pipeline
- [x] ruff linting
- [x] eslint linting
- [x] Vitest test runner
- [x] Coverage reports
- [x] Build verification

---

*Document generated for Healtheon OS — Final Year Project*
