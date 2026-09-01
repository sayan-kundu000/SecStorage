# SecStorage — Activity Audit, Version History & File Preview Engine

## Overview

The **Activity Audit, Version History & File Preview Engine** provides complete traceability, recoverable revision history, and format-aware inline file previews for SecStorage.

---

## Key Invariants & Architectural Principles

1. **Version Immutability**: Historical storage objects and version metadata are immutable. Once written, version records are never updated in place.
2. **Restoration Creates a New Version**: Restoring `Version K` creates a new `Version N+1` whose content matches `Version K`. Historical revisions are preserved in full chronological order.
3. **Logical File Identity Preservation**: Uploading a content replacement or restoring a version retains the existing `file_id`. All user shares, star marks, public share links, and folder positions remain attached to the logical file.
4. **Authorization Isolation**: Accessing any file version or preview endpoint enforces parent file authorization via `AuthorizationService`. Version IDs are not treated as secret access credentials.
5. **Preview Content Security**: Uploaded HTML and SVG files are sanitized/escaped before being rendered, preventing untrusted active code execution on the SecStorage origin.
6. **Audit Record Immutability**: Audit trail records are append-only. Users cannot modify or erase security audit events.

---

## Core Entities & Relational Schema

### 1. `file_versions` Table
- `id`: `UUID` (Primary Key)
- `file_id`: `UUID` (Foreign Key → `files.id` ON DELETE CASCADE)
- `version_number`: `INTEGER` (>= 1, `UNIQUE(file_id, version_number)`)
- `storage_key`: `VARCHAR(512)`
- `size_bytes`: `BIGINT`
- `checksum`: `VARCHAR(64)` (SHA-256)
- `mime_type`: `VARCHAR(127)`
- `original_filename`: `VARCHAR(255)`
- `created_by`: `UUID` (Foreign Key → `users.id` ON DELETE SET NULL)
- `created_at`: `TIMESTAMPTZ`

### 2. `activities` Table
- `id`: `UUID` (Primary Key)
- `user_id`: `UUID` (Foreign Key → `users.id` ON DELETE CASCADE)
- `action`: `VARCHAR(50)` (`FILE_UPLOADED`, `FILE_VERSION_CREATED`, `FILE_VERSION_RESTORED`, `FILE_DOWNLOADED`, `FILE_PREVIEWED`, `RESOURCE_SHARED`, etc.)
- `resource_type`: `VARCHAR(20)` (`FILE`, `FOLDER`, `USER`, `SYSTEM`)
- `resource_id`: `UUID`
- `metadata_json`: `TEXT` (Structured JSON payload)
- `ip_address`: `VARCHAR(45)`
- `created_at`: `TIMESTAMPTZ`

---

## API Endpoints

### File Versioning APIs
- `GET /api/v1/files/{file_id}/versions`: List paginated historical file versions.
- `GET /api/v1/files/{file_id}/versions/{version_id}`: Retrieve version details.
- `GET /api/v1/files/{file_id}/versions/{version_id}/download`: Issue presigned download URL for a specific version.
- `POST /api/v1/files/{file_id}/versions/{version_id}/restore`: Restore target version content (creates Version N+1).

### File Preview APIs
- `GET /api/v1/files/{file_id}/preview`: Generate inline preview payload or signed URL for current file version.
- `GET /api/v1/files/{file_id}/versions/{version_id}/preview`: Generate inline preview for a specific historical version.
- `GET /api/v1/public-links/{token}/preview`: Generate inline preview for an active public share link.

### Activity & Audit APIs
- `GET /api/v1/activities`: Get paginated current user activity timeline feed.
- `GET /api/v1/files/{file_id}/activity`: Get activity history for a file.
- `GET /api/v1/folders/{folder_id}/activity`: Get activity history for a folder.
- `GET /api/v1/audit`: Get system-wide security audit logs (Admin restricted).
