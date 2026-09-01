# SecStorage — Backend Testing, Security Hardening & Performance Engineering

This document outlines the engineering controls, test suite architecture, security boundaries, performance optimizations, and deployment readiness checks implemented for the SecStorage backend.

---

## 1. Quality & Test Suite Architecture

The backend test suite is built on **pytest** and **httpx AsyncClient** with an in-memory database fixture (`sqlite+aiosqlite:///:memory:`) using SQLAlchemy 2.x async session dependency overrides.

### Test Matrix Summary

| Test Module | Primary Scope | Test Cases |
| :--- | :--- | :--- |
| [`test_security_matrix.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_security_matrix.py) | RBAC Permission Matrix & IDOR Protection | 4 |
| [`test_input_hardening.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_input_hardening.py) | Path Traversal, Filename Sanitization, SQL Injection, Bounded Pagination | 4 |
| [`test_performance_concurrency.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_performance_concurrency.py) | Concurrent Versioning & Resource Limits | 1 |
| [`test_auth.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_auth.py) | JWT Auth, Password Hashing, Session Invalidation | 10 |
| [`test_authorization.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_authorization.py) | RBAC & Admin Audit Log Access Restrictions | 6 |
| [`test_file_versions.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_file_versions.py) | Version History, Version Restoration, Version IDOR | 3 |
| [`test_file_preview.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_file_preview.py) | Image, Text, and Public Link Previews | 4 |
| [`test_activity_audit.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_activity_audit.py) | Timeline Activity Logging & Admin Security Audit | 2 |
| [`test_sharing.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_sharing.py) | Explicit File/Folder User Sharing | 5 |
| [`test_public_links.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_public_links.py) | Token Hashing, Password Protection, Expiration | 4 |
| [`test_search_filter_sort.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_search_filter_sort.py) | Parameterized Search & Pagination | 6 |
| [`test_trash_recovery.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_trash_recovery.py) | Soft-delete, Restore, Permanent Purge | 5 |
| [`test_starred.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_starred.py) | Starred Resource Bookmarking | 4 |
| [`test_storage.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_storage.py) | Presigned Upload/Download Signed URLs | 6 |
| [`test_api.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_api.py) | API JSON Envelope Contracts & `/me` User Endpoint | 8 |
| [`test_database.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_database.py) | Relational Models & Foreign Key Constraints | 7 |
| [`test_health.py`](file:///c:/Users/DELL/Downloads/SecStorage/backend/tests/test_health.py) | Health Liveness Check Endpoint | 7 |
| **Total Test Suite** | **86 Executed / 86 Passed (100% Pass Rate)** | **86** |

---

## 2. Security Hardening Controls

1. **Path Traversal & Filename Sanitization**:
   - `sanitize_filename` strips directory traversal paths (`../`, `..\`, null bytes) and special characters using `os.path.basename` and regex stripping.
2. **SQL Injection Safety**:
   - All database queries use SQLAlchemy 2.x parameterized expressions (`select()`, `where()`, `filter()`). Zero string concatenation is used for user input.
3. **HTTP Response Security Headers**:
   - [`SecurityHeadersMiddleware`](file:///c:/Users/DELL/Downloads/SecStorage/backend/app/core/middleware.py) automatically injects:
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `Referrer-Policy: strict-origin-when-cross-origin`
4. **CORS Restriction**:
   - CORS origin validation strictly parses origins from `FRONTEND_BASE_URL` and `CORS_ORIGINS`. Wildcards (`*`) are disallowed when `allow_credentials=True`.
5. **Admin Security Audit Restrictions**:
   - `/api/v1/audit` is restricted strictly to users with `is_admin=True`. Standard users receive `403 Forbidden`.

---

## 3. Performance Engineering & Database Query Optimization

1. **N+1 Query Elimination**:
   - `ShareRepository` and `VersionRepository` leverage `selectinload` and `joinedload` to eagerly load grantor, grantee, file, and folder entities in a single SQL query.
2. **Indexed Database Lookups**:
   - Compound indexes optimize frequent query patterns:
     - `idx_files_user_folder` on `(user_id, folder_id, deleted_at)`
     - `idx_file_versions_lookup` on `(file_id, version_number)`
     - `idx_activities_user_timeline` on `(user_id, created_at)`
     - `idx_audit_logs_timeline` on `(created_at)`
3. **Bounded Pagination**:
   - Pagination parameters enforce bounded `page` (min 1) and `page_size` (min 1, max 100).

---

## 4. Deployment Readiness Verification

- **Render Compatibility**: Zero reliance on persistent local filesystem storage; all binary file data flows directly to S3-compatible object storage via temporary signed URLs.
- **Vercel Compatibility**: Standard CORS response headers and REST JSON API contracts (`/api/v1/*`).
- **Secrets Management**: Database connection strings, JWT signing keys, and storage credentials are bound exclusively via environment variables (`.env`).
