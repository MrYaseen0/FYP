# 🚀 Healtheon UI - Quick Navigation Guide

## Page Overview at a Glance

```
┌─ Healtheon Dashboard ──────────────────────────────────┐
│                                                        │
│  Route: /                                              │
│  Purpose: View all cases & create new ones             │
│                                                        │
│  Features:                                             │
│  • Case statistics (Total, Processing, Completed)      │
│  • Case grid with cards showing status                 │
│  • "Load Demo Case" - quick demo data                  │
│  • "New Case" - submit patient case                    │
│                                                        │
│  Data Flow: Polls /api/cases every 5 seconds           │
└────────────────────────────────────────────────────────┘
```

```
┌─ Patient Form ─────────────────────────────────────────┐
│                                                        │
│  Route: /submit                                        │
│  Purpose: Submit new patient cases                     │
│                                                        │
│  Form Fields:                                          │
│  ✓ Chief Complaint (required)                          │
│  ○ Onset, Duration, Severity                           │
│  ○ Associated Symptoms, PMH, Medications, Allergies   │
│                                                        │
│  Action: "Launch Agent Pipeline"                       │
│  Result: Redirects to /cases/{caseId}                 │
└────────────────────────────────────────────────────────┘
```

```
┌─ Case Detail ──────────────────────────────────────────┐
│                                                        │
│  Route: /cases/:caseId                                 │
│  Purpose: Real-time case processing view               │
│                                                        │
│  Sections:                                             │
│  ▪ Agent Transcript (center)                           │
│    - Live conversation between agents                  │
│    - Markdown rendering                               │
│    - Color-coded by agent                             │
│                                                        │
│  ▪ Thinking Timeline (right)                           │
│    - Agent progression (Intake → Summarizer)           │
│    - Current active agent highlighted                 │
│                                                        │
│  ▪ Synthetic Vitals (right)                            │
│    - Heart Rate, BP, SpO2, Resp Rate                   │
│    - Dynamic based on severity                        │
│                                                        │
│  Status States:                                        │
│  🟡 PENDING - Waiting to start                         │
│  🔵 PROCESSING - Agents actively working               │
│  🟢 DONE - Pipeline completed                          │
│  🔴 FAILED - Error occurred                            │
│                                                        │
│  Polling: Every 4 seconds (auto-stops when done)       │
└────────────────────────────────────────────────────────┘
```

```
┌─ Patient Record ───────────────────────────────────────┐
│                                                        │
│  Route: /record                                        │
│  Purpose: Detailed medical record view                 │
│                                                        │
│  Left Column:                                          │
│  • Case Status (Status + Phase + Confidence)           │
│  • Agent Collaboration Timeline                        │
│    - Timeline of all agent messages                    │
│    - Color-coded by agent type                        │
│    - Shows lab findings & analysis                     │
│                                                        │
│  Right Column:                                         │
│  • Live Vital Signs (Heart Rate, BP, SpO2, RR)        │
│  • Clinical History (PMH, Allergies)                   │
│  • Pathologist Insights (Lab values table)             │
│                                                        │
│  Design: Glassmorphism with glow effects               │
└────────────────────────────────────────────────────────┘
```

```
┌─ System Orchestration ─────────────────────────────────┐
│                                                        │
│  Route: /orchestration                                 │
│  Purpose: Admin configuration panel                    │
│                                                        │
│  Sections:                                             │
│  ✓ Profile (Chief Medical Officer details)            │
│  ✓ AI Orchestration (Model selection, temp, API key)  │
│  ✓ Security Vault (2FA, session timeout, audit logs)  │
│  ✓ Alert Protocols (Notifications toggles)            │
│  ✓ Visual Interface (Theme, glassmorphism, accent)    │
│                                                        │
│  Action: "Apply Configuration"                        │
│  Design: Professional medical interface                │
└────────────────────────────────────────────────────────┘
```

```
┌─ Agent Fleet Configuration ────────────────────────────┐
│                                                        │
│  Route: /fleet                                         │
│  Purpose: Manage autonomous medical agents             │
│                                                        │
│  Left Column:                                          │
│  • Fleet list (3 nodes online)                         │
│  • Agent cards (GP, Pathologist, Treatment)           │
│    - Model engine, Role type                          │
│  • Global parameters                                   │
│    - Max debate rounds                                │
│    - Consensus threshold                              │
│    - Safety level                                     │
│                                                        │
│  Right Column:                                         │
│  • Agent Configuration Panel                           │
│    - System prompt editor                             │
│    - Tool checkboxes                                  │
│    - Temperature & token settings                     │
│    - Save button                                      │
│                                                        │
│  Design: Glass-panel with color-coded borders         │
└────────────────────────────────────────────────────────┘
```

```
┌─ Case Comparison Analysis ─────────────────────────────┐
│                                                        │
│  Route: /analytics                                     │
│  Purpose: Compare case against historical cases        │
│                                                        │
│  Left Column:                                          │
│  • Composite Match Confidence (large donut chart)     │
│  • Consensus Delta (agent agreement percentages)       │
│  • Historical Archive Table                            │
│    - Similar past cases                               │
│    - Match percentages & outcomes                     │
│                                                        │
│  Right Column:                                         │
│  • Synthesis Engine Summary                            │
│    - AI consensus explanation                         │
│    - Key findings & vectors                           │
│                                                        │
│  Design: Data visualization focus                      │
└────────────────────────────────────────────────────────┘
```

---

## 🔄 Main User Workflows

### Workflow 1: Submit & Monitor Case
```
1. Dashboard (/) 
   ↓ Click "New Case"
2. Patient Form (/submit)
   ↓ Fill form + Click "Launch Agent Pipeline"
3. Case Detail (/cases/:caseId)
   ↓ Watch real-time processing
   ↓ Polling every 4 seconds
4. View Results (Done/Failed)
   ↓ Click "Approve" or "Rerun"
```

### Workflow 2: Review Patient Record
```
Dashboard (/) → Click case → 
Patient Record (/record) → 
View vitals, timeline, pathology
```

### Workflow 3: Manage System (Admin)
```
System Orchestration (/orchestration) →
Adjust LLM, security, alerts →
Apply Configuration
```

### Workflow 4: Configure Agents (Admin)
```
Agent Fleet (/fleet) →
Select agent →
Edit system prompt & tools →
Save Agent
```

---

## 🎨 Design Language

### Colors
- **Cyan (#22d3ee)**: Primary accent, buttons, highlights
- **Green (#10b981)**: Success, GP agent
- **Red (#ef4444)**: Danger, cardiologist agent
- **Gray (#94a3b8)**: Text, borders, muted

### Components
- **glass-panel**: Frosted glass effect containers
- **btn**: Buttons with primary/outline variants
- **pill**: Status badges
- **case-card**: Case list items
- **spinner**: Loading indicator

### Theme
- Dark glassmorphism (base: #0e1416)
- Semi-transparent overlays (5-20% opacity)
- Backdrop blur effects
- Glow/shadow effects for emphasis

---

## 📊 API Endpoints Used

```
POST   /api/cases              Create new case
GET    /api/cases              List all cases
GET    /api/cases/{id}         Get case + transcript + summary
POST   /api/cases/{id}/run     Rerun failed case
GET    /api/synthetic/cases    Get demo cases
GET    /api/synthetic/cases/random  Get random demo
```

---

## 🎯 7 Agent Pipeline

```
Patient Form Input
        ↓
┌──────────────────────────────────┐
│ Intake Agent (Blue)              │
│ - Structures symptoms            │
│ - Creates case record            │
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│ GP Agent (Green)                 │
│ - Primary triage & routing       │
│ - Identifies red flags           │
└──────────────┬───────────────────┘
               ↓
    ┌──────────┴──────────┐
    ↓                     ↓
┌─────────┐         ┌──────────┐
│Cardiolog│         │Neurolog  │
│ist      │  & (up) │ist       │  (Debate 3 rounds)
└────┬────┘         └────┬─────┘
     └────────┬──────────┘
              ↓
        ┌──────────────┐
        │ Pathologist  │
        │ - Analyzes   │
        │   lab data   │
        └──────┬───────┘
               ↓
        ┌──────────────┐
        │ Summarizer   │
        │ - Final      │
        │   report     │
        └──────┬───────┘
               ↓
         Final Report
```

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install
cd backend && pip install -r requirements.txt

# Set environment
cp backend/.env.example backend/.env
# Edit: Add OPENAI_API_KEY or OLLAMA_BASE_URL

# Start everything
npm run dev

# Or separately
npm run backend     # Terminal 1: http://localhost:8000
npm run frontend    # Terminal 2: http://localhost:5173
```

---

## 📱 Page Structure Quick Reference

| Page | Route | Purpose | Key Components |
|------|-------|---------|-----------------|
| Dashboard | `/` | Case management hub | Case grid, statistics |
| Patient Form | `/submit` | Case submission | Form fields, validation |
| Case Detail | `/cases/:id` | Real-time processing | Transcript, timeline, vitals |
| Patient Record | `/record` | Medical record view | Timeline, vitals, pathology |
| System Orchestration | `/orchestration` | Admin settings | Config, security, alerts |
| Agent Fleet | `/fleet` | Agent management | Fleet list, agent editor |
| Case Analytics | `/analytics` | Case comparison | Match confidence, history |

---

## ⚡ Key Features

✅ Real-time agent transcript with markdown rendering
✅ 7 specialized AI agents with different medical roles
✅ Dynamic synthetic vitals based on case severity
✅ Agent debate/consensus mechanism
✅ System configuration panel
✅ Fleet management interface
✅ Case comparison with historical matching
✅ Responsive glassmorphism design
✅ Dark theme with cyan accents
✅ Polling-based real-time updates

---

## 📖 Understanding Case Statuses

| Status | Meaning | What Happens |
|--------|---------|--------------|
| **PENDING** | Waiting to start | Case created, awaiting agent processing |
| **PROCESSING** | Agents actively working | Live transcript updating, polling enabled |
| **DONE** | Pipeline completed | Final report ready, polling stops |
| **FAILED** | Error occurred | Error message shown, can rerun |

---

## 🔌 Frontend-Backend Communication

1. **Frontend submits case** → POST /api/cases
2. **Backend creates record** → Status: PENDING
3. **Background task starts** → AI agents begin
4. **Frontend polls every 4-5s** → GET /api/cases/{id}
5. **Transcript updates** → Messages table grows
6. **Status changes** → PROCESSING → DONE
7. **Final report available** → Summary + investigations
8. **Frontend stops polling** → User reviews results

---

## 💡 Pro Tips

- **Demo Data**: Click "Load Demo Case" on Dashboard for quick testing
- **Fast Submission**: Use synthetic cases with different severity levels
- **Monitor Processing**: Case Detail page auto-updates every 4 seconds
- **Replay Cases**: Click "Rerun Pipeline" if processing failed
- **Configuration**: System Orchestration page controls LLM parameters
- **Fleet Management**: Agent Fleet page customize agent prompts and tools

---

**Last Updated**: 2024
**Status**: ✅ Educational Proof-of-Concept
**Version**: 2.0.4
