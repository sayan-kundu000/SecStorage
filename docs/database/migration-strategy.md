# SecStorage Alembic Migration Strategy

This document outlines the migration management rules for SecStorage schema evolution.

## Authoritative Migration Tool

**Alembic** is the sole authoritative mechanism for mutating the PostgreSQL schema. Direct manual DDL execution on production databases is strictly prohibited.

## Migration Principles

1. **Deterministic Upgrades:** Every migration script must define explicit `upgrade()` and `downgrade()` methods.
2. **Review Before Execution:** Never run raw `alembic revision --autogenerate` without inspecting the generated script for index, constraint, and nullability correctness.
3. **Clean Database Test:** All migrations must run cleanly against a fresh PostgreSQL database (`alembic upgrade head`).
4. **Non-Destructive Operations:** Column removals or type changes must be handled in multi-stage migrations to prevent data loss.

## Migration History

- `001_initial_schema`: Initial migration creating `users`, `folders`, `files`, `file_versions`, `shares`, `link_shares`, `stars`, and `activities`.
