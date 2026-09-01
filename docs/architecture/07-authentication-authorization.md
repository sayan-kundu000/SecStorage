# SecStorage — Authentication & Authorization Architecture

**Document Version:** 1.0.0  
**Target Sequence Prompt:** Prompt 03 Deliverable  
**Author:** SecStorage Technical Architecture Controller  

---

## 1. Authentication Security Stack

SecStorage strictly separates **Authentication** ("Who are you?") from **Authorization** ("What are you permitted to do?").

```text
+-----------------------------------------------------------------------------------+
|                            AUTHENTICATION STACK                                   |
+-----------------------------------------------------------------------------------+
| Passwords:  Argon2id Algorithm (passlib / argon2-cffi)                             |
| Tokens:     Short-Lived JWT Access Token (15 Min, Memory / Header)              |
| Sessions:   Long-Lived JWT Refresh Token (7 Days, HttpOnly Secure Cookie)        |
+-----------------------------------------------------------------------------------+
```

---

## 2. Password Hashing: Argon2id Standard

Plaintext passwords, MD5, SHA1, and plain bcrypt are prohibited. Passwords are hashed using **Argon2id** (`argon2-cffi`) with secure production defaults:
- **Memory Cost (`m`):** 65536 KiB (64 MB)
- **Time Cost (`t`):** 3 iterations
- **Parallelism (`p`):** 4 threads

---

## 3. JWT Token Architecture & Cookie Strategy

### Access Token
- **Lifetime:** 15 minutes.
- **Transport:** Returned in JSON response body upon login/refresh. Transmitted in client API calls via `Authorization: Bearer <access_token>` header.
- **Payload:** `{"sub": "<user_id>", "type": "access", "exp": <timestamp>, "iat": <timestamp>}`.

### Refresh Token
- **Lifetime:** 7 days.
- **Transport:** Set by FastAPI server strictly in an `HttpOnly`, `Secure` (production), `SameSite=Lax` cookie named `secstorage_refresh`.
- **Payload:** `{"sub": "<user_id>", "type": "refresh", "jti": "<unique_uuid>", "exp": <timestamp>}`.
- **Rotation:** Issuing a new access token via `/auth/refresh` automatically rotates the refresh token cookie and invalidates the prior session.

---

## 4. Server-Side Role-Based Access Control (RBAC)

Authorization is centrally governed by the backend `PermissionService`. UI restrictions on the frontend are purely user-experience hints.

### 4.1 Resource Role Model
1. **OWNER:** The user who created the resource (`user_id == resource.user_id`). Full administrative control, deletion, restoration, direct sharing, public link generation, and purging.
2. **EDITOR:** Explicitly granted read/write share (`shares.permission == 'EDITOR'`). Can read, download, upload into shared folder, rename, and move within shared context. Cannot take ownership or delete parent resource.
3. **VIEWER:** Explicitly granted read-only share (`shares.permission == 'VIEWER'`). Can read metadata and download files. Cannot edit, rename, move, upload, or delete.
4. **PUBLIC USER:** Unauthenticated external user accessing resource via valid `/s/{token}` public link. Access is strictly bounded by public token parameters (expiration, password protection).

### 4.2 Permission Evaluation Matrix

```python
# app/services/permission_service.py
class PermissionService:
    async def check_file_access(
        self, db: AsyncSession, user_id: UUID, file_id: UUID, required_role: str
    ) -> bool:
        # 1. Fetch file
        file = await file_repo.get(db, file_id)
        if not file or file.deleted_at is not None:
            raise ResourceNotFoundError("File not found")

        # 2. Owner bypass
        if file.user_id == user_id:
            return True

        # 3. Direct file share check
        share = await share_repo.get_file_share(db, grantee_id=user_id, file_id=file_id)
        if share:
            if required_role == "VIEWER" and share.permission in ("VIEWER", "EDITOR"):
                return True
            if required_role == "EDITOR" and share.permission == "EDITOR":
                return True

        # 4. Parent folder share inheritance check
        if file.folder_id:
            return await self.check_folder_access(db, user_id, file.folder_id, required_role)

        raise AuthorizationError("Access denied to requested file")
```

---

## 5. Dependency Injection Integration

FastAPI route handlers enforce permissions reusable dependencies:

```python
# Route endpoint usage example:
@router.get("/files/{file_id}")
async def get_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    permission_service: PermissionService = Depends(),
):
    await permission_service.check_file_access(db, current_user.id, file_id, required_role="VIEWER")
    return await file_service.get_file_details(db, file_id)
```
