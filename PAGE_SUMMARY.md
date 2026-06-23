# 📖 Healtheon UI Pages - Executive Summary

## Overview
Healtheon is a **7-page React application** for managing multi-agent AI medical case analysis. Each page serves a specific role in the clinical workflow or system administration.

---

## 📄 The 7 Pages

### 1️⃣ **Dashboard** (`/`)
- **What**: Central hub for case management
- **Who**: All users
- **Key Elements**:
  - Real-time case statistics (Total, Processing, Completed, Failed)
  - Interactive case grid with color-coded status badges
  - Quick actions: "Load Demo Case" & "New Case"
  - Auto-refreshes every 5 seconds
- **User Interaction**:
  - Click a case card → View details
  - Click "New Case" → Go to form
  - Click "Load Demo" → Pre-fill form with sample data

---

### 2️⃣ **Patient Form** (`/submit`)
- **What**: Case submission interface
- **Who**: Doctors/researchers submitting cases
- **Key Elements**:
  - 8 input fields (1 required, 7 optional)
  - Severity slider (visual feedback)
  - Educational disclaimer banner
  - Form validation & error messages
- **User Interaction**:
  - Fill medical information
  - Click "Launch Agent Pipeline"
  - System creates case in database
  - Redirects to case detail page
  - Agents begin processing automatically

**Form Fields**:
| Field | Required | Type |
|-------|----------|------|
| Chief Complaint | ✅ | Text |
| Onset | ❌ | Text |
| Duration | ❌ | Text |
| Severity | ❌ | Slider 1-10 |
| Associated Symptoms | ❌ | Textarea |
| Past Medical History | ❌ | Textarea |
| Current Medications | ❌ | Textarea |
| Allergies | ❌ | Text |

---

### 3️⃣ **Case Detail** (`/cases/:caseId`)
- **What**: Real-time case processing monitor
- **Who**: Doctors watching AI agents work
- **Key Elements**:
  - **Agent Transcript** (center): Live conversation between 7 agents
  - **Thinking Timeline** (right): Agent progression visual
  - **Synthetic Vitals** (right): Dynamic vital signs
  - Status indicator (Pending/Processing/Done/Failed)
  - Action buttons (Approve, Rerun Pipeline)

**What Happens Here**:
1. Page loads case from API
2. Starts polling every 4 seconds
3. Displays live agent transcript
4. Shows thinking progress timeline
5. Updates vitals dynamically
6. Stops polling when case completes
7. Shows final report

**Agent Order** (7 agents):
1. 🔵 Intake Agent - Structures symptoms
2. 🟢 GP Agent - Triages patient
3. 🔴 Cardiologist - Cardiac analysis
4. 🟣 Neurologist - Neuro assessment
5. 🔵 Pulmonologist - Respiratory eval
6. 🟠 Pathologist - Lab analysis
7. 🟡 Summarizer - Final report

---

### 4️⃣ **Patient Record** (`/record`)
- **What**: Detailed medical record with live monitoring
- **Who**: Doctors needing comprehensive view
- **Key Elements**:
  - **Left Column**:
    - Case status, phase, confidence score
    - Agent collaboration timeline with messages
    - Live agent typing indicator
  - **Right Column**:
    - Live vital signs (HR, BP, SpO₂, RR)
    - Clinical history
    - Pathology findings table
  - Color-coded agent messages
  - Professional glassmorphism design

**Vitals Display**:
- Heart Rate: 115 bpm (red if high)
- Blood Pressure: 155/95 (amber if elevated)
- SpO₂: 92% (cyan normal range)
- Respiratory Rate: 24/min

---

### 5️⃣ **System Orchestration** (`/orchestration`)
- **What**: Admin configuration panel
- **Who**: System administrators
- **Key Elements**:
  - **Profile Section**: Chief Medical Officer info
  - **AI Settings**: Model selection, temperature control
  - **Security**: 2FA, session timeout, audit logs
  - **Alerts**: Notification protocol toggles
  - **Visual Settings**: Theme, glassmorphism, accent colors

**Configuration Options**:
- LLM Model: Claude 3.5 Sonnet (active) or GPT-4o Medical (standby)
- Temperature Slider: 0.1 (Precision) ↔ 1.0 (Creative)
- Security Options: 2FA toggles, timeout settings
- Alerts: Case alerts, consensus updates, maintenance logs
- Theme: Dark Mode (default), Light Mode
- Colors: 5 accent color choices

---

### 6️⃣ **Agent Fleet** (`/fleet`)
- **What**: Agent management & configuration
- **Who**: System administrators
- **Key Elements**:
  - **Fleet List** (left):
    - 3 agent cards (GP, Pathologist, Treatment)
    - Model engine & role type per agent
    - Edit/delete actions
  - **Global Parameters**:
    - Max debate rounds (1-10)
    - Consensus threshold (0-100%)
    - Safety level (Strict/Moderate/Lenient)
  - **Agent Editor** (right):
    - System prompt textarea
    - Tool checkboxes (query_specialist, request_lab_data, etc.)
    - Temperature & max tokens settings
    - Save agent button

**Agent Types**:
1. **GP Agent** (Orchestrator role)
   - Model: Llama-3-8B
   - Primary diagnostic interface

2. **Pathologist Agent** (Specialist role)
   - Model: Llama-3-8B
   - Analyzes lab results

3. **Treatment Agent** (Consultant role)
   - Model: GPT-4o
   - Formulates treatment plans

---

### 7️⃣ **Case Analytics** (`/analytics`)
- **What**: Case comparison & AI consensus view
- **Who**: Doctors reviewing case context
- **Key Elements**:
  - **Composite Confidence**: Donut chart (e.g., 94% match)
  - **Consensus Delta**: Agent agreement percentages
    - GP Agent: 92%
    - Pathologist: 98%
    - Cardiologist: 95%
  - **Historical Archive**: Similar past cases table
  - **Synthesis Engine**: AI summary of findings

**What This Shows**:
- How well agents agree (consensus %)
- Historical case similarity scores
- Match percentages vs. past diagnoses
- Key diagnostic vectors & findings

---

## 🔄 Complete User Journey

```
1. USER VISITS DASHBOARD (/)
   └─ Sees all existing cases
   └─ Views live statistics
   └─ Clicks "New Case" button

2. USER FILLS FORM (/submit)
   └─ Enters patient information
   └─ Validates chief complaint (required)
   └─ Clicks "Launch Agent Pipeline"
   └─ Form submits to backend

3. BACKEND PROCESSES
   └─ Creates case record (PENDING)
   └─ Queues background task
   └─ Returns case_id & redirects

4. USER MONITORS CASE (/cases/:caseId)
   └─ Sees status: PROCESSING
   └─ Watches live agent transcript
   └─ Sees thinking timeline progress
   └─ Vitals update dynamically
   └─ Polling every 4 seconds

5. AGENTS WORK (Backend)
   └─ Intake → GP → Specialists
   └─ Debate phase (up to 3 rounds)
   └─ Pathologist finalizes
   └─ Summarizer generates report
   └─ Status changes to: DONE

6. USER REVIEWS RESULTS (/cases/:caseId)
   └─ Sees full transcript
   └─ Reads final summary
   └─ Reviews recommendations
   └─ Clicks "Approve" button

7. OPTIONAL: DEEP DIVE
   └─ Click "View Patient Record" (/record)
   └─ See detailed timeline + vitals
   └─ Review pathology findings
   └─ Check case analytics (/analytics)

8. OPTIONAL: ADMIN TASKS
   └─ System Orchestration (/orchestration)
   └─ Agent Fleet (/fleet)
   └─ Reconfigure as needed
```

---

## 🎨 Visual Design Summary

**Color System**:
- **Primary (Cyan)**: #22d3ee - Accents, buttons, highlights
- **Secondary (Green)**: #10b981 - GP agent, success
- **Danger (Red)**: #ef4444 - Cardiologist agent, errors
- **Gray**: #94a3b8 - Text, borders

**Component Types**:
- `glass-panel`: Frosted glass containers
- `btn`: Interactive buttons
- `pill`: Status badges
- `card`: Content containers
- `spinner`: Loading indicators

**Theme**:
- Dark glassmorphism (base: #0e1416)
- Semi-transparent overlays (5-20% opacity)
- Backdrop blur effects
- Glow/shadow emphasis effects

---

## 📊 API Endpoints by Page

| Page | HTTP Method | Endpoint | Purpose |
|------|------------|----------|---------|
| Dashboard | GET | `/api/cases` | List all cases |
| Form | POST | `/api/cases` | Create new case |
| Form | GET | `/api/synthetic/cases/random` | Load demo |
| Detail | GET | `/api/cases/{id}` | Get case + transcript |
| Detail | POST | `/api/cases/{id}/run` | Rerun pipeline |
| Others | (display only) | (none) | No API calls |

---

## 🔌 Polling Strategy

| Page | Frequency | Purpose | Stops When |
|------|-----------|---------|-----------|
| Dashboard | Every 5s | Keep stats fresh | Unmounts |
| Case Detail | Every 4s | Real-time updates | Status=done\|failed |
| Patient Record | (static) | Display only | N/A |
| Orchestration | (static) | Config only | N/A |
| Fleet | (static) | Config only | N/A |
| Analytics | (static) | Display only | N/A |

---

## 🛠️ Technology per Page

| Page | Key Tech | Libraries |
|------|----------|-----------|
| Dashboard | React hooks, polling | axios, react-router |
| Form | React hooks, validation | react-router, axios |
| Case Detail | Polling, markdown | react-markdown, axios |
| Record | Static display | react (no API) |
| Orchestration | Static display | react (no API) |
| Fleet | Form handling | react (no API) |
| Analytics | Data visualization | react (no API) |

---

## ⚡ Performance Notes

- **Polling**: 4-5 second intervals balance responsiveness & efficiency
- **Form Validation**: Happens on submit, not keystroke
- **Markdown**: Rendered only when needed (Case Detail)
- **Component Re-renders**: Optimized with useCallback & useRef
- **Polling Cleanup**: Cleared on unmount to prevent memory leaks

---

## 📋 Key Features by Page

| Feature | Page | Implementation |
|---------|------|-----------------|
| Real-time updates | Dashboard, Detail | setInterval polling |
| Agent transcript | Detail, Record | Messages table + polling |
| Thinking timeline | Detail | useEffect animation |
| Vital signs | Detail, Record | Calculated from severity |
| Form validation | Form | Pydantic backend + react |
| Configuration | Orchestration, Fleet | Form inputs (frontend only) |
| Case comparison | Analytics | Static historical data |

---

## 🚀 Getting Started (User View)

1. **First Time User**:
   - Navigate to http://localhost:5173
   - Click "New Case" → Fill form → Watch agents work

2. **Quick Demo**:
   - Click "Load Demo Case" → Pre-filled form → Submit

3. **Monitor Case**:
   - Refreshing page 1-2 times while processing shows updates
   - Every 4 seconds auto-refresh happens

4. **Review Results**:
   - Case Detail page shows full report
   - Patient Record page shows formatted timeline
   - Analytics shows consensus & comparison

5. **Admin Functions**:
   - System Orchestration: Configure LLM & security
   - Agent Fleet: Edit agent prompts & parameters

---

## ✅ Completeness Checklist

- ✅ 7 Pages implemented
- ✅ All pages connected with routing
- ✅ Real-time polling for dynamic updates
- ✅ Agent transcript with color coding
- ✅ Form validation & error handling
- ✅ Admin configuration panels
- ✅ Responsive design (glassmorphism)
- ✅ Accessibility considerations
- ✅ Educational disclaimers on all pages
- ✅ Professional UI/UX design

---

## 📝 Page Modification Guide

If you need to enhance any page:

1. **Dashboard**: Add filters, sorting, export buttons
2. **Form**: Add more medical fields, templates, history
3. **Case Detail**: Add screenshots, recommendations panel
4. **Record**: Add more vital signs, medication panel
5. **Orchestration**: Add API key rotation, backup options
6. **Fleet**: Add agent health monitoring, performance metrics
7. **Analytics**: Add advanced filtering, prediction models

---

## 🎓 Educational Value

This system demonstrates:
- ✅ Multi-agent AI orchestration (Microsoft AutoGen)
- ✅ Real-time web communication (polling pattern)
- ✅ Clinical workflow modeling
- ✅ React SPA architecture
- ✅ FastAPI backend design
- ✅ SQLite data persistence
- ✅ Responsive UI/UX
- ✅ Error handling & resilience

---

**Documentation Version**: 2.0
**Last Updated**: 2024
**Status**: ✅ Complete
**Total Pages**: 7
**Total Components**: 50+
**Lines of Frontend Code**: 2000+
**Lines of Backend Code**: 1500+
