# SecStorage — System Overview & Architecture Principles

**Document Version:** 1.0.0  
**Target Sequence Prompt:** Prompt 03 Deliverable  
**Author:** SecStorage Technical Architecture Controller  

---

## 1. Architectural Philosophy & Strategy

SecStorage is engineered as a **Full-Stack Modular Monolith** designed for high security, clear separation of concerns, rapid maintainability, and seamless deployment on free-tier/lightweight cloud hosting (Render + Vercel).

### Core Principle: "Simple Architecture, Strong Boundaries"
We strictly avoid premature microservices, Kubernetes, complex message queues (Kafka, RabbitMQ), service meshes, or multi-database synchronization. The entire system is built as a single backend application deployment and a single frontend single-page application (SPA).

```text
                    ┌─────────────────────────┐
                    │        USER             │
                    └────────────┬────────────┘
                                 │
                                 │ HTTPS
                                 ▼
                    ┌─────────────────────────┐
                    │       VERCEL            │
                    │                         │
                    │ React + TypeScript      │
                    │ Vite + Tailwind         │
                    │ TanStack Query          │
                    └────────────┬────────────┘
                                 │
                                 │ REST / JSON
                                 │ HTTPS
                                 ▼
                    ┌─────────────────────────┐
                    │        RENDER           │
                    │                         │
                    │ FastAPI + Python 3.12   │
                    │ Uvicorn                 │
                    │ SQLAlchemy 2.x Async    │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┼────────────────┐
                 │               │                │
                 ▼               ▼                ▼
        ┌────────────────┐ ┌──────────────┐ ┌────────────────┐
        │  PostgreSQL    │ │ Object       │ │ External       │
        │                │ │ Storage      │ │ Integrations   │
        │ Metadata       │ │              │ │                │
        │ Users, Folders │ │ Files        │ │ Optional S3/   │
        │ Files, Shares  │ │ Binaries     │ │ Auth Services  │
        │ Stars, Trash   │ │ Supabase     │ │                │
        └────────────────┘ └──────────────┘ └────────────────┘
```

---

## 2. System Boundaries & Responsibilities

The system is strictly partitioned into five distinct boundaries. No boundary may bypass or encroach upon another's responsibilities.

### Boundary 1: Frontend Client (Vercel)
- **Stack:** React 18+, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Axios.
- **Responsibilities:** User interaction rendering, client-side route protection, form management & validation (Zod + React Hook Form), optimistic UI updates, rendering loading/error states, and invoking REST APIs.
- **Strict Prohibitions:** Never holds database credentials, never executes direct SQL/ORM code, never evaluates master authorization logic (UI state is purely cosmetic guidance).

### Boundary 2: API Layer (FastAPI Routers)
- **Stack:** FastAPI, Pydantic v2.
- **Responsibilities:** Route definitions, HTTP method enforcement, request payload validation, HTTP header inspection, JWT authentication extraction, error response formatting, and HTTP status code assignment.
- **Strict Prohibitions:** Does not contain business logic or raw database queries. Delegates immediately to the Service Layer.

### Boundary 3: Service Layer (Business & Domain Logic)
- **Stack:** Python 3.12, Custom Domain Services.
- **Responsibilities:** Core business logic execution, central server-side authorization enforcement (`PermissionService`), folder hierarchy validation (circular checks), file lifecycle management, presigned URL coordination, and transaction orchestration.

### Boundary 4: Persistence Layer (PostgreSQL Metadata)
- **Stack:** PostgreSQL 15+, SQLAlchemy 2.x (asyncpg driver), Alembic migrations.
- **Responsibilities:** Storing relational metadata (users, folders, file metadata records, user-to-user shares, public share tokens, starred items, and soft-deletion timestamps).

### Boundary 5: Object Storage (Supabase Storage / S3)
- **Stack:** Supabase Storage (S3-Compatible API via `aioboto3` or HTTP SDK).
- **Responsibilities:** Storing raw file binary payloads using deterministic, isolated storage keys. Never receives database credentials or relational metadata.

---

## 3. End-to-End Request Pipeline

Every protected API request moves through a strict 10-stage execution pipeline:

```text
Browser Client
   │
   ▼ 1. HTTPS REST Request (Bearer Token or Refresh Cookie)
FastAPI Router
   │
   ▼ 2. Auth Dependency (Verify JWT Signature & Expiration)
Current User Object
   │
   ▼ 3. Pydantic v2 Schema Validation (Input Sanitization)
Validated Request Model
   │
   ▼ 4. Permission Service Check (Verify Owner/Editor/Viewer Role)
Authorization Confirmed (or 403 Raised)
   │
   ▼ 5. Domain Service Layer (Execute Business Workflow)
Domain Operation Result
   │
   ▼ 6. Persistence / Storage Interaction (SQLAlchemy Transaction or Presigned URL)
Database / Object Storage Result
   │
   ▼ 7. Pydantic Response Schema Serialization
Standardized JSON Response ({ "success": true, "data": ... })
   │
   ▼ 8. HTTP 200/201/204 Output Stream
Browser Client Receives Data
```

---

## 4. Architectural Constraints & Non-Negotiables

1. **Browser Security Isolation:** The browser client connects *only* to the FastAPI backend API via HTTPS REST calls and to Object Storage via temporary presigned S3 URLs. Database connections from the browser are physically impossible.
2. **Metadata vs. Binary Payload Separation:** PostgreSQL stores *zero* file binary data. All binary bytes reside in Supabase Object Storage.
3. **Stateless Backend Service:** FastAPI application state is completely stateless. Session tokens are verified via cryptographic JWT signatures or database lookups.
4. **Server-Side Authorization Boundary:** Every resource access is authorized server-side. Frontend permission checks are treated purely as UI/UX conveniences.
