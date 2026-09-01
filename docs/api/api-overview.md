# SecStorage REST API Overview

This document specifies the REST API contract for **SecStorage**, connecting the React/TypeScript frontend (Vercel) to the FastAPI backend (Render).

## Base Namespace & Versioning

All feature API endpoints are versioned under the `/api/v1` URL prefix:

```text
https://<backend-domain>/api/v1/
```

## Available API Domain Modules

| Domain | Tag | Base Path | Description |
| :--- | :--- | :--- | :--- |
| **Health** | `Health` | `/api/v1/health` & `/api/v1/ready` | Liveness and database readiness probes |
| **Users** | `Users` | `/api/v1/users` | User profile retrieval and updates |
| **Folders** | `Folders` | `/api/v1/folders` | Directory folder creation, navigation, and deletion |
| **Files** | `Files` | `/api/v1/files` | File metadata CRUD and revision version control |
| **Sharing** | `Sharing` | `/api/v1/shares` | Granular user-to-user folder/file permissions |
| **Public Links** | `Public Links` | `/api/v1/public-links` | Expirable, password-protected link token shares |
| **Stars** | `Stars` | `/api/v1/stars` | User resource favorite markers |
| **Trash** | `Trash` | `/api/v1/trash` | Soft-deleted item listing, restore, and purging |
| **Activities** | `Activities` | `/api/v1/activities` | Audit trail action history |
