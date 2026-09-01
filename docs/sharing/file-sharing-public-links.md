# SecStorage — File Sharing, Public Links & Collaboration Permission Engine

## 1. Overview & Architectural Principles

SecStorage provides a multi-layer security and collaboration model supporting:
1. **Private User-to-User Sharing**: Direct permission grants (`VIEWER` or `EDITOR`) on files and folders.
2. **Folder Permission Inheritance**: Sharing a folder implicitly grants permission to all descendant subfolders and files. Direct resource permissions override inherited permissions.
3. **Public Link Sharing**: Expirable, optional password-protected public share link tokens with download restriction controls (`allow_download`).
4. **Security & Storage Isolation**: Token hashing (SHA-256 for public tokens, Argon2id for password protection), temporary signed URLs for binary transfers, zero storage duplication, and Render/Vercel readiness.

---

## 2. Four Security Layers

SecStorage cleanly separates four security concerns:
1. **Authentication Layer**: Verifies account identity via JWT tokens (`User.id`).
2. **RBAC Layer**: Enforces global administrative & system permissions (`Role.ADMIN`, `Role.USER`).
3. **Resource Permission Layer**: Resolves specific resource access via Ownership (`OWNERSHIP`), Direct Share (`EXPLICIT_SHARE`), or Folder Subtree Inheritance (`INHERITED_SHARE`).
4. **Public Link Access Layer**: Validates cryptographically secure link tokens, active state, expiration timestamps, optional password challenges, and download restrictions (`allow_download`).

---

## 3. Database Models & Schema

### `shares` Table
- `id` (`UUID`, PK)
- `grantor_id` (`UUID`, FK -> `users.id`, index)
- `grantee_id` (`UUID`, FK -> `users.id`, index)
- `folder_id` (`UUID | None`, FK -> `folders.id`, index)
- `file_id` (`UUID | None`, FK -> `files.id`, index)
- `permission` (`VARCHAR(20)`, Check constraint: `EDITOR` or `VIEWER`)
- Constraints: XOR check (`folder_id` XOR `file_id`), Unique constraint (`grantee_id`, `folder_id` / `file_id`).

### `link_shares` Table
- `id` (`UUID`, PK)
- `created_by` (`UUID`, FK -> `users.id`, index)
- `folder_id` (`UUID | None`, FK -> `folders.id`, index)
- `file_id` (`UUID | None`, FK -> `files.id`, index)
- `token` (`VARCHAR(64)`, unique token SHA-256 hash, indexed)
- `hashed_password` (`VARCHAR(255) | None`, Argon2id password hash)
- `expires_at` (`TIMESTAMPTZ | None`, index)
- `allow_download` (`BOOLEAN`, default `true`)
- `permission` (`VARCHAR(20)`, default `VIEWER`)
- `is_active` (`BOOLEAN`, default `true`)

---

## 4. API Endpoints Contract

### Private Sharing Endpoints
- `POST /api/v1/shares` / `POST /api/v1/files/{id}/shares` / `POST /api/v1/folders/{id}/shares`: Grant user share.
- `GET /api/v1/shares`: List items shared with me.
- `GET /api/v1/files/{id}/shares` / `GET /api/v1/folders/{id}/shares`: List shares granted on a resource.
- `PATCH /api/v1/shares/{id}`: Update share permission (`EDITOR` <-> `VIEWER`).
- `DELETE /api/v1/shares/{id}`: Revoke user share.

### Public Link Endpoints
- `POST /api/v1/public-links` / `POST /api/v1/files/{id}/public-links` / `POST /api/v1/folders/{id}/public-links`: Create public link.
- `GET /api/v1/public-links/{token}`: Access public link metadata.
- `POST /api/v1/public-links/{token}/verify`: Verify password for protected link.
- `GET /api/v1/public-links/{token}/download`: Generate public download signed URL (if `allow_download = true`).
- `GET /api/v1/files/{id}/public-links` / `GET /api/v1/folders/{id}/public-links`: List active public links for owner.
- `DELETE /api/v1/public-links/{id}`: Revoke public share link.

---

## 5. Security & Lifecycle Rules

1. **Token Hygiene**: Plaintext tokens are returned **only once** upon link creation. PostgreSQL stores SHA-256 digests (`token_hash`).
2. **Password Protection**: Argon2id salted hashing. Plaintext passwords are never logged or stored.
3. **Trash Interaction**: Trashing a resource (`deleted_at IS NOT NULL`) immediately disables shared access and public link resolution. Restoring the resource re-enables valid, unexpired shares/links.
4. **Permanent Deletion**: Permanently purging a resource removes associated database share rows and deactivates public link tokens.
5. **No Storage Duplication**: Sharing and public link access operate exclusively on metadata and presigned URLs. Binary objects in storage remain single-instanced and immutable.
