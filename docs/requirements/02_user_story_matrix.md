# SecStorage — User Story Matrix & Acceptance Criteria

This matrix defines the 10 core functional user stories for SecStorage. Each story maps out exact functional requirements, acceptance criteria, preconditions, and failure handling.

---

## Story Index

- **US-01**: User Registration & Account Provisioning
- **US-02**: User Authentication & Session Management
- **US-03**: Folder Hierarchy Management & Navigation
- **US-04**: Direct Object Storage File Upload
- **US-05**: Secure Authorative File Download
- **US-06**: User-to-User Resource Sharing
- **US-07**: Expirable Password-Protected Public Link Generation
- **US-08**: Name & Type Search and Filtering
- **US-09**: Starred Resource Quick Access
- **US-10**: Soft-Delete Trash & Restoration Lifecycle

---

## US-01: User Registration & Account Provisioning

- **As a**: New User
- **I want to**: Register an account using my email and a secure password
- **So that**: I can establish a private storage volume on SecStorage.

### Acceptance Criteria
1. System validates email format, uniqueness, and password strength (minimum 8 characters).
2. Password is hashed using Argon2id before database persistence.
3. System creates a unique root storage context for the new user.
4. Duplicate email registration requests return a clear, user-friendly `400 Bad Request` or `409 Conflict` error (`REGISTER_EMAIL_EXISTS`).
5. On successful creation, system returns user metadata without sensitive fields (`password_hash` is never exposed).

---

## US-02: User Authentication & Session Management

- **As a**: Registered User
- **I want to**: Authenticate using my credentials and maintain a secure session
- **So that**: I can access my private drive and shared resources safely.

### Acceptance Criteria
1. Submitting valid email and password credentials returns a JWT short-lived Access Token and sets an `HttpOnly`, `SameSite=Lax`, `Secure` Refresh Token cookie.
2. Invalid credentials return `401 Unauthorized` without revealing whether the email or password was incorrect.
3. Unauthenticated requests to protected endpoints return `401 Unauthorized`.
4. Endpoint `GET /auth/me` returns current user metadata if authenticated.
5. Endpoint `POST /auth/logout` revokes the refresh token and clears session cookies.

---

## US-03: Folder Hierarchy Management & Navigation

- **As a**: Authenticated User
- **I want to**: Create, rename, move, and delete folders in a nested hierarchy
- **So that**: I can organize my files systematically.

### Acceptance Criteria
1. User can create folders in root or inside any existing parent folder owned/editable by the user.
2. System enforces parent-child integrity and prevents circular relationships (e.g., moving a parent folder into its own subfolder).
3. Folder names within the same parent folder must be unique per user.
4. Deleting a folder soft-deletes the folder and cascades soft-deletion to all contained files and subfolders.
5. Breadcrumb trail correctly reflects current navigation depth.

---

## US-04: Direct Object Storage File Upload

- **As a**: Authenticated User
- **I want to**: Upload files directly to object storage via presigned URLs
- **So that**: File binaries are stored securely and efficiently without overloading the backend API server.

### Acceptance Criteria
1. User initiates upload via `POST /files/init-upload` with file name, mime type, size, and target folder ID.
2. Server validates storage quota (if enabled) and authorization, then generates a deterministic object key (`users/{user_id}/files/{file_id}/object`) and presigned PUT URL.
3. Frontend uploads raw binary payload directly to Supabase Storage / S3 via the presigned URL.
4. Frontend notifies server via `POST /files/complete-upload`, causing backend to verify object presence and transition file record status to `ACTIVE`.
5. Upload requests exceeding size limits or invalid file types are rejected during initialization.

---

## US-05: Secure Authoritative File Download

- **As a**: Authenticated User
- **I want to**: Download files I own or have permission to access
- **So that**: I can retrieve my content securely.

### Acceptance Criteria
1. User requests download link via `GET /files/{id}/download`.
2. Backend verifies ownership, shared permission (Viewer/Editor), or valid public token before generating presigned GET URL.
3. Presigned GET URL has short TTL (e.g., 15 minutes).
4. Unauthorized users attempting to download receive `403 Forbidden` or `404 Not Found`.

---

## US-06: User-to-User Resource Sharing

- **As a**: Resource Owner
- **I want to**: Share files or folders with other registered users and specify their access role (Viewer or Editor)
- **So that**: I can collaborate securely with specific individuals.

### Acceptance Criteria
1. Owner can assign `VIEWER` or `EDITOR` permissions to target users via email address.
2. System checks target user existence and creates a record in `shares` table.
3. `VIEWER` users can read/download but cannot modify, rename, move, delete, or share the resource.
4. `EDITOR` users can read, download, upload to folders, rename, and edit content, but cannot change ownership or delete resources permanently.
5. Owner can view list of current shares and revoke access at any time.

---

## US-07: Expirable Password-Protected Public Link Generation

- **As a**: Resource Owner
- **I want to**: Generate public shareable links with optional expiration dates and access passwords
- **So that**: External stakeholders can access specific files without needing a SecStorage account.

### Acceptance Criteria
1. Owner can generate a public link containing a cryptographically secure random token (`POST /public-link`).
2. Public link config supports optional expiration timestamp (`expires_at`) and optional password protection (`password`).
3. Accessing resource via public link requires providing correct password if set.
4. Expired links or revoked links return `410 Gone` or `404 Not Found`.
5. Public users cannot enumerate or access any resources outside the explicit scope of the public link.

---

## US-08: Name & Type Search and Filtering

- **As a**: Authenticated User
- **I want to**: Search files and folders by name and filter by file type (e.g., images, documents, archives)
- **So that**: I can locate stored files quickly regardless of folder depth.

### Acceptance Criteria
1. Search query parameters match against file/folder names (case-insensitive partial match).
2. Category filters (e.g., `image`, `pdf`, `document`, `spreadsheet`, `video`, `audio`) filter results by MIME type.
3. Search results ONLY return resources owned by or explicitly shared with the current user.
4. Soft-deleted (trashed) files are excluded from active search results.

---

## US-09: Starred Resource Quick Access

- **As a**: Authenticated User
- **I want to**: Star important files and folders and view them in a dedicated "Starred" view
- **So that**: I can access high-priority items instantly.

### Acceptance Criteria
1. User can toggle star status on any file or folder they own or have access to.
2. Database enforces unique constraint (`user_id`, `file_id`/`folder_id`) in `stars` table to prevent duplicate stars.
3. Dedicated `GET /starred` view returns all currently starred resources for the user.
4. Unstarring immediately removes the item from the Starred view without affecting the actual file/folder location.

---

## US-10: Soft-Delete Trash & Restoration Lifecycle

- **As a**: Authenticated User
- **I want to**: Move unwanted items to Trash and restore them if deleted accidentally
- **So that**: I am protected against accidental data loss.

### Acceptance Criteria
1. Deleting a file or folder sets `is_deleted = TRUE` and records `deleted_at` timestamp (soft delete).
2. Soft-deleted items disappear immediately from "My Drive", "Shared", and search results.
3. Dedicated `GET /trash` endpoint lists all soft-deleted items belonging to the user.
4. User can restore a trashed item, clearing `is_deleted` and returning it to its original folder hierarchy. If original parent folder was deleted, item defaults to Root drive.
5. Permanent deletion (`DELETE /trash/{id}/permanent`) permanently removes metadata and initiates object removal from object storage.
