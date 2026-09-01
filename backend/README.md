# SecStorage — FastAPI Backend Foundation

SecStorage REST API application built with Python 3.12, FastAPI, SQLAlchemy 2.x Async, PostgreSQL, and Argon2id.

## Core Infrastructure

- **Application Factory:** Instantiated via `create_app()` in `app/main.py`.
- **Configuration Management:** Centralized `Settings` object in `app/core/config.py` using `pydantic-settings`.
- **Database Engine:** Async SQLAlchemy 2.x engine (`get_db`) reading `DATABASE_URL` dynamically.
- **Middleware Pipeline:**
  - `RequestIDMiddleware` (`X-Request-ID` propagation)
  - `ProcessTimeMiddleware` (`X-Process-Time` duration tracking)
  - `SecurityHeadersMiddleware` (`nosniff`, `DENY`, `strict-origin-when-cross-origin`)
  - `CORSMiddleware` (Configurable `CORS_ORIGINS`)
- **Probes:**
  - Liveness: `GET /health` (Lightweight probe)
  - Readiness: `GET /ready` (Database connectivity probe)
- **Exception Handling:** Global handler for custom `SecStorageException`, `HTTPException`, `RequestValidationError`, and generic `Exception` (guaranteeing zero sensitive stack traces leak).

## Directory Structure

```text
backend/
├── app/
│   ├── core/
│   │   ├── config.py            # Pydantic-settings environment schema
│   │   ├── database.py          # SQLAlchemy 2.x async engine & get_db generator
│   │   ├── security.py          # Argon2id password hashing & JWT utilities
│   │   ├── dependencies.py      # Dependency injection hooks
│   │   ├── exceptions.py        # Central SecStorageException hierarchy
│   │   ├── logging.py           # Structured logging configuration
│   │   └── middleware.py        # Request ID, Process Time, & Security headers
│   ├── models/                  # SQLAlchemy ORM declarative models
│   ├── schemas/                 # Pydantic v2 validation & response models
│   │   ├── common.py            # APIResponse, HealthStatus, ReadinessStatus
│   │   └── error.py             # ErrorPayload, ValidationErrorDetail
│   ├── routes/                  # REST route routers
│   │   ├── health.py            # GET /health & GET /ready probe endpoints
│   │   └── api.py               # Central API router (/api/v1)
│   ├── services/                # Business domain logic & PermissionService
│   ├── repositories/            # Data access repositories
│   └── main.py                  # Application factory (create_app)
├── alembic/                     # Async schema migration scripts
├── tests/                       # Pytest unit & integration test suite
└── pyproject.toml               # Python packaging metadata & dependencies
```

## Running Development Server & Tests

```bash
# 1. Install dependencies
pip install -e ".[dev]"

# 2. Run Pytest Suite
pytest

# 3. Run Ruff Lint & Format Check
ruff check .
ruff format --check .

# 4. Start FastAPI Server
uvicorn app.main:app --reload --port 8000
```
- OpenAPI Documentation: `http://localhost:8000/docs`
