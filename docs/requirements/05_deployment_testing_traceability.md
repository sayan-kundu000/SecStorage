# SecStorage — Deployment, Testing & Requirements Traceability Matrix

This document defines the deployment standards, testing strategy, requirements traceability matrix, and the official MVP acceptance test scenario.

---

## 1. Deployment Requirement Map

The SecStorage application is engineered for production deployment across GitHub, Render, Vercel, and Supabase.

```text
  [GitHub Monorepo]
   │         │
   │ Push    │ Push
   ▼         ▼
[Vercel]   [Render] ──────► [Supabase PostgreSQL]
(Frontend) (Backend)
                 └────────► [Supabase Object Storage]
```

### 1.1 Deployment Targets
- **Frontend**: Vercel (Static / Single-Page React App built with Vite).
- **Backend API**: Render Web Service (FastAPI containerized / Uvicorn runner).
- **Relational Database**: Managed PostgreSQL (Supabase DB or Render Postgres).
- **Object Storage**: Supabase Storage / S3 Bucket.

### 1.2 Environment Variables Standard (`.env.example`)
```env
# Backend Environment
ENVIRONMENT=production
SECRET_KEY=change-this-in-production-secure-random-secret
ARGON2_TIME_COST=3
ARGON2_MEMORY_COST=65536
JWT_ACCESS_TTL_MINUTES=15
JWT_REFRESH_TTL_DAYS=7

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/secstorage

# Object Storage (Supabase / S3)
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STORAGE_BUCKET_NAME=secstorage-files

# CORS
CORS_ORIGINS=https://secstorage.vercel.app,http://localhost:5173
```

---

## 2. Testing Requirement Map

SecStorage requires automated testing across three architectural layers:

1. **Backend Unit & API Tests (Pytest + HTTPX)**:
   - Auth endpoints, JWT issuance, refresh cookie validation.
   - Presigned upload & download URL signature creation.
   - Server-side RBAC evaluation logic (Owner, Editor, Viewer access matrices).
   - Soft-delete, trash listing, and restoration handling.

2. **Frontend Component & Hook Tests (Vitest + React Testing Library)**:
   - Authentication context provider & session persistence.
   - File/Folder explorer rendering & state transitions.
   - Form validations (Registration, Login, Share link generation).

3. **End-to-End E2E Integration Tests (Playwright)**:
   - Complete execution of the 22-Step MVP Acceptance Scenario.

---

## 3. Requirements Traceability Matrix (8-Layer Mapping)

Every feature in SecStorage MUST trace cleanly across all 8 architectural layers:

| Feature / Requirement | API Endpoint | Database Table | Service Module | Security Enforcer | Frontend View/Component | Test Module | Deployment Config |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth Registration** | `POST /auth/register` | `users` | `AuthService` | Argon2id Hashing | `RegisterForm.tsx` | `test_auth.py` | `DATABASE_URL` |
| **Auth Session** | `POST /auth/login` | `users` | `AuthService` | JWT + HttpOnly Cookie | `AuthContext.tsx` | `test_auth.py` | `SECRET_KEY` |
| **Folder Hierarchy** | `POST /folders` | `folders` | `FolderService` | RBAC `parent_id` check | `FolderTree.tsx` | `test_folders.py` | `DATABASE_URL` |
| **Direct File Upload** | `POST /files/init-upload`| `files` | `StorageService` | Presigned URL Signer | `UploadDropzone.tsx`| `test_files.py` | `SUPABASE_KEY` |
| **Direct File Download**| `GET /files/{id}/download`| `files` | `StorageService` | RBAC + Presigned GET | `FileActions.tsx` | `test_files.py` | `SUPABASE_KEY` |
| **User Sharing** | `POST /shares` | `shares` | `ShareService` | Owner RBAC Check | `ShareModal.tsx` | `test_shares.py` | `DATABASE_URL` |
| **Public Link Sharing** | `POST /public-links` | `link_shares` | `LinkShareService` | Expire & Password Check| `PublicLinkView.tsx`| `test_links.py` | `DATABASE_URL` |
| **Name & Type Search** | `GET /search` | `files`, `folders`| `SearchService` | Owner Scope Filter | `SearchBar.tsx` | `test_search.py` | `DATABASE_URL` |
| **Starred Items** | `POST /starred` | `stars` | `StarService` | Unique constraint | `StarredView.tsx` | `test_starred.py` | `DATABASE_URL` |
| **Soft Delete & Restore**| `POST /trash/{id}/restore`| `files`, `folders`| `TrashService` | Soft Delete Flag | `TrashView.tsx` | `test_trash.py` | `DATABASE_URL` |

---

## 4. Official 22-Step MVP Acceptance Test Scenario

The MVP build is accepted as complete ONLY when a fresh user completes this scenario end-to-end without manual database interventions or unhandled errors:

1. **Launch App**: User navigates to the deployed frontend URL (`https://secstorage.vercel.app`).
2. **Register**: User registers a new account (`testuser@secstorage.io` / `Password123!`).
3. **Log In**: User authenticates via login form and receives session cookies.
4. **My Drive**: User lands on the main "My Drive" workspace dashboard.
5. **Create Folder**: User clicks "New Folder", enters "Projects", and submits.
6. **Open Folder**: User double-clicks "Projects" to enter its folder context.
7. **Initiate Upload**: User drops a file `document.pdf` into the upload dropzone (`POST /files/init-upload`).
8. **Direct Upload**: Frontend uploads binary payload directly to presigned object storage URL.
9. **Complete Upload**: Frontend notifies backend (`POST /files/complete-upload`); file appears in list.
10. **Rename File**: User renames file to `quarterly_report.pdf`.
11. **Star File**: User toggles the star icon on `quarterly_report.pdf`.
12. **Verify Starred View**: User navigates to "Starred" view in sidebar and verifies `quarterly_report.pdf` is present.
13. **Search File**: User types "quarterly" in search bar; search results return `quarterly_report.pdf`.
14. **User Sharing**: User opens Share modal and shares `quarterly_report.pdf` with `colleague@secstorage.io` as `VIEWER`.
15. **Generate Public Link**: User generates a public share link for `quarterly_report.pdf` with a 24-hour expiration.
16. **Access Public Link**: User opens incognito tab, visits public link, and downloads the file binary successfully.
17. **Soft Delete**: User moves `quarterly_report.pdf` to Trash.
18. **Verify Drive**: File disappears from "My Drive" and "Starred" views.
19. **Navigate Trash**: User navigates to "Trash" view in sidebar; trashed file is present.
20. **Restore Item**: User selects `quarterly_report.pdf` and clicks "Restore".
21. **Verify Restoration**: File returns to "Projects" folder with metadata and contents intact.
22. **Log Out & Security Check**: User logs out; attempting to access `/api/v1/files` directly via browser/curl returns `401 Unauthorized`.
