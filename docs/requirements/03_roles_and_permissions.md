# SecStorage — Role & Permission Matrix (RBAC Specification)

SecStorage implements strict **Server-Side Role-Based Access Control (RBAC)**. Permission checks are evaluated dynamically on the backend for every API request involving resources. Frontend UI state reflects permissions but is NEVER trusted as an authorization boundary.

---

## 1. Role Definitions

### 1.1 OWNER
- The user who created or uploaded the resource.
- Has absolute control over the resource lifecycle, sharing, public links, and metadata.

### 1.2 EDITOR
- A registered user who has been granted explicit read/write access to a file or folder by the Owner.
- Can view, download, rename, edit contents, and upload files into shared folders.
- Cannot delete resources permanently, change ownership, or revoke Owner control.

### 1.3 VIEWER
- A registered user who has been granted read-only access to a file or folder by the Owner.
- Can view metadata and download the file.
- Cannot modify, rename, delete, move, upload, or re-share the resource.

### 1.4 PUBLIC USER
- An unauthenticated or authenticated external user accessing a resource strictly through a valid Public Link token.
- Access is restricted exclusively to the linked resource and governed by optional password authentication and link expiration timestamps.
- Cannot browse parent folders, discover unrelated resources, or perform write/delete operations.

---

## 2. Authorization Matrix

| Action / Capability | OWNER | EDITOR | VIEWER | PUBLIC USER |
| :--- | :---: | :---: | :---: | :---: |
| **Read Metadata** | ✅ YES | ✅ YES | ✅ YES | 🔗 LINK ONLY |
| **Download File** | ✅ YES | ✅ YES | ✅ YES | 🔗 LINK ONLY |
| **Upload to Folder** | ✅ YES | ✅ YES | ❌ NO | ❌ NO |
| **Rename Resource** | ✅ YES | ✅ YES | ❌ NO | ❌ NO |
| **Move Resource** | ✅ YES | ✅ YES | ❌ NO | ❌ NO |
| **Soft Delete** | ✅ YES | ⚠️ POLICY | ❌ NO | ❌ NO |
| **Restore from Trash** | ✅ YES | ❌ NO | ❌ NO | ❌ NO |
| **Permanent Delete** | ✅ YES | ❌ NO | ❌ NO | ❌ NO |
| **Share with Users** | ✅ YES | ⚠️ POLICY | ❌ NO | ❌ NO |
| **Generate Public Link** | ✅ YES | ❌ NO | ❌ NO | ❌ NO |
| **Revoke Public Link** | ✅ YES | ❌ NO | ❌ NO | ❌ NO |
| **Revoke Share Access**| ✅ YES | ❌ NO | ❌ NO | ❌ NO |
| **Transfer Ownership** | ✅ YES | ❌ NO | ❌ NO | ❌ NO |

*Note on Policy*: `EDITOR` soft-delete and share delegation may be enabled via system configuration policy, but default to Owner-only control in initial MVP.

---

## 3. Server-Side Enforcement Flow

Every incoming REST request targeted at a file or folder resource undergoes authorization evaluation:

```text
Incoming HTTP Request (e.g. GET /files/{id})
                    │
                    ▼
          [Authenticated User Context]
                    │
                    ├──────────► Is User == Resource.owner_id?
                    │                 ├── YES ──► GRANT ACCESS (Role: OWNER)
                    │                 └── NO
                    │                      │
                    ├──────────► Does record exist in `shares` table for user_id & resource_id?
                    │                 ├── YES (Role == EDITOR/VIEWER) ──► Check Permission Matrix ──► GRANT / DENY
                    │                 └── NO
                    │                      │
                    └──────────► Is request using a valid, non-expired Public Link token?
                                      ├── YES (Passed Password Check) ──► GRANT READ/DOWNLOAD ONLY
                                      └── NO ──► REJECT HTTP 403 FORBIDDEN
```

---

## 4. Hierarchy Permission Inheritance Rules

1. **Folder Sharing Cascades**: When a user is granted `VIEWER` or `EDITOR` access to a parent folder, permission automatically applies to all child files and subfolders within that folder hierarchy.
2. **Explicit Override**: Explicit direct share records on a child resource override inherited parent folder permissions if the explicit share grants a higher privilege level (e.g. Viewer on folder, Editor on explicit child file).
3. **Soft-Delete Isolation**: Trashing a shared resource by the Owner revokes access for all shared Viewers and Editors until restored.
