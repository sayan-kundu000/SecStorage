# SecStorage — Product Requirements Document & MVP Contract

**Document Status:** Locked MVP Contract Specification  
**Version:** 1.0.0  
**Target Sequence Prompt:** Prompt 02 Deliverable  
**Author:** SecStorage Architectural Controller  

---

## 1. Executive Summary & Source of Truth

This document serves as the **authoritative product requirements specification and MVP contract** for **SecStorage**. Every subsequent prompt, design document, code implementation, API contract, and test suite in the SecStorage project must strictly comply with this document without scope drift, feature duplication, or architectural contradiction.

### 1.1 Product Definition & Primary Goal
SecStorage is a production-grade, secure cloud file-storage and file-sharing web application offering core features similar to Google Drive. The primary goal of the Minimum Viable Product (MVP) is to enable **individuals and small teams** to securely upload, organize, search, share, star, download, trash, and restore files through a modern, responsive web application.

### 1.2 Scope Boundaries & Feature Categorization
- **Core MVP Scope (P0 - Mandatory)**: User Registration & Authentication (Argon2id + JWT + Refresh Cookies), Nested Folder Hierarchy, Direct-to-Storage Presigned Uploads & Downloads, User-to-User Granular Sharing (RBAC: Owner, Editor, Viewer), Expirable & Password-Protected Public Shareable Links, Search & Type Filtering, Starred Resources, Soft-Delete Trash & Restoration.
- **Phase-2 Scope (P2 - Deferred)**: Version History, Advanced File Previews, Activity Audit Logs, Tags & Custom Labels, Storage Quota Management.
- **Explicit Non-Goals (P3 - Out of Scope)**: Real-time collaborative document editing, Desktop synchronization client, Native Office document suite, SAML/SCIM enterprise administration, Microservices/Kubernetes architecture, AI file classification.

---

## 2. Product Identity & Target Audience

### 2.1 Product Identity
- **Product Name:** SecStorage
- **Product Category:** Secure Cloud File-Storage and File-Sharing SaaS
- **Product Positioning:** A clean, focused Google Drive alternative emphasizing secure object storage, intuitive nested organization, server-enforced role-based access control, and seamless link sharing.

### 2.2 Target Users
1. **Individual Users:** Personal document storage, file backups, and generation of secure external download links.
2. **Small Teams:** Collaborative project folder sharing, role-based editing, and centralized file organization.

> [!NOTE]  
> SecStorage is deliberately optimized for individuals and small teams. Multi-tenant enterprise administration, complex organizational hierarchies, SAML/SCIM SSO, and enterprise billing modules are explicitly excluded from the MVP.

---

## 3. MVP North Star & End-to-End User Journey

The primary metric of success for the MVP is answering a single fundamental question:  
*"Can an authenticated user securely manage, organize, and share their files through a reliable, responsive web application?"*

### 3.1 Complete MVP User Journey Flow
```text
  +----------------------+          +----------------------+          +----------------------+
  | 1. User Registration | -------> | 2. Email/Password    | -------> | 3. Authenticated     |
  |    & Account Creation|          |    Argon2id Auth     |          |    Drive Workspace   |
  +----------------------+          +----------------------+          +----------------------+
                                                                                 |
  +----------------------+          +----------------------+                     v
  | 6. Direct Presigned  | <------- | 5. File Upload Init  | <------- +----------------------+
  |    Upload to Storage |          |    & Type Validation |          | 4. Create Nested     |
  +----------------------+          +----------------------+          |    Folders & Tree    |
             |                                                        +----------------------+
             v
  +----------------------+          +----------------------+          +----------------------+
  | 7. Complete Upload   | -------> | 8. Organize, Rename  | -------> | 9. Search & Filter   |
  |    & Metadata Sync   |          |    & Move Resources  |          |    Files / Folders   |
  +----------------------+          +----------------------+          +----------------------+
                                                                                 |
  +----------------------+          +----------------------+                     v
  | 12. Password/Expiry  | <------- | 11. Grant User Shares| <------- +----------------------+
  |     Public Link Gen  |          |     (Editor/Viewer)  |          | 10. Star Important   |
  +----------------------+          +----------------------+          |     Resources        |
             |                                                        +----------------------+
             v
  +----------------------+          +----------------------+          +----------------------+
  | 13. Download via     | -------> | 14. Soft Delete to   | -------> | 15. Restore to Drive |
  |     Signed URL       |          |     Trash Storage    |          |     or Purge Permanent|
  +----------------------+          +----------------------+          +----------------------+
```

---

## 4. Functional Requirements Specifications

### 4.1 User Authentication & Identity Management
- **Registration:** Users must register with a unique email address, full name, and strong password.
- **Password Security:** Passwords must be hashed strictly using **Argon2id** (`passlib` / `argon2-cffi`). Plaintext passwords or outdated algorithms (e.g., md5, sha1, plain bcrypt) are forbidden.
- **Token Architecture:**
  - **Access Token:** Short-lived JWT (15-minute validity) passed via Authorization header or secure memory.
  - **Refresh Token:** Long-lived JWT (7-day validity) stored strictly in `HttpOnly`, `Secure`, `SameSite=Lax` cookies.
- **Session Management:** Endpoints for `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, and `GET /auth/me`.
- **OAuth Architecture:** Backend authentication system must be designed with modular interfaces to allow future Google OAuth integration without refactoring existing email/password core schemas.

### 4.2 Folder Management & Hierarchy
- **Hierarchy:** Folders support arbitrary parent-child nesting (`parent_id` foreign key referencing `folders.id`). A `null` parent indicates root (`My Drive`).
- **Folder Operations:** Create folder, list contents (subfolders and files), rename folder, move folder to another valid parent, and soft-delete folder.
- **Breadcrumb Navigation:** Frontend must render dynamic parent breadcrumb paths (e.g., `My Drive > Projects > 2026 > Q3 Assets`).
- **Circular Dependency Guard:** Server must enforce validation preventing a folder from being moved into itself or its own subdirectories.

### 4.3 File Management & Lifecycle
- **Metadata vs Binaries:** File binaries are stored exclusively in S3-compatible Object Storage (Supabase Storage). Database (`files` table) stores metadata: `id`, `user_id`, `folder_id`, `name`, `mime_type`, `size_bytes`, `storage_key`, `created_at`, `updated_at`, `deleted_at`.
- **Operations:** Upload initiation, upload completion, download URL generation, rename, move to folder, soft-delete, restore, and permanent purge.
- **Validation:** Strict MIME type whitelist validation and maximum file size enforcement (e.g., 100 MB per file MVP limit).

### 4.4 Direct-to-Storage Presigned Upload Architecture
```text
Client (React UI)             FastAPI Backend               Supabase Object Storage
       |                             |                                  |
       |--- 1. POST /init-upload --->|                                  |
       |    (filename, mime, size)   |--- Validate Auth, Permission --->|
       |                             |    & Storage Quota Limits        |
       |<-- 2. Signed Upload URL ----|                                  |
       |    + Storage Key            |                                  |
       |                             |                                  |
       |---------------- 3. PUT Direct Upload Payload ----------------->|
       |<--------------- 4. 200 OK Upload Successful -------------------|
       |                             |                                  |
       |--- 5. POST /complete ------>|                                  |
       |    (storage_key, metadata)  |--- Verify Object Existence ----->|
       |                             |--- Persist File Record DB ------>|
       |<-- 6. File Metadata DB Rec -|                                  |
```

### 4.5 User-to-User Sharing & Server RBAC
- **Resource Sharing:** Users can share specific files or folders with other registered users via target email.
- **Roles:**
  - **Owner:** Full administrative control, delete, restore, share, revoke, generate public links.
  - **Editor:** Read, download, upload to shared folder, rename, move within shared workspace.
  - **Viewer:** Read-only access, download permission.
- **Server-Side Enforcement:** Every API request must verify user permissions against the database. UI restrictions are treated purely as UX helpers.

### 4.6 Public Shareable Links
- **Link Generation:** Owners can generate unique, cryptographically random public tokens (`/s/{token}`) for any file or folder.
- **Access Controls:**
  - **Expiration:** Optional expiration timestamp (`expires_at`).
  - **Password Protection:** Optional Argon2id-hashed link access password.
- **Public API:** Unauthenticated users can view and download public resources via valid tokens without exposing internal system IDs or user accounts.

### 4.7 Search, Starred & Trash Systems
- **Search & Filters:** Case-insensitive search on resource names, filtered by file type (e.g., `image`, `pdf`, `document`, `archive`), folder context, or date range.
- **Starred Resources:** Users can star/unstar files and folders (`stars` join table with unique `user_id` + `resource_id` constraint). Dedicated `Starred` view in UI.
- **Trash & Restoration:** Soft-deletion populates `deleted_at`. Trash view lists all soft-deleted items owned by user. Restoring clears `deleted_at` and restores item to original folder (or root if original folder was purged). Permanent delete purges database record and deletes physical object key from Supabase Storage.

---

## 5. User Story Matrix

| Story ID | Target User | Goal / Action | Business Value / Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **US-01** | Unauthenticated User | Register a new account with email, name, and password | • Valid email & password creates user record in DB.<br>• Password hashed with Argon2id.<br>• Duplicate email returns `409 Conflict`. |
| **US-02** | Registered User | Authenticate with credentials to open a secure session | • Correct credentials return access token + HttpOnly refresh cookie.<br>• Invalid credentials return `401 Unauthorized`.<br>• Protected endpoints block requests lacking valid JWT. |
| **US-03** | Authenticated User | Create, view, and navigate nested folders | • Folders correctly render in tree view and breadcrumbs.<br>• Nested folders inherit security boundaries.<br>• Moving folder into child directory is rejected with `400 Bad Request`. |
| **US-04** | Authenticated User | Upload files using presigned URLs direct to storage | • Presigned URL generated after size/MIME validation.<br>• Large binaries upload direct to Supabase Storage.<br>• DB metadata record persisted upon upload confirmation. |
| **US-05** | Authenticated User / Sharee | Download authorized files | • Server verifies Owner/Editor/Viewer permission.<br>• Server returns temporary presigned download URL (e.g., 5 min expiry).<br>• Unauthorized user download attempt returns `403 Forbidden`. |
| **US-06** | Resource Owner | Share file or folder with another user by email | • Owner assigns Viewer or Editor role.<br>• Target user receives shared item in "Shared with Me" view.<br>• Owner can view active shares and revoke access instantly. |
| **US-07** | Resource Owner | Generate public shareable link with optional expiry & password | • Unique token generated.<br>• Optional expiry date and password enforced on public access.<br>• Expired or revoked links return `410 Gone` or `404 Not Found`. |
| **US-08** | Authenticated User | Search files and folders by name and filter by file type | • Instant search input returns matching active (non-trashed) resources.<br>• Filtering by type (`image`, `pdf`) correctly narrows dataset.<br>• Search results observe strict RBAC boundaries. |
| **US-09** | Authenticated User | Star/unstar items for quick access | • User can toggle star status.<br>• Starred view lists all starred files and folders.<br>• Duplicate starring attempts handled idempotently. |
| **US-10** | Authenticated User | Soft-delete items to Trash, restore items, or permanently purge | • Soft-deleted items vanish from Drive and move to Trash.<br>• Restore returns item to original path.<br>• Permanent purge deletes DB record and object key from Supabase Storage. |

---

## 6. Role & Permission Contract (RBAC Matrix)

Permissions must be evaluated strictly on the backend.

| Resource Operation | Resource Owner | Granted Editor | Granted Viewer | Public User (Valid Link) | Unauthenticated / Unauthorized |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Read Metadata / List** | YES | YES | YES | YES (Link Scope) | NO (`401/403`) |
| **Download Binary** | YES | YES | YES | YES (Link Scope) | NO (`401/403`) |
| **Upload File / Create Folder** | YES | YES | NO | NO | NO (`401/403`) |
| **Rename Resource** | YES | YES | NO | NO | NO (`401/403`) |
| **Move Resource** | YES | YES | NO | NO | NO (`401/403`) |
| **Soft Delete Resource** | YES | NO | NO | NO | NO (`401/403`) |
| **Restore Resource** | YES | NO | NO | NO | NO (`401/403`) |
| **Permanent Purge** | YES | NO | NO | NO | NO (`401/403`) |
| **Grant Direct User Share** | YES | NO | NO | NO | NO (`401/403`) |
| **Revoke User Share** | YES | NO | NO | NO | NO (`401/403`) |
| **Create / Revoke Public Link**| YES | NO | NO | NO | NO (`401/403`) |

---

## 7. Data Requirement Map & PostgreSQL Schema Design

The backend uses PostgreSQL managed via SQLAlchemy 2.x and Alembic.

```text
+-----------------------+        +-----------------------+        +-----------------------+
|        users          |        |        folders        |        |         files         |
+-----------------------+        +-----------------------+        +-----------------------+
| PK id                 |        | PK id                 |        | PK id                 |
|    email (unique)     |<-------| FK user_id            |<-------| FK user_id            |
|    hashed_password    |        | FK parent_id (self)   |        | FK folder_id (nullable|
|    full_name          |        |    name               |        |    name               |
|    created_at         |        |    deleted_at (null)  |        |    mime_type          |
|    updated_at         |        |    created_at         |        |    size_bytes         |
+-----------------------+        +-----------------------+        |    storage_key        |
           ^                                 ^                    |    deleted_at (null)  |
           |                                 |                    +-----------------------+
           |                                 |                                ^
           +---------------------------------+--------------------------------+
                                             |
                  +--------------------------+--------------------------+
                  |                                                     |
+-----------------------------------+     +-----------------------------------+
|              shares               |     |            link_shares            |
+-----------------------------------+     +-----------------------------------+
| PK id                             |     | PK id                             |
| FK grantor_id (user_id)           |     | FK created_by (user_id)           |
| FK grantee_id (user_id)           |     | FK folder_id (nullable)           |
| FK folder_id (nullable)           |     | FK file_id (nullable)             |
| FK file_id (nullable)             |     |    token (unique indexed)         |
|    permission (EDITOR, VIEWER)    |     |    hashed_password (nullable)     |
|    created_at                     |     |    expires_at (nullable)          |
+-----------------------------------+     +-----------------------------------+
```

### 7.1 Table Indexing & Constraint Specification
1. `users`: Unique index on `email`.
2. `folders`: Foreign keys to `users(id)` and `folders(id)`. Index on `(user_id, parent_id, deleted_at)`.
3. `files`: Foreign keys to `users(id)` and `folders(id)`. Index on `(user_id, folder_id, deleted_at)`. Index on `storage_key`.
4. `shares`: Unique constraint on `(grantee_id, folder_id)` and `(grantee_id, file_id)`.
5. `link_shares`: Unique index on `token`. Index on `(file_id, folder_id)`.
6. `stars`: Primary composite key `(user_id, resource_type, resource_id)`. Unique constraint preventing duplicate stars.

---

## 8. MVP REST API Requirement Map

All responses adhere strictly to the JSON contract format:
- **Success:** `{"success": true, "data": {...}, "message": null}`
- **Error:** `{"success": false, "error": {"code": "ERROR_CODE", "message": "User visible message"}}`

### 8.1 Authentication Endpoints (`/api/v1/auth`)
- `POST /auth/register`: Register new user account.
- `POST /auth/login`: Authenticate credentials, set HttpOnly refresh cookie, return access token.
- `POST /auth/refresh`: Issue new access token using valid refresh cookie.
- `POST /auth/logout`: Clear refresh cookie, invalidate session.
- `GET /auth/me`: Fetch current authenticated user profile.

### 8.2 Folder Endpoints (`/api/v1/folders`)
- `POST /folders`: Create a new folder.
- `GET /folders/{id}`: Fetch folder metadata and contents (subfolders + files). `id=root` lists root.
- `PATCH /folders/{id}`: Rename or move folder.
- `DELETE /folders/{id}`: Soft-delete folder (and cascade soft-delete to contents).

### 8.3 File Endpoints (`/api/v1/files`)
- `POST /files/init-upload`: Validate metadata & request presigned upload URL.
- `POST /files/complete-upload`: Confirm direct storage upload success and create DB record.
- `GET /files/{id}`: Fetch file metadata.
- `GET /files/{id}/download`: Generate temporary presigned download URL.
- `PATCH /files/{id}`: Rename or move file.
- `DELETE /files/{id}`: Soft-delete file to Trash.

### 8.4 Sharing & Public Link Endpoints (`/api/v1/shares`, `/api/v1/public`)
- `POST /shares`: Share file/folder with target user by email.
- `GET /shares/me`: List resources shared with current user.
- `DELETE /shares/{id}`: Revoke direct user share.
- `POST /public-links`: Create expirable / password-protected public link.
- `GET /public-links/{token}`: Access public resource metadata (unauthenticated).
- `POST /public-links/{token}/unlock`: Verify link password and get temporary access token.
- `GET /public-links/{token}/download`: Download public file via presigned URL.

### 8.5 Search, Starred & Trash Endpoints
- `GET /search`: Search user resources by query string and filter parameters.
- `POST /stars`: Star a file or folder.
- `DELETE /stars/{resource_type}/{resource_id}`: Unstar a resource.
- `GET /stars`: List all starred resources for current user.
- `GET /trash`: List soft-deleted files and folders.
- `POST /trash/{resource_type}/{resource_id}/restore`: Restore soft-deleted resource.
- `DELETE /trash/{resource_type}/{resource_id}/purge`: Permanently delete DB record and Supabase storage binary.

---

## 9. Security & Infrastructure Requirement Map

### 9.1 Password & Token Security
- Hashing: **Argon2id** with standard parameters (memory cost 64MB, time cost 3, parallelism 4).
- JWT Signatures: HMAC-SHA256 or RSA256 using strong environment secret (`JWT_SECRET`).
- Cookies: Refresh tokens stored in cookies with `HttpOnly=True`, `Secure=True` (in production), `SameSite=Lax`.

### 9.2 Object Key Isolation & Storage Strategy
File object keys stored in Supabase Storage must be strictly deterministic and isolated:  
`storage_key = "users/{user_id}/files/{file_id}/{uuid4_suffix}.bin"`

> [!WARNING]  
> User-provided raw filenames must NEVER be used directly as storage keys in object storage to prevent path traversal attacks, key collisions, and illegal character corruption.

### 9.3 Server-Side Authorization Boundary
The backend FastAPI middleware/dependencies must evaluate RBAC rules on every request:
1. Verify JWT signature and expiration.
2. Retrieve requesting `user_id`.
3. Check resource ownership in `folders` or `files`.
4. If not owner, check `shares` table for explicit `grantee_id` matching target resource with required permission (Editor for write/update, Viewer for read/download).
5. If access is unauthorized, raise `403 Forbidden`.

---

## 10. Frontend UI/UX Requirements Contract

The frontend is built using **React 18+**, **TypeScript**, **Vite**, **Tailwind CSS**, and **shadcn/ui**.

### 10.1 Key UI Views & Components
1. **Sidebar Navigation:** Logo, "New Upload/Folder" action button, My Drive, Shared with Me, Starred, Trash, Storage usage indicator.
2. **Header Bar:** Global search input, file type filter dropdown, user profile menu, light/dark theme toggle.
3. **Main Content Workspace:**
   - Dynamic Breadcrumbs (`My Drive > Folder`).
   - Drag-and-drop file upload dropzone.
   - Grid / List view toggle for files and folders.
   - Resource Cards / Table Rows displaying icon, filename, size, last modified, and context menu.
4. **Context Menu & Action Modals:** Right-click or kebab menu for Rename, Move, Star, Share, Generate Public Link, Download, Move to Trash.
5. **Share Modal:** Input field for user email, dropdown for Viewer/Editor role selection, list of current shares with "Revoke" button, public link toggle section with expiration picker and password input.
6. **Toast Notifications:** Standardized Sonner toast alerts for success, error, and progress states.

---

## 11. Testing & Quality Assurance Contract

### 11.1 Backend Test Suite (Pytest + HTTPX)
- **Auth Unit Tests:** Verify Argon2id password hashing, registration, login success/failure, refresh token issuance, and protected endpoint rejection.
- **Folder & Hierarchy Tests:** Verify folder CRUD, nested parent-child trees, breadcrumbs, and circular move rejection.
- **File Upload & Presigned URL Tests:** Mock object storage client to verify presigned upload URL generation, complete-upload DB persistence, and presigned download URL authorization.
- **RBAC & Sharing Tests:** Verify Owner permissions, Editor write capabilities, Viewer read-only restrictions, and share revocation.
- **Trash & Purge Tests:** Verify soft-delete hiding from standard drive, restoration, and permanent storage key purge.

### 11.2 Frontend Unit/Integration Tests (Vitest + RTL)
- Render tests for file explorer, breadcrumbs, sidebar navigation, and share modal.
- State management tests for TanStack Query client caching and invalidation upon upload/delete.

### 11.3 End-to-End Test Suite (Playwright)
Automated Playwright tests verifying the 22-step MVP Acceptance Test Scenario.

---

## 12. Complete 22-Step MVP Acceptance Scenario

The MVP build is declared **complete and verified** if and only if a fresh user can execute this complete sequence without error:

1. Navigate to SecStorage web application.
2. Register a new user account (`userA@example.com`).
3. Log in with credentials and receive authenticated session.
4. Arrive at `My Drive` (root directory).
5. Click "New Folder" and create folder named `"Projects"`.
6. Open `"Projects"` folder and verify breadcrumb shows `My Drive > Projects`.
7. Drag & drop a valid sample PDF file (`spec.pdf`) into the upload dropzone.
8. Verify presigned upload completes and `spec.pdf` appears in the folder view.
9. Rename `spec.pdf` to `project_spec.pdf`.
10. Click Star icon on `project_spec.pdf`.
11. Navigate to `Starred` view in sidebar and verify `project_spec.pdf` is present.
12. Use header search bar to search `"project_spec"`, verify result appears.
13. Open Share Modal on `"Projects"` folder, enter `userB@example.com`, assign `Editor` role.
14. Log out `userA`, log in as `userB@example.com`.
15. Navigate to `Shared with Me` and verify `"Projects"` folder is accessible.
16. Log back in as `userA@example.com`, open Share Modal, select "Generate Public Link" with password `"secret123"`.
17. Open incognito browser window, access public link URL.
18. Enter password `"secret123"` and verify file download succeeds.
19. As `userA`, move `project_spec.pdf` to Trash.
20. Navigate to `Trash` view, verify file is present.
21. Click "Restore" and verify file returns to `"Projects"` folder.
22. Log out and verify direct API calls to `/files/{id}` without authorization header return `401 Unauthorized`.

---

## 13. Requirements Traceability Matrix

| Requirement Ref | API Endpoint | DB Tables | Backend Service | Security Mechanism | Frontend Component | Test Case | Deployment Target |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-AUTH-01** | `POST /auth/register`<br>`POST /auth/login` | `users` | `AuthService` | Argon2id Hashing,<br>JWT + HttpOnly Cookie | `LoginForm.tsx`<br>`RegisterForm.tsx` | `test_auth.py`<br>`auth.spec.ts` | Render API / PostgreSQL |
| **REQ-FOLD-01** | `POST /folders`<br>`GET /folders/{id}` | `folders` | `FolderService` | RBAC Owner Check,<br>Parent Hierarchy Guard | `FolderTree.tsx`<br>`Breadcrumbs.tsx` | `test_folders.py`<br>`folders.spec.ts` | Render API / PostgreSQL |
| **REQ-FILE-01** | `POST /files/init-upload`<br>`POST /files/complete` | `files` | `FileService`, `StorageService` | Presigned URL Signatures,<br>MIME & Size Validation | `UploadDropzone.tsx`<br>`FileGrid.tsx` | `test_files.py`<br>`upload.spec.ts` | Render / Supabase Storage |
| **REQ-FILE-02** | `GET /files/{id}/download` | `files` | `FileService`, `StorageService` | Expiring Presigned Download URL, RBAC Check | `FileActions.tsx` | `test_download.py` | Render / Supabase Storage |
| **REQ-SHAR-01** | `POST /shares`<br>`DELETE /shares/{id}` | `shares` | `ShareService` | RBAC Server Check<br>(Owner/Editor/Viewer) | `ShareModal.tsx` | `test_sharing.py` | Render API / PostgreSQL |
| **REQ-LINK-01** | `POST /public-links`<br>`GET /public-links/{token}` | `link_shares` | `PublicLinkService` | Token Hashing,<br>Password & Expiry Guard | `PublicLinkView.tsx` | `test_public_links.py` | Render API / PostgreSQL |
| **REQ-SRCH-01** | `GET /search`<br>`GET /stars` | `files`, `folders`, `stars` | `SearchService` | Scope-Isolated Indexed Query, Unique Constraint | `SearchBar.tsx`<br>`StarredView.tsx` | `test_search.py` | Render API / PostgreSQL |
| **REQ-TRSH-01** | `DELETE /files/{id}`<br>`POST /trash/restore` | `files`, `folders` | `TrashService` | Soft-Delete Filter (`deleted_at`), Purge Key | `TrashView.tsx` | `test_trash.py` | Render / Supabase Storage |

---

## 14. Scope Change & Anti-Creep Governance

To preserve the focus, quality, and maintainability of SecStorage, any proposed modification to this contract must follow strict scope governance:

1. **Rule of Architectural Stability:** No developer or AI prompt shall introduce microservices, Kubernetes, custom real-time sync protocols, or AI recommendation modules into the SecStorage MVP.
2. **Rule of Feature Promotion:** Features defined as Phase-2 (Version History, Activity Auditing, Media Previews, Storage Quota) may only be implemented after all P0 MVP acceptance criteria are fully met and verified.
3. **Rule of Backward Compatibility:** Database migrations and API schemas must preserve backward compatibility across all 23 prompts of the implementation sequence.

---
**End of SecStorage Product Requirements Document & MVP Contract.**
