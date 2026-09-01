# SecStorage — Storage Architecture & Presigned Upload Lifecycle

**Document Version:** 1.0.0  
**Target Sequence Prompt:** Prompt 03 Deliverable  
**Author:** SecStorage Technical Architecture Controller  

---

## 1. Storage Provider Strategy

SecStorage isolates file binary payloads from relational metadata.
- **Provider:** **Supabase Storage** (S3-Compatible Object API) as default.
- **Abstraction Interface:** Provider-agnostic `StorageService` interface allowing seamless migration to AWS S3, Cloudflare R2, or MinIO without altering application route or service logic.

---

## 2. Deterministic Object Key Isolation

Object storage keys stored in Supabase Storage must be strictly isolated by user ID and file UUID to prevent directory traversal attacks, key collisions, and filename character corruption.

### Storage Key Format Pattern:
`users/{user_id}/files/{file_id}/{uuid4_suffix}.bin`

### Examples:
- `users/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/files/3c9bbf22-4411-419b-a991-88f6a2b8e3a1/a1b2c3d4.bin`

> [!WARNING]  
> User-provided raw filenames (e.g. `../../etc/passwd` or `Invoice 2026 (1).pdf`) must NEVER be used as the object storage key. They are stored strictly in the database metadata `files.name` column.

---

## 3. Direct-to-Storage Upload Lifecycle (Two-Step Flow)

To avoid streaming large binary files through the FastAPI application server, SecStorage uses a 3-phase presigned URL direct upload architecture:

```text
Browser Client                    FastAPI Backend               Supabase Object Storage
       │                                 │                                  │
       │─── 1. POST /files/init-upload ─>│                                  │
       │    (name, mime_type, size)      │── Verify Auth, Rate Limits, ────>│
       │                                 │   MIME Whitelist & Quotas        │
       │<── 2. 200 OK Signed Upload URL ─│                                  │
       │    + storage_key + expiry       │                                  │
       │                                 │                                  │
       │───────────────────── 3. PUT Direct File Binary Payload ───────────>│
       │<──────────────────── 4. 200 OK Upload Confirmed ──────────────────│
       │                                 │                                  │
       │─── 5. POST /files/complete ────>│                                  │
       │    (storage_key, metadata)      │── 6. Verify Object Head In S3 ──>│
       │                                 │── 7. Persist DB File Metadata ──>│
       │<── 8. 201 Created File Record ──│                                  │
```

### Phase 1: Upload Initialization (`POST /api/v1/files/init-upload`)
1. Client sends file metadata (`name`, `mime_type`, `size_bytes`, `folder_id`).
2. FastAPI validates session, folder write permission, MIME whitelist, and file size limits.
3. FastAPI generates a new `file_id` (UUID) and storage key: `users/{user_id}/files/{file_id}/{suffix}.bin`.
4. FastAPI calls Supabase S3 client to generate a presigned PUT URL valid for 15 minutes.
5. Response returns `upload_url`, `storage_key`, and `file_id`.

### Phase 2: Direct Binary Upload
Client issues a standard HTTP `PUT` request directly to `upload_url` with the file binary. Fast direct transmission to Supabase S3 bypasses the FastAPI server completely.

### Phase 3: Upload Completion (`POST /api/v1/files/complete-upload`)
1. Client sends `storage_key` and `file_id` to confirm upload completion.
2. FastAPI calls S3 `head_object` to verify file binary exists in storage and matches recorded `size_bytes`.
3. FastAPI persists the new `files` record in PostgreSQL.
4. Returns the complete metadata record to the client.

---

## 4. Secure Presigned Download Architecture

When an authorized user requests to download a file:
1. Client sends `GET /api/v1/files/{file_id}/download`.
2. FastAPI verifies user session and evaluates `PermissionService` (verifying user is Owner, Editor, or Viewer of the file/parent folder).
3. FastAPI calls `StorageService.generate_presigned_download_url()` setting Content-Disposition header with the original `files.name`.
4. Returns presigned S3 download URL valid for 5 minutes (`expires_in=300`).
5. Client downloads file directly from Supabase Storage. Storage credentials remain completely secret.

---

## 5. Orphaned Object Cleanup Strategy

If a client initiates an upload (`POST /files/init-upload`) but abandons the binary upload step, an unreferenced object or pending key may remain.
- **Cleanup Worker:** A lightweight background job or scheduled cron script scans Supabase Storage for unreferenced keys older than 24 hours and purges them.
