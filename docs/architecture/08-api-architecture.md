# SecStorage — REST API Architecture & OpenAPI Contract

**Document Version:** 1.0.0  
**Target Sequence Prompt:** Prompt 03 Deliverable  
**Author:** SecStorage Technical Architecture Controller  

---

## 1. REST API Standards & Convention

All SecStorage APIs follow resource-oriented REST conventions grouped under the versioned base path `/api/v1/`.

### Key Standards:
- **Protocol:** HTTPS REST
- **Payload Format:** JSON (`application/json`)
- **Naming Conventions:** Plural nouns for resource endpoints (`/files`, `/folders`, `/shares`, `/stars`). CamelCase JSON fields for frontend compatibility or snake_case with Pydantic aliases.
- **Documentation:** OpenAPI 3.0 specs auto-generated at `/docs` (Swagger UI) and `/openapi.json`.

---

## 2. Standardized JSON Response Wrappers

All API responses must strictly adhere to the universal JSON envelope format:

### 2.1 Success Response Wrapper
```json
{
  "success": true,
  "data": {
    "id": "3c9bbf22-4411-419b-a991-88f6a2b8e3a1",
    "name": "Project Blueprint.pdf",
    "sizeBytes": 1048576,
    "mimeType": "application/pdf"
  },
  "message": "Resource retrieved successfully"
}
```

### 2.2 Error Response Wrapper
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to access this resource."
  }
}
```

---

## 3. Standard HTTP Status Codes

| Status Code | Meaning | Usage Scenario |
| :---: | :--- | :--- |
| **200 OK** | Success | GET, PATCH, or POST requests returning data payloads. |
| **201 Created** | Created | POST requests successfully creating new records (Folder, Share, File complete). |
| **204 No Content** | Deleted | Successful DELETE operations returning empty bodies. |
| **400 Bad Request** | Invalid Input | Validation failure, invalid parameters, circular folder move attempt. |
| **401 Unauthorized** | Unauthenticated | Missing or expired JWT token, invalid credentials. |
| **403 Forbidden** | Unauthorized | User authenticated but lacks required Owner/Editor/Viewer role. |
| **404 Not Found** | Resource Missing | File, folder, share, or token does not exist or is soft-deleted. |
| **409 Conflict** | Duplication | Duplicate user email registration or existing star record. |
| **422 Unprocessable**| Schema Violation | Request body violates Pydantic structural validation rules. |
| **429 Too Many Req**| Rate Limited | Exceeded API rate limit threshold. |
| **500 Server Error** | Unexpected Error | Unhandled server exception (sanitized in production). |

---

## 4. Primary API Endpoint Map (`/api/v1`)

### 4.1 Authentication (`/api/v1/auth`)
- `POST /auth/register`: Register user account.
- `POST /auth/login`: Authenticate & set HttpOnly refresh cookie.
- `POST /auth/refresh`: Issue new access token.
- `POST /auth/logout`: Revoke session cookie.
- `GET /auth/me`: Retrieve active profile.

### 4.2 Folders (`/api/v1/folders`)
- `POST /folders`: Create folder.
- `GET /folders/{id}`: List folder metadata & items (`id=root` for top-level).
- `PATCH /folders/{id}`: Rename or move folder.
- `DELETE /folders/{id}`: Soft-delete folder.

### 4.3 Files (`/api/v1/files`)
- `POST /files/init-upload`: Request presigned upload URL.
- `POST /files/complete-upload`: Confirm storage upload & persist DB record.
- `GET /files/{id}`: Fetch file metadata.
- `GET /files/{id}/download`: Get presigned download URL.
- `PATCH /files/{id}`: Rename or move file.
- `DELETE /files/{id}`: Soft-delete file to Trash.

### 4.4 Sharing & Public Links (`/api/v1/shares`, `/api/v1/public-links`)
- `POST /shares`: Share resource with target email (Editor/Viewer).
- `GET /shares/me`: List resources shared with user.
- `DELETE /shares/{id}`: Revoke share.
- `POST /public-links`: Create expirable / password-protected link token.
- `GET /public-links/{token}`: View public resource (unauthenticated).
- `POST /public-links/{token}/unlock`: Verify password & return token.
- `GET /public-links/{token}/download`: Public presigned download.

### 4.5 Search, Starred & Trash (`/api/v1/search`, `/stars`, `/trash`)
- `GET /search`: Search user files & folders by query & type filter.
- `POST /stars`: Star file or folder.
- `DELETE /stars/{type}/{id}`: Unstar resource.
- `GET /stars`: List starred items.
- `GET /trash`: List soft-deleted items.
- `POST /trash/{type}/{id}/restore`: Restore item.
- `DELETE /trash/{type}/{id}/purge`: Permanently purge DB record & S3 object.
