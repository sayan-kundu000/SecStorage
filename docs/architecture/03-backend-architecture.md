# SecStorage — Backend Architecture Specification

**Document Version:** 1.0.0  
**Target Sequence Prompt:** Prompt 03 Deliverable  
**Author:** SecStorage Technical Architecture Controller  

---

## 1. Directory Blueprint & Organization

The backend is built with Python 3.12+ and FastAPI, structured as a clean modular monolith:

```text
backend/
├── app/
│   ├── main.py                  # FastAPI application factory & router registration
│   │
│   ├── core/                    # Infrastructure & cross-cutting concerns
│   │   ├── config.py            # Environment settings (pydantic-settings)
│   │   ├── database.py          # SQLAlchemy async engine & sessionmaker
│   │   ├── security.py          # Argon2id hashing & PyJWT token utilities
│   │   ├── dependencies.py      # Auth & DB FastAPI dependency injection
│   │   ├── exceptions.py        # Central custom exception definitions
│   │   └── logging.py           # Structured logging configuration
│   │
│   ├── models/                  # SQLAlchemy 2.x ORM models
│   │   ├── base.py              # DeclarativeBase & timestamp mixin
│   │   ├── user.py              # User model
│   │   ├── folder.py            # Folder hierarchy model
│   │   ├── file.py              # File metadata model
│   │   ├── share.py             # User-to-user share permissions model
│   │   ├── link_share.py        # Public share link model
│   │   └── star.py              # Starred resources model
│   │
│   ├── schemas/                 # Pydantic v2 validation & response schemas
│   │   ├── common.py            # Generic APIResponse & ErrorPayload schemas
│   │   ├── auth.py              # Register, Login, Token, UserResponse schemas
│   │   ├── folder.py            # FolderCreate, FolderUpdate, FolderResponse
│   │   ├── file.py              # UploadInit, UploadComplete, FileResponse
│   │   ├── share.py             # ShareCreate, ShareResponse schemas
│   │   ├── public_link.py       # PublicLinkCreate, PublicLinkResponse
│   │   └── search.py            # SearchQuery, SearchResponse schemas
│   │
│   ├── routes/                  # Thin FastAPI endpoint routers
│   │   ├── auth.py              # POST /auth/register, /login, /refresh, /logout
│   │   ├── users.py             # GET /users/me
│   │   ├── folders.py           # CRUD /folders endpoints
│   │   ├── files.py             # Upload init/complete, download, file CRUD
│   │   ├── shares.py            # Share creation & revocation endpoints
│   │   ├── public_links.py      # Public shareable link generation & access
│   │   ├── search.py            # GET /search file/folder search
│   │   ├── stars.py             # Star & unstar operations
│   │   └── trash.py             # Soft-delete list, restore, & purge
│   │
│   ├── services/                # Business logic & domain orchestration
│   │   ├── auth_service.py      # User authentication & token management
│   │   ├── folder_service.py    # Folder hierarchy & circular move guard
│   │   ├── file_service.py      # File metadata lifecycle management
│   │   ├── share_service.py     # Resource sharing logic & permission check
│   │   ├── public_link_service.py # Public token generation & expiry guard
│   │   ├── search_service.py    # Database query search engine
│   │   ├── storage_service.py   # Presigned URL S3/Supabase integration
│   │   ├── trash_service.py     # Soft-delete restoration & purge logic
│   │   └── permission_service.py# Central server-side RBAC engine
│   │
│   └── utils/                   # Shared helper utilities
│       ├── mime.py              # MIME type normalization & extension lookup
│       └── validators.py        # Custom file size & string sanitizers
│
├── alembic/                     # Database migrations
│   ├── env.py
│   └── versions/
├── tests/                       # Pytest test suite
│   ├── conftest.py
│   ├── api/
│   └── unit/
├── pyproject.toml               # Poetry/uv dependency config
├── Dockerfile                   # Deployment container blueprint
└── render.yaml                  # Render deployment configuration
```

---

## 2. Layer Separation & Responsibilities

### 2.1 Route Handlers (`app/routes/`)
Routes are strictly thin wrappers:
1. Parse path/query parameters and request body via Pydantic schemas.
2. Inject dependencies (`db: AsyncSession`, `current_user: User`).
3. Call appropriate Service method.
4. Return typed response wrapped in standard JSON response schema.

### 2.2 Domain Services (`app/services/`)
Services contain 100% of business rules, domain validations, transaction boundaries, and permission checks. Services do not depend on FastAPI `Request` objects.

### 2.3 Object Storage Integration (`app/services/storage_service.py`)
Encapsulates all Supabase S3 API interactions:
- `generate_presigned_upload_url(object_key: str, mime_type: str, expires_in: int = 900)`
- `generate_presigned_download_url(object_key: str, filename: str, expires_in: int = 300)`
- `delete_object(object_key: str)`
- `check_object_exists(object_key: str)`

---

## 3. Custom Exception Handling Architecture

The backend implements a centralized exception handler converting custom domain errors to standardized JSON API error responses.

```python
# app/core/exceptions.py
class SecStorageException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code

class AuthenticationError(SecStorageException):
    def __init__(self, message: str = "Invalid credentials"):
        super().__init__("AUTH_ERROR", message, status_code=401)

class AuthorizationError(SecStorageException):
    def __init__(self, message: str = "Permission denied"):
        super().__init__("PERMISSION_DENIED", message, status_code=403)

class ResourceNotFoundError(SecStorageException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__("NOT_FOUND", message, status_code=404)
```

FastAPI registers a global exception handler mapping all `SecStorageException` subclasses to:
`{"success": false, "error": {"code": "PERMISSION_DENIED", "message": "Permission denied"}}` with the matching HTTP status code.
