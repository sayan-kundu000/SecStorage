# SecStorage — Deployment Architecture & Environment Strategy

**Document Version:** 1.0.0  
**Target Sequence Prompt:** Prompt 03 Deliverable  
**Author:** SecStorage Technical Architecture Controller  

---

## 1. Cloud Infrastructure & Hosting Topology

SecStorage is designed for simple, reliable deployment across three managed cloud targets:

```text
                               ┌─────────────────────────┐
                               │     GitHub Monorepo     │
                               │  (Source Control & CI)  │
                               └────────────┬────────────┘
                                            │
                      ┌─────────────────────┴─────────────────────┐
                      │ Push to `main`                            │ Push to `main`
                      ▼                                           ▼
         ┌─────────────────────────┐                 ┌─────────────────────────┐
         │     Vercel Platform     │                 │   Render Web Service    │
         │                         │                 │                         │
         │ React + TypeScript SPA  │                 │ FastAPI Backend App     │
         │ Global Edge CDN         │                 │ Uvicorn ASGI Server     │
         │ Static Asset Hosting    │                 │ Python 3.12 Runtime     │
         └────────────┬────────────┘                 └────────────┬────────────┘
                      │                                           │
                      │ HTTPS API Calls                           │ Async DB Connection
                      └───────────────────► ◄─────────────────────┘
                                            │
                                            ▼
                             ┌─────────────────────────────┐
                             │      Supabase Platform      │
                             │                             │
                             │ PostgreSQL 15 Database      │
                             │ Supabase S3 Object Storage  │
                             └─────────────────────────────┘
```

---

## 2. Platform Component Responsibilities

1. **Frontend Hosting (Vercel):**
   - Builds static SPA bundle via `npm run build` (Vite).
   - Serves React app on edge CDN.
   - Configured via `VITE_API_BASE_URL` pointing to the Render backend service URL.
2. **Backend Hosting (Render):**
   - Runs Python 3.12 container running Uvicorn server (`uvicorn app.main:app --host 0.0.0.0 --port 10000`).
   - Configured using Render Infrastructure-as-Code blueprint (`render.yaml`).
   - Handles automated database migrations via `alembic upgrade head` on startup.
3. **Managed Persistence (Supabase):**
   - **PostgreSQL Database:** Hosts relational metadata (`users`, `folders`, `files`, `shares`, `stars`, `trash`).
   - **Supabase Storage:** Hosts file binary objects in an S3-compatible bucket (`secstorage-objects`).

---

## 3. Environment Strategy & Variable Schema

Secrets must NEVER be committed to Git repositories. Local development uses `.env` files (excluded via `.gitignore`), while production uses platform environment variable injection.

### Required Environment Variables (`.env.example`)

```ini
# Core Server Environment
ENVIRONMENT=production
DEBUG=false
PORT=10000
SECRET_KEY=change-this-to-a-secure-random-64-char-string

# CORS Configuration
CORS_ORIGINS=["https://secstorage.vercel.app","http://localhost:5173"]

# PostgreSQL Database Connection
DATABASE_URL=postgresql+asyncpg://postgres:password@db.supabase.co:5432/postgres

# JWT Security Configuration
JWT_SECRET=super-secret-jwt-signing-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Supabase S3 Object Storage Configuration
STORAGE_PROVIDER=supabase
STORAGE_ENDPOINT_URL=https://<project-ref>.supabase.co/storage/v1/s3
STORAGE_BUCKET_NAME=secstorage-objects
STORAGE_ACCESS_KEY_ID=your-supabase-s3-access-key
STORAGE_SECRET_ACCESS_KEY=your-supabase-s3-secret-key
STORAGE_REGION=us-east-1

# Frontend Configuration (Vercel)
VITE_API_BASE_URL=https://secstorage-api.onrender.com/api/v1
```

---

## 4. Health & Readiness Verification

The FastAPI backend exposes a lightweight health check endpoint:
- **`GET /health`**: Returns `{"status": "healthy", "timestamp": "2026-08-26T17:23:00Z"}`.
- Render uses `/health` as its HTTP liveness probe to verify zero-downtime container deployments.
