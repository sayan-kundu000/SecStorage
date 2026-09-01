# SecStorage — Technical Requirements Maps (API, Data, Security, Frontend, Storage)

This document establishes the technical architectural contracts and requirement maps across all system layers.

---

## 1. API Requirement Map & REST JSON Standard

### 1.1 JSON Contract Wrapper Standard
All REST API endpoints MUST return responses conforming to the unified JSON wrapper envelope:

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": null
}
```

#### Error Response
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested file does not exist or access is denied.",
    "details": []
  }
}
```

### 1.2 Core API Endpoints

| Category | Method | Endpoint | Summary Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/register` | Register new user with email & password |
| **Auth** | `POST` | `/api/v1/auth/login` | Authenticate user; returns Access Token & sets Refresh Cookie |
| **Auth** | `GET` | `/api/v1/auth/me` | Fetch metadata for currently authenticated user |
| **Auth** | `POST` | `/api/v1/auth/logout` | Revoke session & clear refresh cookie |
| **Folders** | `POST` | `/api/v1/folders` | Create a new folder |
| **Folders** | `GET` | `/api/v1/folders/{id}` | Retrieve folder metadata & listing of immediate children |
| **Folders** | `PATCH` | `/api/v1/folders/{id}` | Rename or move folder |
| **Folders** | `DELETE`| `/api/v1/folders/{id}` | Soft-delete folder & cascade to contents |
| **Files** | `POST` | `/api/v1/files/init-upload` | Initiate upload; returns presigned object storage URL |
| **Files** | `POST` | `/api/v1/files/complete-upload`| Verify upload & persist active file record |
| **Files** | `GET` | `/api/v1/files/{id}` | Get file metadata |
| **Files** | `GET` | `/api/v1/files/{id}/download` | Get short-lived presigned download URL |
| **Files** | `PATCH` | `/api/v1/files/{id}` | Rename or move file |
| **Files** | `DELETE`| `/api/v1/files/{id}` | Soft-delete file (move to Trash) |
| **Sharing** | `POST` | `/api/v1/shares` | Grant Viewer or Editor permission to a user |
| **Sharing** | `DELETE`| `/api/v1/shares/{id}` | Revoke shared access |
| **Public** | `POST` | `/api/v1/public-links` | Create expirable/password-protected public link |
| **Public** | `GET` | `/api/v1/public-links/{token}`| Access public link resource |
| **Search** | `GET` | `/api/v1/search` | Search files & folders by name and MIME type |
| **Starred** | `POST` | `/api/v1/starred` | Toggle star on file/folder |
| **Starred** | `GET` | `/api/v1/starred` | List all starred items for current user |
| **Trash** | `GET` | `/api/v1/trash` | List soft-deleted items |
| **Trash** | `POST` | `/api/v1/trash/{id}/restore` | Restore soft-deleted item |
| **Trash** | `DELETE`| `/api/v1/trash/{id}/permanent`| Permanently delete item & object storage binary |

---

## 2. Data Requirement Map (PostgreSQL Relational Schema)

Core entities in PostgreSQL:

1. **`users`**: `id` (UUID PK), `email` (UNIQUE), `password_hash` (Argon2id), `full_name`, `created_at`, `updated_at`.
2. **`folders`**: `id` (UUID PK), `owner_id` (FK users), `parent_id` (FK folders NULLABLE), `name`, `is_deleted` (BOOL), `deleted_at` (TIMESTAMP), `created_at`, `updated_at`. Index on `(owner_id, parent_id)`.
3. **`files`**: `id` (UUID PK), `owner_id` (FK users), `folder_id` (FK folders NULLABLE), `name`, `size_bytes` (BIGINT), `mime_type`, `object_key` (VARCHAR UNIQUE), `is_deleted` (BOOL), `deleted_at` (TIMESTAMP), `created_at`, `updated_at`. Index on `(owner_id, folder_id)`, index on `mime_type`.
4. **`shares`**: `id` (UUID PK), `grantor_id` (FK users), `grantee_id` (FK users), `resource_type` (ENUM 'file','folder'), `file_id` (FK files NULLABLE), `folder_id` (FK folders NULLABLE), `role` (ENUM 'VIEWER','EDITOR'), `created_at`. Unique constraint on `(grantee_id, file_id, folder_id)`.
5. **`link_shares`**: `id` (UUID PK), `token` (VARCHAR UNIQUE INDEX), `creator_id` (FK users), `file_id` (FK files NULLABLE), `folder_id` (FK folders NULLABLE), `password_hash` (NULLABLE), `expires_at` (TIMESTAMP NULLABLE), `created_at`.
6. **`stars`**: `id` (UUID PK), `user_id` (FK users), `file_id` (FK files NULLABLE), `folder_id` (FK folders NULLABLE), `created_at`. Unique constraint on `(user_id, file_id, folder_id)`.

---

## 3. Security Requirement Map

1. **Password Hashing**: Argon2id algorithm (memory=65536, time=3, parallelism=4).
2. **Session Architecture**:
   - Access Token: Short-lived JWT (15-min TTL) transmitted in `Authorization: Bearer <token>` header or auth state.
   - Refresh Token: Long-lived JWT (7-day TTL) stored in `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
3. **Storage Presigned Security**: Direct binary uploads and downloads use short-lived presigned S3/Supabase URLs (15-min TTL) computed server-side after authorization check.
4. **Object Key Isolation**: Files stored using `users/{user_id}/files/{file_id}/object`. Raw user filenames are stored in PostgreSQL metadata only.
5. **Request Validation**: Pydantic v2 schemas on FastAPI backend; Zod schemas on React frontend.

---

## 4. Frontend Requirement Map (React Stack)

1. **Technology Stack**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query (React Query v5), Axios, React Hook Form, Zod, Lucide React, Sonner.
2. **Main Layout & Views**:
   - **Sidebar**: My Drive, Shared with me, Starred, Trash, Storage usage indicator.
   - **Header**: Global search input, file type filter dropdown, user profile menu, upload trigger button.
   - **Explorer Area**: Breadcrumb trail, Grid view vs. List view toggle, Context menus, Drag-and-Drop upload dropzone overlay.
   - **Modals**: New Folder modal, Share modal (user selection & link generation), File Details slide-over, Confirmation dialogs.

---

## 5. Storage Requirement Map (Supabase / S3 Provider Abstraction)

1. **Provider Layer**: Backend implements a generic `ObjectStorageService` protocol capable of targeting Supabase Storage or AWS S3.
2. **Direct Upload Flow**:
   - Client calls `POST /files/init-upload` -> Server validates auth & returns `upload_url` (Presigned PUT) and `file_id`.
   - Client PUTs raw file binary directly to `upload_url`.
   - Client calls `POST /files/complete-upload` -> Server verifies object existence in bucket and marks file `ACTIVE`.
