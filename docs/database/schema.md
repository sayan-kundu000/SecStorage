# SecStorage Database Schema Specification

This document details the PostgreSQL 16+ relational schema for **SecStorage**, implemented using SQLAlchemy 2.x and Alembic.

## Entity Overview

The database consists of **8 core tables**:

1. **`users`**: User identity, email authentication metadata, and active status.
2. **`folders`**: Nested logical directories supporting parent-child self-referencing hierarchy and soft deletion.
3. **`files`**: File metadata (name, MIME, byte size, SHA-256 checksum) linked to object storage keys.
4. **`file_versions`**: Revision history records for version control of logical files.
5. **`shares`**: Granular user-to-user folder and file permissions (`EDITOR`, `VIEWER`).
6. **`link_shares`**: Expirable, password-protected public access link tokens.
7. **`stars`**: User favorite markers for quick navigation.
8. **`activities`**: User action audit log entries.

## Detailed Table Definitions

### 1. `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Unique user identifier |
| `email` | `VARCHAR(255)` | `UNIQUE, NOT NULL, INDEX` | Lowercase normalized user email |
| `hashed_password` | `VARCHAR(255)` | `NOT NULL` | Argon2id password hash |
| `full_name` | `VARCHAR(255)` | `NOT NULL` | Display name |
| `is_active` | `BOOLEAN` | `NOT NULL, DEFAULT True` | Active state flag |
| `is_verified` | `BOOLEAN` | `NOT NULL, DEFAULT False` | Email verification flag |
| `last_login_at` | `TIMESTAMPTZ` | `NULLABLE` | Timestamp of last successful login |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Modification timestamp |

### 2. `folders`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Folder identifier |
| `user_id` | `UUID` | `FK(users.id CASCADE), NOT NULL` | Folder owner |
| `parent_id` | `UUID` | `FK(folders.id RESTRICT), NULLABLE` | Parent folder (NULL = root) |
| `name` | `VARCHAR(255)` | `NOT NULL` | Directory name |
| `deleted_at` | `TIMESTAMPTZ` | `NULLABLE, INDEX` | Soft-delete timestamp |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL` | Modification timestamp |

### 3. `files`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | File identifier |
| `user_id` | `UUID` | `FK(users.id CASCADE), NOT NULL` | File owner |
| `folder_id` | `UUID` | `FK(folders.id RESTRICT), NULLABLE` | Parent folder (NULL = root) |
| `name` | `VARCHAR(255)` | `NOT NULL` | File display name |
| `mime_type` | `VARCHAR(127)` | `NOT NULL, INDEX` | Content MIME type |
| `size_bytes` | `BIGINT` | `NOT NULL, CHECK >= 0` | File byte size |
| `storage_key` | `VARCHAR(512)` | `UNIQUE, NOT NULL` | Object storage binary path |
| `checksum` | `VARCHAR(64)` | `NULLABLE` | SHA-256 hash |
| `deleted_at` | `TIMESTAMPTZ` | `NULLABLE, INDEX` | Soft-delete timestamp |

### 4. `file_versions`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Version identifier |
| `file_id` | `UUID` | `FK(files.id CASCADE), NOT NULL` | Target logical file |
| `version_number` | `INTEGER` | `NOT NULL, CHECK >= 1` | Sequential version number |
| `storage_key` | `VARCHAR(512)` | `NOT NULL` | Storage path for this version |
| `size_bytes` | `BIGINT` | `NOT NULL, CHECK >= 0` | Version byte size |
| `checksum` | `VARCHAR(64)` | `NULLABLE` | Version SHA-256 hash |
| `created_by` | `UUID` | `FK(users.id SET NULL), NULLABLE` | Uploader user |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | Creation timestamp |

### 5. `shares`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Share identifier |
| `grantor_id` | `UUID` | `FK(users.id CASCADE), NOT NULL` | User sharing the resource |
| `grantee_id` | `UUID` | `FK(users.id CASCADE), NOT NULL` | User receiving permission |
| `folder_id` | `UUID` | `FK(folders.id CASCADE), NULLABLE` | Target folder (XOR file_id) |
| `file_id` | `UUID` | `FK(files.id CASCADE), NULLABLE` | Target file (XOR folder_id) |
| `permission` | `VARCHAR(20)` | `NOT NULL, CHECK IN ('EDITOR', 'VIEWER')` | Access role |

### 6. `link_shares`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Link share identifier |
| `created_by` | `UUID` | `FK(users.id CASCADE), NOT NULL` | Link creator |
| `folder_id` | `UUID` | `FK(folders.id CASCADE), NULLABLE` | Target folder |
| `file_id` | `UUID` | `FK(files.id CASCADE), NULLABLE` | Target file |
| `token` | `VARCHAR(64)` | `UNIQUE, NOT NULL, INDEX` | 256-bit random public token |
| `hashed_password` | `VARCHAR(255)` | `NULLABLE` | Argon2id protection hash |
| `expires_at` | `TIMESTAMPTZ` | `NULLABLE, INDEX` | Expiration timestamp |
| `is_active` | `BOOLEAN` | `NOT NULL, DEFAULT True` | Active toggle |

### 7. `stars`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Star identifier |
| `user_id` | `UUID` | `FK(users.id CASCADE), NOT NULL` | User starring resource |
| `folder_id` | `UUID` | `FK(folders.id CASCADE), NULLABLE` | Starred folder |
| `file_id` | `UUID` | `FK(files.id CASCADE), NULLABLE` | Starred file |

### 8. `activities`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Audit record identifier |
| `user_id` | `UUID` | `FK(users.id CASCADE), NOT NULL` | User initiating action |
| `action` | `VARCHAR(50)` | `NOT NULL` | Audit action code |
| `resource_type` | `VARCHAR(20)` | `NOT NULL` | Resource type (`FILE`, `FOLDER`) |
| `resource_id` | `UUID` | `NOT NULL` | Target resource UUID |
| `metadata_json` | `TEXT` | `NULLABLE` | JSON metadata |
| `ip_address` | `VARCHAR(45)` | `NULLABLE` | IPv4/IPv6 client IP |
