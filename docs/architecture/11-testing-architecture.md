# SecStorage — Full-Stack Testing & Quality Assurance Architecture

**Document Version:** 1.0.0  
**Target Sequence Prompt:** Prompt 03 Deliverable  
**Author:** SecStorage Technical Architecture Controller  

---

## 1. Testing Pyramid Strategy

SecStorage establishes a 3-tier testing strategy covering unit business logic, API integration authorization boundaries, and end-to-end user workflows.

```text
                     / \
                    /   \
                   / E2E \          Playwright E2E Tests (22-step audit scenario)
                  /-------\
                 /  API &  \        Pytest + HTTPX Async Integration Tests
                /  Auth    \        Vitest + RTL Component Integration
               /------------\
              /  Unit Tests  \      Pytest Domain Logic & Zod Schema Validation
             /----------------\
```

---

## 2. Backend Testing Architecture (Pytest + HTTPX)

The backend test suite (`backend/tests/`) uses **Pytest** with **HTTPX AsyncClient** against an isolated PostgreSQL test database (or SQLite async fallback) and a mocked `StorageService`.

### 2.1 Critical Test Modules
- `test_auth.py`: User registration, Argon2id password hashing validation, login success/failure, refresh cookie issuance, token expiration, and unauthenticated endpoint rejection.
- `test_folders.py`: Folder creation, nested parent-child hierarchy, breadcrumb generation, folder rename, folder move, circular move prevention (`400 Bad Request`), and soft deletion.
- `test_files.py`: Presigned upload initialization (`POST /files/init-upload`), direct S3 PUT mocking, complete-upload DB metadata creation (`POST /files/complete-upload`), presigned download URL generation, and file rename/move.
- `test_sharing.py`: User-to-user sharing (Owner, Editor, Viewer roles), server-side permission enforcement, read/write restrictions, and share revocation.
- `test_public_links.py`: High-entropy token generation, expiration enforcement, Argon2id password protection unlock flow, public metadata access, and revoked link rejection.
- `test_search_trash.py`: Indexed search query filtering, starred item toggling, soft-delete Trash hiding, folder restore, and permanent purge.

---

## 3. Frontend Testing Architecture (Vitest + React Testing Library)

The frontend test suite (`frontend/src/__tests__/`) uses **Vitest** and **React Testing Library**:
- Render tests for Drive file explorer, breadcrumbs, sidebar navigation, and Share modal.
- Form validation tests for Login, Register, and Create Folder forms via Zod schemas.
- Mock Service Worker (MSW) or Axios interceptor mocking for TanStack Query mutation invalidation.

---

## 4. End-to-End Testing Architecture (Playwright)

Automated **Playwright** tests execute against a running full-stack instance to verify the 22-step MVP Acceptance Test Scenario:
1. User registration & login.
2. Navigating `My Drive`.
3. Creating `"Projects"` folder.
4. Uploading sample file.
5. Renaming & starring file.
6. Searching resource.
7. Sharing folder with `Editor` role.
8. Generating password-protected public link.
9. Moving file to Trash & restoring it.
10. Logout & verifying protected endpoint rejection.
