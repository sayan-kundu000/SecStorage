# SecStorage — Search, Filter, Sort, Starred, Trash & Recovery Engine Architecture

## 1. Overview
The Search, Filter, Sort, Starred, Trash & Recovery Engine provides a unified discovery, organization, and lifecycle management platform for SecStorage. Built with FastAPI, PostgreSQL, SQLAlchemy 2.x, and Pydantic v2, it enforces three core concepts:

1. **Discovery (Search, Filter, Sort)**: Fast metadata-based search over files and folders, scoped strictly by resource permissions (ownership or explicit shares).
2. **User Organization (Starred)**: User-specific favorite markers that allow quick navigation without affecting file location, access rights, or storage objects.
3. **Lifecycle (Trash, Recovery, Permanent Deletion)**: Soft-deletion preserving hierarchy and storage keys, conflict-aware restoration, and safe permanent purging.

---

## 2. Storage Separation & Source of Truth
- **PostgreSQL**: Source of truth for resource metadata, folder relationships, user favorite stars, deletion timestamps (`deleted_at`), and restoration state.
- **Object Storage**: Holds binary payload bytes. Moving a resource to trash, restoring it, starring/unstarring it, renaming, or moving it **never** alters or moves the object storage key (`storage_key`). Binary object deletion occurs **only** during explicit permanent deletion via `StorageService`.

---

## 3. Search Engine Architecture
Search is performed purely against PostgreSQL metadata (`ILIKE` on `lower(name)` with wildcard escaping).
- **Wildcard Safety**: User query characters `%` and `_` are escaped to `\%` and `\_` to prevent arbitrary pattern abuse.
- **Case Insensitivity**: Queries match case-insensitively using `lower(name)` functional indexes (`idx_files_lower_name`, `idx_folders_lower_name`).
- **Authorization Scoping**: Search results include only resources owned by the requesting user or explicitly shared with them. Trash resources (`deleted_at IS NOT NULL`) are excluded from active search results by default.
- **Batch Star Resolution**: Star status for search results is batch-loaded using a single SQL query (`StarRepository.get_starred_resource_ids`), eliminating N+1 DB lookup overhead.

---

## 4. Filter & Sort Engines
- **Filters**:
  - `type`: `file`, `folder`, or `all`.
  - `mimeType`: Exact string or wildcard prefix (e.g., `image/*`).
  - `extension`: File extension matching (e.g., `pdf`, `jpg`).
  - `minSize` / `maxSize`: Size boundary filters in bytes.
  - `createdAfter` / `createdBefore` / `updatedAfter` / `updatedBefore`: UTC ISO timestamp filters.
  - `folderId`: Filter by parent container folder.
  - `starred`: Filter by user favorite status (`true` / `false`).
- **Sorting**:
  - Supported fields: `name`, `createdAt`, `updatedAt`, `size`.
  - Directions: `asc` or `desc`.
  - Deterministic secondary sort (`id` / `type`) is applied to preserve cursor pagination consistency.

---

## 5. Starred Engine
- **Model**: `Star` table with `user_id`, `file_id`, `folder_id`, XOR check constraint (`chk_star_target_xor`), and unique constraints (`uq_star_user_file`, `uq_star_user_folder`).
- **User Isolation**: Star state is user-specific. User A starring a file does not affect User B's view.
- **Idempotency**: Starring an already-starred item or unstarring an unstarred item completes gracefully without error.
- **Lifecycle Integration**: Starring persists through soft deletion (Trash) and restoration.

---

## 6. Trash & Recovery Engine
- **Soft Deletion**:
  - Trashing a file or folder sets `deleted_at = current_timestamp`.
  - Trashing a folder recursively soft-deletes its entire subtree while preserving `parent_id` / `folder_id` references.
- **Restoration (Recovery)**:
  - Validates target parent folder is active (not deleted).
  - Checks for active name conflicts in the destination parent folder. If an active item with the same name exists, restoration fails with `409 CONFLICT` (`RESOURCE_NAME_CONFLICT`).
  - Restoring a folder recursively restores all contained subtree items.
- **Permanent Deletion**:
  - Invokes `StorageService.delete_object(storage_key)` to purge storage binaries.
  - Hard-deletes metadata from PostgreSQL database and cascades star/share records.

---

## 7. REST API Reference

### Search
- `GET /api/v1/search?q=report&type=file&starred=true&sortBy=updatedAt&sortOrder=desc`

### Starred
- `GET /api/v1/starred`
- `POST /api/v1/files/{file_id}/star`
- `DELETE /api/v1/files/{file_id}/star`
- `POST /api/v1/folders/{folder_id}/star`
- `DELETE /api/v1/folders/{folder_id}/star`
- `POST /api/v1/stars`
- `DELETE /api/v1/stars/{star_id}`

### Trash & Recovery
- `GET /api/v1/trash`
- `POST /api/v1/trash/files/{file_id}/restore`
- `POST /api/v1/trash/folders/{folder_id}/restore`
- `DELETE /api/v1/trash/files/{file_id}`
- `DELETE /api/v1/trash/folders/{folder_id}`

---

## 8. Database Indexes
- `idx_files_lower_name`: Functional B-tree index on `lower(name)` for files.
- `idx_folders_lower_name`: Functional B-tree index on `lower(name)` for folders.
- `idx_files_user_active_updated`: Composite index on `(user_id, deleted_at, updated_at)`.
- `idx_folders_user_active_updated`: Composite index on `(user_id, deleted_at, updated_at)`.
- `idx_stars_user_lookup`: B-tree index on `(user_id)` for favorite lookups.
