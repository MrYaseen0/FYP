"""
Healtheon — Test Configuration
Shared fixtures for all backend tests.
"""
import os
import sys
import uuid
import pytest
from datetime import timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

os.environ["SECRET_KEY"] = "test-secret-key-for-unit-tests-only-2026"
os.environ["ADMIN_PASSWORD"] = "TestAdmin123!"
os.environ["DATABASE_URL"] = "sqlite:///./test_healtheon.db"

from backend.db.database import Base, get_db
from backend.db.models import User
from backend.auth import pwd_context, create_access_token, ROLES
from backend.main import app
from backend.security import rate_limiter


# ── Test Database ──────────────────────────────────────────────────────────
TEST_DB_FILE = "test_healtheon.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Fixtures ───────────────────────────────────────────────────────────────
@pytest.fixture(scope="function", autouse=True)
def setup_db():
    """Create fresh tables for each test, drop after."""
    Base.metadata.create_all(bind=engine)
    # Reset rate limiter between tests
    rate_limiter._store.clear()
    yield
    Base.metadata.drop_all(bind=engine)
    # Clean up test DB file
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except PermissionError:
            pass


@pytest.fixture
def db():
    """Provide a test database session."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


import backend.main as _main_mod
import backend.seed_data as _seed_mod

@pytest.fixture
def client(db):
    """Provide a FastAPI test client with overridden DB dependency."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    _orig_main_seed = _main_mod.seed_demo_data
    _orig_auth_seed = None
    try:
        from backend import auth as _auth_mod
        _orig_auth_seed = getattr(_auth_mod, '_seed_admin', None)
        _auth_mod._seed_admin = lambda: None
    except ImportError:
        pass
    _main_mod.seed_demo_data = lambda: None
    _seed_mod.seed_demo_data = lambda: None

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    _main_mod.seed_demo_data = _orig_main_seed
    _seed_mod.seed_demo_data = _orig_main_seed
    if _orig_auth_seed:
        _auth_mod._seed_admin = _orig_auth_seed
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db):
    """Create and return an approved admin user."""
    user = User(
        id=f"usr_{uuid.uuid4().hex[:12]}",
        username="testadmin",
        email="admin@test.com",
        full_name="Test Admin",
        password_hash=pwd_context.hash("Admin123!"),
        role="admin",
        institution="Test Hospital",
        status="approved",
        avatar="TA",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def doctor_user(db):
    """Create and return an approved doctor user."""
    user = User(
        id=f"usr_{uuid.uuid4().hex[:12]}",
        username="testdoctor",
        email="doctor@test.com",
        full_name="Test Doctor",
        password_hash=pwd_context.hash("Doctor123!"),
        role="doctor",
        institution="Test Hospital",
        status="approved",
        avatar="TD",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def regular_user(db):
    """Create and return an approved regular user."""
    user = User(
        id=f"usr_{uuid.uuid4().hex[:12]}",
        username="testuser",
        email="user@test.com",
        full_name="Test User",
        password_hash=pwd_context.hash("User12345!"),
        role="user",
        institution="Test Hospital",
        status="approved",
        avatar="TU",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def pending_user(db):
    """Create and return a pending user (not yet approved)."""
    user = User(
        id=f"usr_{uuid.uuid4().hex[:12]}",
        username="pendinguser",
        email="pending@test.com",
        full_name="Pending User",
        password_hash=pwd_context.hash("Pending123!"),
        role="user",
        institution="Test Hospital",
        status="pending",
        avatar="PU",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user):
    """Generate a valid JWT token for admin user."""
    return create_access_token(
        data={"sub": admin_user.id, "username": admin_user.username, "role": admin_user.role}
    )


@pytest.fixture
def doctor_token(doctor_user):
    """Generate a valid JWT token for doctor user."""
    return create_access_token(
        data={"sub": doctor_user.id, "username": doctor_user.username, "role": doctor_user.role}
    )


@pytest.fixture
def user_token(regular_user):
    """Generate a valid JWT token for regular user."""
    return create_access_token(
        data={"sub": regular_user.id, "username": regular_user.username, "role": regular_user.role}
    )


@pytest.fixture
def guest_token():
    """Generate a valid guest JWT token."""
    return create_access_token(
        data={"sub": f"guest_{uuid.uuid4().hex[:8]}", "username": "guest", "role": "user"},
        expires_delta=timedelta(minutes=15),
    )


@pytest.fixture
def admin_headers(admin_token):
    """Authorization headers for admin requests."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def doctor_headers(doctor_token):
    """Authorization headers for doctor requests."""
    return {"Authorization": f"Bearer {doctor_token}"}


@pytest.fixture
def user_headers(user_token):
    """Authorization headers for regular user requests."""
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def guest_headers(guest_token):
    """Authorization headers for guest requests."""
    return {"Authorization": f"Bearer {guest_token}"}
