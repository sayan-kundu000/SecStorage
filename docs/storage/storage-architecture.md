# SecStorage Object Storage Architecture & Signed URL Protocol

This document details the object storage abstraction, presigned upload/download protocol, file status lifecycle, and security controls in **SecStorage**.

## Storage Architecture Overview

```text
Browser (Vercel)                  FastAPI (Render)              Object Storage (S3/Supabase)
   │                                     │                                  │
   ├── 1. POST /files/upload/initiate ──>│                                  │
   │   (filename, size, type)            │── 2. Create File (status=PENDING) │
   │                                     │── 3. Sign Upload URL ───────────>│
   │<── 4. Return upload_url & file_id ──│                                  │
   │                                     │                                  │
   ├── 5. PUT Binary Upload (Direct) ──────────────────────────────────────>│
   │                                     │                                  │
   ├── 6. POST /files/{id}/upload/confirm│                                  │
   │                                     │── 7. Verify object_exists() ────>│
   │                                     │── 8. Update status=READY         │
   │<── 9. Return READY File Response ───│                                  │
```

## Storage Key Design

- **Format:** `users/{user_id}/files/{file_id}/{random_uuid}.bin`
- **Security Boundaries:**
  - Storage keys are **server-generated** and never supplied by the browser.
  - Original filenames are sanitized against path traversal (`../`) and stored strictly as database metadata.
  - All object storage buckets are private by default; no public read permissions.

## File Lifecycle Statuses

- **`PENDING`**: Database file metadata reserved; upload presigned URL generated.
- **`UPLOADING`**: Client currently streaming binary data to object storage.
- **`READY`**: Upload confirmed by backend; object existence and size verified.
- **`FAILED`**: Upload failed or object verification timed out.
- **`DELETED`**: File metadata soft-deleted and binary object removed.

## Security & Capability Boundaries

1. **Authorization-Before-Signing:** FastAPI verifies `get_current_user` authentication and `AuthorizationService` permissions **before** issuing any presigned upload or download URL.
2. **Short-Lived URLs:** Presigned URLs expire after 15 minutes (`900` seconds).
3. **No Secret Credential Exposure:** Storage access keys and secret credentials reside strictly on the Render server environment and are **never** exposed to browser JavaScript.
