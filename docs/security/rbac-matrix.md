# SecStorage Role-Based Access Control (RBAC) Matrix

This matrix documents the global permission bindings for SecStorage user roles.

## Global Permission Matrix

| Resource Domain | Permission String | Description | USER | ADMIN |
| :--- | :--- | :--- | :---: | :---: |
| **Files** | `files:create` | Upload / create new file entities | ✓ | ✓ |
| | `files:read` | Inspect file metadata & list resources | ✓ | ✓ |
| | `files:update` | Rename or relocate file entities | ✓ | ✓ |
| | `files:delete` | Soft-delete file entities into trash | ✓ | ✓ |
| | `files:download` | Generate download URLs & stream content | ✓ | ✓ |
| **Folders** | `folders:create` | Create new subdirectories | ✓ | ✓ |
| | `folders:read` | Inspect directory contents & breadcrumbs | ✓ | ✓ |
| | `folders:update` | Rename or relocate directories | ✓ | ✓ |
| | `folders:delete` | Soft-delete directory trees | ✓ | ✓ |
| **Shares** | `shares:create` | Grant folder/file access to other users | ✓ | ✓ |
| | `shares:read` | List active resource sharing permissions | ✓ | ✓ |
| | `shares:delete` | Revoke granted sharing permissions | ✓ | ✓ |
| **Users** | `users:read` | Retrieve user profile metadata | ✓ | ✓ |
| | `users:update` | Update display name or account profile | ✓ | ✓ |
| **Sessions** | `sessions:read` | List active authentication sessions | ✓ | ✓ |
| | `sessions:revoke` | Revoke active refresh sessions | ✓ | ✓ |
| **Audit** | `audit:read` | Inspect security activity logs & audit trail | — | ✓ |

## Resource Access Matrix (File / Folder Level)

| Access Role | READ Metadata | DOWNLOAD Content | UPDATE Entity | DELETE Entity | SHARE Permission |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Owner** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Editor Share (`EDITOR`)** | ✓ | ✓ | ✓ | — | ✓ |
| **Viewer Share (`VIEWER`)** | ✓ | ✓ | — | — | — |
| **Unshared Non-Owner** | — | — | — | — | — |
