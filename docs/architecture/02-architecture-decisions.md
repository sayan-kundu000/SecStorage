# SecStorage — Architecture Decision Records (ADRs)

**Document Version:** 1.0.0  
**Target Sequence Prompt:** Prompt 03 Deliverable  
**Author:** SecStorage Technical Architecture Controller  

---

## Architecture Decision Record Index

| ADR ID | Title | Status | Date |
| :--- | :--- | :---: | :---: |
| **ADR-001** | Modular Monolith Architecture Pattern | Accepted | 2026-08-26 |
| **ADR-002** | FastAPI as Backend Web Framework | Accepted | 2026-08-26 |
| **ADR-003** | PostgreSQL + SQLAlchemy 2.x Async ORM for Metadata | Accepted | 2026-08-26 |
| **ADR-004** | Supabase Object Storage with S3-Compatible Abstraction Layer | Accepted | 2026-08-26 |
| **ADR-005** | React + TypeScript + Vite Single-Page Application Frontend | Accepted | 2026-08-26 |
| **ADR-006** | Resource-Oriented REST + JSON API Standard | Accepted | 2026-08-26 |
| **ADR-007** | JWT Access Tokens + HttpOnly Refresh Cookies | Accepted | 2026-08-26 |
| **ADR-008** | Centralized Server-Side Role-Based Access Control (RBAC) | Accepted | 2026-08-26 |
| **ADR-009** | Vercel Platform for Frontend SPA Deployment | Accepted | 2026-08-26 |
| **ADR-010** | Render Web Service Blueprint for Backend Deployment | Accepted | 2026-08-26 |
| **ADR-011** | Direct-to-Storage Uploads via Presigned Signed URLs | Accepted | 2026-08-26 |
| **ADR-012** | Soft Deletion Model for Trash & Restoration | Accepted | 2026-08-26 |

---

### ADR-001: Modular Monolith Architecture Pattern
- **Status:** Accepted
- **Context:** Building cloud file storage often tempts developers toward microservices (separate auth, upload, metadata, sharing services). However, for an intermediate-level MVP, microservices introduce extreme infrastructure overhead, RPC complexity, and deployment fragility.
- **Decision:** Build SecStorage as a single unified Python application structured as a **Modular Monolith** (`routes`, `services`, `models`, `schemas`, `core`).
- **Consequences:** Simplified deployment, zero network latencies between internal modules, atomic database transactions, straightforward debugging, and clear path to future service extraction if needed.

### ADR-002: FastAPI as Backend Web Framework
- **Status:** Accepted
- **Context:** Python backends can be built on Django, Flask, or FastAPI.
- **Decision:** Select **FastAPI**.
- **Reason:** Asynchronous I/O support out of the box, native Pydantic v2 validation integration, automatic OpenAPI schema generation, fast performance, and built-in dependency injection system.
- **Consequences:** High developer velocity, strict request/response type safety, and standardized documentation (`/docs`).

### ADR-003: PostgreSQL + SQLAlchemy 2.x Async ORM for Metadata
- **Status:** Accepted
- **Context:** Relational metadata (users, nested folder hierarchies, permissions, shares, soft-delete states) requires strict consistency, foreign keys, and complex queries.
- **Decision:** Use **PostgreSQL** with **SQLAlchemy 2.x** in async mode (`asyncpg` driver) and **Alembic** for schema migrations.
- **Consequences:** Strong data integrity, async database concurrency, type-safe queries, and controlled database migration history.

### ADR-004: Supabase Object Storage with S3-Compatible Abstraction Layer
- **Status:** Accepted
- **Context:** Uploaded file binaries must be stored reliably outside of the relational database.
- **Decision:** Use **Supabase Storage** (S3-compatible API) as the default provider, accessed through a provider-agnostic `StorageService` interface.
- **Consequences:** Zero binary payload bloat in PostgreSQL, generous free-tier storage, direct presigned upload support, and easy future migration to AWS S3, Cloudflare R2, or MinIO.

### ADR-005: React + TypeScript + Vite Single-Page Application Frontend
- **Status:** Accepted
- **Context:** The frontend must provide a fast, Google Drive-style interactive user interface.
- **Decision:** Use **React 18+** with **TypeScript**, **Vite** build tooling, **Tailwind CSS**, **shadcn/ui**, and **TanStack Query**.
- **Consequences:** Excellent developer experience, near-instant HMR, component reusability, strict frontend type safety matching backend API contracts, and fast client-side navigation.

### ADR-006: Resource-Oriented REST + JSON API Standard
- **Status:** Accepted
- **Context:** API design requires a predictable convention for client-server communication.
- **Decision:** Adopt a strict RESTful resource design under `/api/v1/` returning standardized JSON payloads:
  - Success: `{"success": true, "data": {...}, "message": null}`
  - Error: `{"success": false, "error": {"code": "ERR_CODE", "message": "User-visible error"}}`
- **Consequences:** Predictable error handling on the client, clear frontend service layer code, and seamless API testing.

### ADR-007: JWT Access Tokens + HttpOnly Refresh Cookies
- **Status:** Accepted
- **Context:** User authentication must be secure against XSS and CSRF attacks while supporting SPA navigation.
- **Decision:** Use short-lived (15-min) JWT access tokens passed via Authorization headers or memory, coupled with long-lived (7-day) refresh tokens stored in `HttpOnly`, `Secure`, `SameSite=Lax` cookies.
- **Consequences:** High XSS protection for refresh tokens, stateless API authorization validation, and seamless token renewal.

### ADR-008: Centralized Server-Side Role-Based Access Control (RBAC)
- **Status:** Accepted
- **Context:** Files and folders can be owned or shared with different roles (Owner, Editor, Viewer).
- **Decision:** Implement a centralized `PermissionService` dependency in FastAPI that checks DB resource ownership and explicit user shares on every protected operation.
- **Consequences:** Reusable authorization logic across all endpoints, immunity to client-side UI tampering, and clear security auditing.

### ADR-009: Vercel Platform for Frontend SPA Deployment
- **Status:** Accepted
- **Context:** Modern React SPAs require global CDN distribution and environment variable management.
- **Decision:** Deploy the frontend to **Vercel** with automatic GitHub CI integration.
- **Consequences:** Zero-config React/Vite builds, fast global edge delivery, custom domain support, and isolated preview deployments per PR.

### ADR-010: Render Web Service Blueprint for Backend Deployment
- **Status:** Accepted
- **Context:** Python/FastAPI web services require a reliable cloud runner with environment secret management.
- **Decision:** Deploy the backend application to **Render** using a infrastructure-as-code `render.yaml` blueprint.
- **Consequences:** Automated deployment from GitHub `main` branch, built-in health checks, environment variable injection, and automated Uvicorn process management.

### ADR-011: Direct-to-Storage Uploads via Presigned Signed URLs
- **Status:** Accepted
- **Context:** Streaming large file uploads through the FastAPI application server causes memory bloat, high CPU usage, and worker process starvation.
- **Decision:** Implement a two-step upload lifecycle (`/files/init-upload` -> direct client PUT to Supabase Storage -> `/files/complete-upload`).
- **Consequences:** FastAPI handles only small metadata payloads, multi-gigabyte uploads bypass backend worker threads, and storage bandwidth scales independently.

### ADR-012: Soft Deletion Model for Trash & Restoration
- **Status:** Accepted
- **Context:** Deleting a file or folder in cloud storage should be reversible (Google Drive Trash concept).
- **Decision:** Standardize on soft deletion by populating a `deleted_at` timestamp column in `files` and `folders` tables. Items are excluded from standard drive queries and exposed in Trash views until explicitly purged.
- **Consequences:** Accidental deletion prevention, instant restoration capability, and clean separation between soft-delete hiding and physical storage purge operations.
