# SecStorage Database Index Strategy

This document details the indexing strategy designed to optimize filtering, joining, sorting, and constraint enforcement in SecStorage.

## Primary & Unique Indexes

1. **`users` Table:**
   - Primary Key: `id` (UUID)
   - Unique Index: `idx_users_email` (`email`) — Accelerates authentication lookup by email.

2. **`folders` Table:**
   - Primary Key: `id` (UUID)
   - Partial Unique Index: `idx_folders_unique_active_name` (`user_id`, `parent_id`, `name` WHERE `deleted_at IS NULL`) — Enforces unique folder names under same owner and directory for active folders.
   - Composite Index: `idx_folders_user_parent` (`user_id`, `parent_id`, `deleted_at`) — Optimizes root/subfolder navigation listings.

3. **`files` Table:**
   - Primary Key: `id` (UUID)
   - Unique Index: `idx_files_storage_key` (`storage_key`) — Guarantees unique object storage key mapping.
   - Composite Index: `idx_files_user_folder_active` (`user_id`, `folder_id`, `deleted_at`) — Optimizes active file listing per folder.
   - Index: `idx_files_mime_type` (`mime_type`) — Accelerates media type filtering.

4. **`file_versions` Table:**
   - Primary Key: `id` (UUID)
   - Composite Unique Constraint: `uq_file_version_number` (`file_id`, `version_number`) — Enforces sequential version uniqueness per file.
   - Index: `idx_file_versions_lookup` (`file_id`, `version_number`) — Accelerates specific version retrieval.

5. **`shares` Table:**
   - Composite Index: `idx_shares_grantee_lookup` (`grantee_id`, `permission`) — Accelerates fetching resources shared with a user.
   - Unique Constraints: `uq_share_grantee_folder` (`grantee_id`, `folder_id`) & `uq_share_grantee_file` (`grantee_id`, `file_id`).

6. **`link_shares` Table:**
   - Unique Index: `token` (`token`) — Fast lookup for public link tokens.
   - Composite Index: `idx_link_shares_token_lookup` (`token`, `is_active`, `expires_at`) — Optimizes token validation & expiration checks.

7. **`stars` Table:**
   - Index: `idx_stars_user_lookup` (`user_id`) — Accelerates rendering starred items sidebar.
   - Unique Constraints: `uq_star_user_folder` (`user_id`, `folder_id`) & `uq_star_user_file` (`user_id`, `file_id`).

8. **`activities` Table:**
   - Composite Index: `idx_activities_user_timeline` (`user_id`, `created_at`) — Optimizes user audit trail queries sorted by timestamp.
