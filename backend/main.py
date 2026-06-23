"""
Healtheon — FastAPI Application Entry Point

Multi-agent AI clinical education platform with JWT authentication,
audit logging, real-time WebSocket streaming, and Google OAuth.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.db.database import create_all_tables
from backend.api.cases import router as cases_router
from backend.api.auth import router as auth_router
from backend.api.admin import router as admin_router
from backend.api.websocket import router as ws_router
from backend.api.patient import router as patient_router
from backend.api.doctor import router as doctor_router
from backend.api.notifications import router as notifications_router
from backend.api.messages import router as messages_router
from backend.api.departments import router as departments_router
from backend.api.clinical import router as clinical_router
from backend.api.learning import router as learning_router
from backend.api.multimodal import router as multimodal_router
from backend.api.similarity import router as similarity_router
from backend.api.fhir_export import router as fhir_router
from backend.api.health_analysis import router as health_analysis_router
from backend.audit_middleware import AuditMiddleware
from backend.auth import _seed_admin
from backend.seed_data import seed_demo_data

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("healtheon")


# ── Lifespan ───────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup."""
    logger.info("Healtheon starting — creating database tables...")
    create_all_tables()
    _seed_admin()
    seed_demo_data()
    logger.info("Database ready.")
    yield
    logger.info("Healtheon shutting down.")


# ── App factory ────────────────────────────────────────────────────────────
app = FastAPI(
    title="Healtheon API",
    description=(
        "Multi-agent AI clinical decision support platform. "
        "JWT-authenticated with full audit logging, Google OAuth, "
        "and real-time WebSocket streaming."
    ),
    version="2.1.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Cookie"],
)

# ── Audit Middleware ───────────────────────────────────────────────────────
app.add_middleware(AuditMiddleware)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(cases_router)
app.include_router(admin_router)
app.include_router(ws_router)
app.include_router(patient_router)
app.include_router(doctor_router)
app.include_router(notifications_router)
app.include_router(messages_router)
app.include_router(departments_router)
app.include_router(clinical_router)
app.include_router(learning_router)
app.include_router(multimodal_router)
app.include_router(similarity_router)
app.include_router(fhir_router)
app.include_router(health_analysis_router)


# ── Health check ───────────────────────────────────────────────────────────
@app.get("/", tags=["health"])
async def root():
    return {
        "service": "Healtheon API",
        "version": "2.1.0",
        "status": "running",
        "auth": "JWT + Google OAuth enabled",
        "realtime": "WebSocket + SSE enabled",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
