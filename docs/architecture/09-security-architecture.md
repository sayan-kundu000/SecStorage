# SecStorage — Security Architecture & Threat Model

**Document Version:** 1.0.0  
**Target Sequence Prompt:** Prompt 03 Deliverable  
**Author:** SecStorage Technical Architecture Controller  

---

## 1. Threat Matrix & Countermeasure Architecture

SecStorage enforces security at every system boundary, adopting defense-in-depth principles against OWASP Top 10 web vulnerabilities.

| Vulnerability Threat | Target Component | Defense Mechanism & Architectural Countermeasure |
| :--- | :--- | :--- |
| **Insecure Direct Object Reference (IDOR)** | Files, Folders, Downloads | • Every resource request triggers `PermissionService` checks.<br>• Client user IDs are derived exclusively from verified JWT signatures.<br>• Predictable sequential IDs replaced with 128-bit UUIDs. |
| **Path Traversal / Storage Key Tampering** | File Storage Uploads | • Presigned URLs restrict upload location strictly to `users/{user_id}/files/{file_id}/{uuid}.bin`.<br>• User-provided raw filenames sanitised and stored only as DB display names. |
| **Cross-Site Scripting (XSS)** | React SPA & Auth | • Refresh tokens stored strictly in `HttpOnly` cookies inaccessible to JavaScript.<br>• React automatically escapes JSX expressions.<br>• Strict Content-Security-Policy (CSP) headers enabled. |
| **Cross-Site Request Forgery (CSRF)** | Auth & Mutation APIs | • Refresh token cookies enforce `SameSite=Lax`.<br>• Access tokens passed via `Authorization: Bearer` custom header.<br>• Production cookies enforce `Secure=True`. |
| **Credential Theft & Brute Force** | User Auth APIs | • Password hashing enforced with **Argon2id** (`m=64MB, t=3, p=4`).<br>• Rate limiting (`slowapi` middleware) throttles `/auth/login` attempts to 5 per minute per IP. |
| **Public Link Token Enumeration** | Public Shareable Links | • Public tokens generated using cryptographically secure random bytes (`secrets.token_urlsafe(32)` -> 256 bits entropy).<br>• Rate limiting prevents brute-force token guessing. |
| **SQL Injection** | PostgreSQL Metadata | • 100% of database queries executed via SQLAlchemy 2.x ORM parametrized queries.<br>• Raw string concatenation forbidden in SQL execution. |
| **Denial of Service (DoS) / File Storage Exhaustion** | Presigned File Uploads | • Maximum file size limit enforced server-side before presigned URL generation.<br>• Storage upload URLs expire strictly after 15 minutes. |

---

## 2. CORS (Cross-Origin Resource Sharing) Architecture

To prevent unauthorized web domains from invoking SecStorage APIs:

### Development Environment
- Allowed Origins: `http://localhost:5173`, `http://localhost:3000`
- `allow_credentials=True`

### Production Environment
- Allowed Origins: Standardized via environment variable `CORS_ORIGINS` (e.g. `https://secstorage.vercel.app`).
- Unrestricted wildcards (`allow_origins=["*"]`) with `allow_credentials=True` are strictly forbidden in production.

---

## 3. Input Validation & Data Sanitization

1. **Backend Validation:** Every incoming request body, query parameter, and path parameter is validated using Pydantic v2 schemas. Unexpected fields are stripped.
2. **Frontend Validation:** Form inputs are validated before network submission using Zod schemas matching backend Pydantic models.
3. **MIME Type Whitelisting:** Presigned upload initiation validates MIME types against an explicit whitelist (`image/*`, `application/pdf`, `text/plain`, `video/*`, `application/zip`). Executable binaries (`.exe`, `.sh`, `.bat`) are rejected or sanitized.
