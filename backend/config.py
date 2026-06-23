"""
Healtheon — Configuration
Pydantic settings loaded from environment variables / .env file.
"""
from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # ── LLM Backend ──────────────────────────────────────────────────────
    # Set LLM_PROVIDER=ollama to use local Llama-3 via Ollama
    # Set LLM_PROVIDER=openai to use OpenAI API
    # Set LLM_PROVIDER=groq to use free Groq API (no credit card needed)
    # If no provider works, falls back to smart demo mode automatically
    LLM_PROVIDER: Literal["openai", "ollama", "groq"] = "ollama"
    OPENAI_API_KEY: str = ""  # Set in .env file
    OPENAI_MODEL: str = "gpt-4o-mini"       # Cost-efficient; swap to gpt-4o for quality

    # Ollama (local Llama-3) settings
    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"
    OLLAMA_MODEL: str = "llama3"

    # Groq (free tier — no credit card needed)
    # Get free key at: https://console.groq.com
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama3-8b-8192"

    # ── Agent behaviour ───────────────────────────────────────────────────────
    LLM_TEMPERATURE: float = 0.2   # Low temperature → less hallucination
    LLM_SEED: int = 42
    LLM_MAX_TOKENS: int = 1024
    MAX_ROUNDS: int = 12            # Hard circuit-breaker for the GroupChat

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./healtheon.db"

    # ── API ───────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"]

    # ── Auth ──────────────────────────────────────────────────────────────────
    SECRET_KEY: str = ""
    ADMIN_PASSWORD: str = "ChangeMe123!"

    # ── Email (SMTP) ─────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""          # Your Gmail address
    SMTP_PASSWORD: str = ""      # Gmail App Password (not your login password)
    SMTP_FROM_NAME: str = "Healtheon"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()


def get_llm_config() -> dict:
    """Return the AutoGen-compatible llm_config dict based on provider."""
    if settings.LLM_PROVIDER == "ollama":
        return {
            "model": settings.OLLAMA_MODEL,
            "base_url": settings.OLLAMA_BASE_URL,
            "api_key": "EMPTY",          # Required by AutoGen; ignored by Ollama
            "temperature": settings.LLM_TEMPERATURE,
            "seed": settings.LLM_SEED,
            "max_tokens": settings.LLM_MAX_TOKENS,
        }
    if settings.LLM_PROVIDER == "groq":
        return {
            "model": settings.GROQ_MODEL,
            "api_key": settings.GROQ_API_KEY,
            "base_url": "https://api.groq.com/openai/v1",
            "temperature": settings.LLM_TEMPERATURE,
            "seed": settings.LLM_SEED,
            "max_tokens": settings.LLM_MAX_TOKENS,
        }
    # Default: OpenAI
    return {
        "model": settings.OPENAI_MODEL,
        "api_key": settings.OPENAI_API_KEY,
        "temperature": settings.LLM_TEMPERATURE,
        "seed": settings.LLM_SEED,
        "max_tokens": settings.LLM_MAX_TOKENS,
    }
