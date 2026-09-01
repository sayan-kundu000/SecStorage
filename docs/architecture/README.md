# SecStorage — Full-Stack Architecture Documentation

This directory contains the authoritative technical architecture blueprints, system design specifications, and Architecture Decision Records (ADRs) for the SecStorage project.

## Master System Blueprint

- **[Master Architecture Overview](file:///c:/Users/DELL/Downloads/SecStorage/docs/architecture/master_architecture.md)** (`master_architecture.md`)
- **[23-Prompt Implementation Sequence Roadmap](file:///c:/Users/DELL/Downloads/SecStorage/docs/architecture/23_prompt_sequence.md)** (`23_prompt_sequence.md`)

---

## Detailed Architecture Specifications

1. **[01-system-overview.md](file:///c:/Users/DELL/Downloads/SecStorage/docs/architecture/01-system-overview.md)**
   - High-level architecture, modular monolith philosophy, system boundaries, and end-to-end request pipeline.
2. **[02-architecture-decisions.md](file:///c:/Users/DELL/Downloads/SecStorage/docs/architecture/02-architecture-decisions.md)**
   - Architecture Decision Records Index (ADR-001 through ADR-012).
3. **[03-backend-architecture.md](file:///c:/Users/DELL/Downloads/SecStorage/docs/architecture/03-backend-architecture.md)**
   - FastAPI modular directory structure (`routes`, `services`, `models`, `schemas`, `core`), layer separation, and central exception handler.
4. **[04-frontend-architecture.md](file:///c:/Users/DELL/Downloads/SecStorage/docs/architecture/04-frontend-architecture.md)**
   - React 18+ / TypeScript / Vite architecture, TanStack Query server-state, Axios refresh interceptor, and React Router layout.
5. **[05-database-architecture.md](file:///c:/Users/DELL/Downloads/SecStorage/docs/architecture/05-database-architecture.md)**
   - PostgreSQL schema, Entity-Relationship Diagram (ERD), SQLAlchemy 2.x async models, Alembic migration strategy, and composite indexes.
6. **[06-storage-architecture.md](file:///c:/Users/DELL/Downloads/SecStorage/docs/architecture/06-storage-architecture.md)**
   - Supabase Storage abstraction, deterministic object keys (`users/{user_id}/files/{file_id}/{uuid}.bin`), and direct-to-storage presigned upload/download lifecycle.
7. **[07-authentication-authorization.md](file:///c:/Users/DELL/Downloads/SecStorage/docs/architecture/07-authentication-authorization.md)**
   - Argon2id password hashing, JWT access/refresh cookie strategy, and centralized `PermissionService` (Owner, Editor, Viewer, Public RBAC).
8. **[08-api-architecture.md](file:///c:/Users/DELL/Downloads/SecStorage/docs/architecture/08-api-architecture.md)**
   - RESTful API endpoints (`/api/v1/*`), universal JSON response wrappers, status codes, and OpenAPI schema generation.
9. **[09-security-architecture.md](file:///c:/Users/DELL/Downloads/SecStorage/docs/architecture/09-security-architecture.md)**
   - OWASP threat matrix, IDOR countermeasures, CORS configurations, rate limiting, and input sanitization.
10. **[10-deployment-architecture.md](file:///c:/Users/DELL/Downloads/SecStorage/docs/architecture/10-deployment-architecture.md)**
    - Render backend host (`render.yaml`), Vercel frontend host, Supabase DB/Storage, environment variable strategy (`.env.example`), and `/health` probe.
11. **[11-testing-architecture.md](file:///c:/Users/DELL/Downloads/SecStorage/docs/architecture/11-testing-architecture.md)**
    - Pytest + HTTPX backend tests, Vitest + RTL frontend tests, and Playwright E2E 22-step audit scenario.
12. **[12-data-flow.md](file:///c:/Users/DELL/Downloads/SecStorage/docs/architecture/12-data-flow.md)**
    - Mermaid sequence and lifecycle flow diagrams for Auth, Presigned Upload, Download, Public Links, and Trash/Restore.
