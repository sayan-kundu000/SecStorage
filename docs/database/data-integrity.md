# SecStorage Data Integrity Policy

This document defines database-level integrity rules enforced across the SecStorage schema.

## Database Invariants

1. **Email Uniqueness & Case Sensitivity:**
   - Enforced by `UNIQUE` constraint on `users.email`.
   - Application lowercases emails at boundary (`user@example.com`).

2. **File & Version Byte Integrity:**
   - `CheckConstraint("size_bytes >= 0")` on `files` and `file_versions`.
   - Prevents negative byte counts.

3. **Version Number Continuity:**
   - `CheckConstraint("version_number >= 1")` on `file_versions`.
   - `UniqueConstraint("file_id", "version_number")` guarantees unique version ordering per file.

4. **Resource XOR Check Constraints:**
   - On `shares`, `link_shares`, and `stars`:
     `CheckConstraint("(folder_id IS NOT NULL AND file_id IS NULL) OR (folder_id IS NULL AND file_id IS NOT NULL)")`
   - Guarantees each record targets **either** a folder **or** a file, never both or neither.

5. **Permission Validation:**
   - `CheckConstraint("permission IN ('EDITOR', 'VIEWER')")` on `shares`.

6. **Soft Delete Preservation:**
   - Soft deletion uses `deleted_at TIMESTAMPTZ` (`NULL` = active, timestamp = trashed).
   - Preserves resource state for restore and trash purge operations.
