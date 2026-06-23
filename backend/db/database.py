"""
Healtheon — Database Engine & Session
SQLAlchemy setup supporting both SQLite and PostgreSQL.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.config import settings

# Support PostgreSQL (with psycopg2) and SQLite
connect_args = {}
engine_kwargs = {"echo": False}

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql"):
    # Use psycopg2 driver for PostgreSQL
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://")
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
else:
    # SQLite specific settings
    connect_args["check_same_thread"] = False

engine = create_engine(db_url, connect_args=connect_args, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables():
    """Create all tables defined in models. Called on app startup."""
    from backend.db import models           # noqa: F401
    from backend.db import models_extended  # noqa: F401
    from backend.db import audit_models     # noqa: F401
    Base.metadata.create_all(bind=engine)
