# SecStorage — Database Architecture & Entity Specification

**Document Version:** 1.0.0  
**Target Sequence Prompt:** Prompt 03 Deliverable  
**Author:** SecStorage Technical Architecture Controller  

---

## 1. Relational Database Overview

SecStorage uses **PostgreSQL 15+** managed asynchronously via **SQLAlchemy 2.x Async ORM** (`asyncpg` driver) and schema migrations controlled by **Alembic**.

All relational tables enforce primary keys, foreign keys, explicit timestamps (`created_at`, `updated_at`), indexes for search/filter operations, and cascade restrictions.

---

## 2. Entity-Relationship Diagram (ERD)

```text
+-----------------------+        +-----------------------+        +-----------------------+
|        users          |        |        folders        |        |         files         |
+-----------------------+        +-----------------------+        +-----------------------+
| PK id (UUID)          |        | PK id (UUID)          |        | PK id (UUID)          |
|    email (VARCHAR 255)|<-------| FK user_id (UUID)     |<-------| FK user_id (UUID)     |
|    hashed_password    |        | FK parent_id (UUID)   |        | FK folder_id (UUID)   |
|    full_name (VARCHAR)|        |    name (VARCHAR 255) |        |    name (VARCHAR 255) |
|    created_at (TIMESTAMP)|      |    deleted_at (TIMESTP)|      |    mime_type (VARCHAR)|
|    updated_at (TIMESTAMP)|      |    created_at (TIMESTP)|      |    size_bytes (BIGINT)|
+-----------------------+        +-----------------------+        |    storage_key(VARCHAR)|
           ^                                 ^                    |    deleted_at (TIMESTP)|
           |                                 |                    +-----------------------+
           |                                 |                                ^
           +---------------------------------+--------------------------------+
                                             |
                  +--------------------------+--------------------------+
                  |                                                     |
+-----------------------------------+     +-----------------------------------+
|              shares               |     |            link_shares            |
+-----------------------------------+     +-----------------------------------+
| PK id (UUID)                      |     | PK id (UUID)                      |
| FK grantor_id (UUID -> users.id)  |     | FK created_by (UUID -> users.id)  |
| FK grantee_id (UUID -> users.id)  |     | FK folder_id (UUID -> folders.id) |
| FK folder_id (UUID -> folders.id) |     | FK file_id (UUID -> files.id)     |
| FK file_id (UUID -> files.id)     |     |    token (VARCHAR 64 UNIQUE)      |
|    permission (VARCHAR 20)        |     |    hashed_password (VARCHAR null) |
|    created_at (TIMESTAMP)         |     |    expires_at (TIMESTAMP null)    |
+-----------------------------------+     +-----------------------------------+
```

---

## 3. Database Schema Definitions

### 3.1 Table: `users`
Stores user accounts and authentication credentials.
- `id`: UUID (Primary Key, `gen_random_uuid()`)
- `email`: VARCHAR(255) (UNIQUE, NOT NULL, INDEXED)
- `hashed_password`: VARCHAR(255) (NOT NULL, Argon2id payload)
- `full_name`: VARCHAR(255) (NOT NULL)
- `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT `now()`)
- `updated_at`: TIMESTAMPTZ (NOT NULL, DEFAULT `now()`)

### 3.2 Table: `folders`
Stores hierarchical folder trees.
- `id`: UUID (Primary Key)
- `user_id`: UUID (FK `users.id` ON DELETE CASCADE, NOT NULL)
- `parent_id`: UUID (FK `folders.id` ON DELETE RESTRICT, NULLABLE) — `NULL` indicates root directory.
- `name`: VARCHAR(255) (NOT NULL)
- `deleted_at`: TIMESTAMPTZ (NULLABLE, INDEXED) — `NULL` means active, timestamp means soft-deleted.
- `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT `now()`)
- `updated_at`: TIMESTAMPTZ (NOT NULL, DEFAULT `now()`)
- **Indexes:** `idx_folders_user_parent` (`user_id`, `parent_id`, `deleted_at`), `idx_folders_name` (`name`).

### 3.3 Table: `files`
Stores file metadata records. Physical file binaries reside in Supabase Storage.
- `id`: UUID (Primary Key)
- `user_id`: UUID (FK `users.id` ON DELETE CASCADE, NOT NULL)
- `folder_id`: UUID (FK `folders.id` ON DELETE RESTRICT, NULLABLE) — `NULL` indicates root file.
- `name`: VARCHAR(255) (NOT NULL)
- `mime_type`: VARCHAR(127) (NOT NULL)
- `size_bytes`: BIGINT (NOT NULL)
- `storage_key`: VARCHAR(512) (UNIQUE, NOT NULL) — Deterministic object storage path.
- `deleted_at`: TIMESTAMPTZ (NULLABLE, INDEXED)
- `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT `now()`)
- `updated_at`: TIMESTAMPTZ (NOT NULL, DEFAULT `now()`)
- **Indexes:** `idx_files_user_folder` (`user_id`, `folder_id`, `deleted_at`), `idx_files_mime` (`mime_type`), `idx_files_storage` (`storage_key`).

### 3.4 Table: `shares`
Stores explicit user-to-user folder and file permissions.
- `id`: UUID (Primary Key)
- `grantor_id`: UUID (FK `users.id` ON DELETE CASCADE, NOT NULL)
- `grantee_id`: UUID (FK `users.id` ON DELETE CASCADE, NOT NULL)
- `folder_id`: UUID (FK `folders.id` ON DELETE CASCADE, NULLABLE)
- `file_id`: UUID (FK `files.id` ON DELETE CASCADE, NULLABLE)
- `permission`: VARCHAR(20) (NOT NULL, Check constraint: `'EDITOR'` or `'VIEWER'`)
- `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT `now()`)
- **Constraints:** Check constraint ensuring `folder_id` IS NOT NULL OR `file_id` IS NOT NULL. Unique constraint on `(grantee_id, folder_id)` and `(grantee_id, file_id)`.

### 3.5 Table: `link_shares`
Stores public expirable / password-protected shareable links.
- `id`: UUID (Primary Key)
- `created_by`: UUID (FK `users.id` ON DELETE CASCADE, NOT NULL)
- `folder_id`: UUID (FK `folders.id` ON DELETE CASCADE, NULLABLE)
- `file_id`: UUID (FK `files.id` ON DELETE CASCADE, NULLABLE)
- `token`: VARCHAR(64) (UNIQUE, NOT NULL, INDEXED) — High-entropy random token string.
- `hashed_password`: VARCHAR(255) (NULLABLE) — Argon2id password hash if password-protected.
- `expires_at`: TIMESTAMPTZ (NULLABLE, INDEXED)
- `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT `now()`)

### 3.6 Table: `stars`
Stores user-starred resources.
- `id`: UUID (Primary Key)
- `user_id`: UUID (FK `users.id` ON DELETE CASCADE, NOT NULL)
- `folder_id`: UUID (FK `folders.id` ON DELETE CASCADE, NULLABLE)
- `file_id`: UUID (FK `files.id` ON DELETE CASCADE, NULLABLE)
- `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT `now()`)
- **Constraints:** Unique constraint on `(user_id, folder_id)` and `(user_id, file_id)`.

---

## 4. Migration Strategy (Alembic)

1. **Auto-Generation Safety:** All Alembic migrations are auto-generated from SQLAlchemy metadata models and verified via test suites.
2. **Backward Compatibility:** Column additions use defaults or nullable settings to support zero-downtime rolling upgrades.
3. **Execution Command:** Backend initialization executes `alembic upgrade head` before Uvicorn server startup.
