# SecStorage Authorization Architecture & Security Gatekeeper

This document details the multi-layered authorization system, Role-Based Access Control (RBAC), and Resource-Level Access Control (ACL) in **SecStorage**.

## Security Model Overview

```text
Request (HTTP Header)
   │
   ▼
Authentication (get_current_user) -> Answers "WHO ARE YOU?"
   │
   ▼
Global RBAC (require_permission) -> Answers "WHAT CAN THIS ROLE GENERALLY DO?"
   │
   ▼
Resource Authorization (AuthorizationService.can_access_resource)
   ├── 1. Inactive Account -> DENY (401)
   ├── 2. Resource Ownership (resource.user_id == user.id) -> ALLOW (OWNERSHIP)
   ├── 3. Explicit Share ACL (Share record with VIEWER/EDITOR) -> ALLOW (EXPLICIT_SHARE)
   ├── 4. System Admin Override -> ALLOW (RBAC)
   └── 5. Default Fallback -> DENY (403 Forbidden / 404 Not Found)
```

## Authorization Invariants & IDOR Prevention

1. **Backend Authoritative Control:** Client-side role UI toggles or payload properties (`owner_id`, `role`, `is_admin`) are **never** trusted by the backend server.
2. **Deny-by-Default:** Any unmapped action, missing ACL match, or unexpected evaluation failure fails closed to `DENY` (403 Forbidden).
3. **Insecure Direct Object Reference (IDOR) Mitigation:** Non-owners attempting to access unshared private resources are denied immediately without revealing internal resource state.
4. **Separation of Concerns:** Authentication establishes identity (`get_current_user`), whereas Authorization determines permission (`AuthorizationService`).

## Role Definitions

- **`USER`**: Standard SecStorage user account. Holds global permission to manage own files, folders, shares, and session settings.
- **`ADMIN`**: System Administrator account. Possesses global USER capabilities plus administrative user oversight and audit trail inspection (`audit:read`).
