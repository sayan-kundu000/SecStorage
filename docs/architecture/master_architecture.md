# SecStorage — Master Architecture Specification

## Architectural Principles

1. **Modular Monolith First**: Clean module division (`routes`, `services`, `models`, `schemas`, `core`, `utils`). No premature microservices.
2. **Metadata vs. Objects**:
   - **PostgreSQL**: Stores relational metadata (users, folders, file records, permissions, shares, trash state, activity logs).
   - **Object Storage**: Stores raw binary payloads via presigned S3/Supabase upload & download URLs.
3. **Server-Side Authorization Boundary**: All authorization checks (Owner, Editor, Viewer) are computed strictly on the backend. Frontend UI states reflect backend capabilities.
4. **Typed Contracts**: Standardized Pydantic v2 schemas on the backend and matching TypeScript interfaces on the frontend.
5. **JSON Contract Standard**:
   - Success: `{"success": true, "data": {...}, "message": null}`
   - Error: `{"success": false, "error": {"code": "ERROR_CODE", "message": "User visible message"}}`

## Key Data Flow Architecture

```text
+-----------------------+           +----------------------+          +----------------------+
|  React Client (Vite)  | ---REST-->| FastAPI Backend      | -------->| PostgreSQL Database  |
|                       |           | (Server Auth & RBAC) |          | (Metadata & Shares)  |
+-----------------------+           +----------------------+          +----------------------+
            |                                  |
            | Signed Upload/Download           | Generates Signed URLs
            v                                  v
+--------------------------------------------------------------------------------------------+
|                                Object Storage (S3 / Supabase)                              |
+--------------------------------------------------------------------------------------------+
```

## Security & Auth Model
- **Authentication**: JWT access tokens in memory / headers + Refresh tokens in secure `HttpOnly`, `SameSite=Lax` cookies.
- **Passwords**: Argon2id hashing algorithm.
- **Access Control**: Role-Based Access Control (RBAC) evaluating resource ownership, explicit user-to-user shares, and public link parameters.
- **Object Key Isolation**: Files stored using secure deterministic object keys: `users/{user_id}/files/{file_id}/object`. User raw filenames are never used as object keys.
