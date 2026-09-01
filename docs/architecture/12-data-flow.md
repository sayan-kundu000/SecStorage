# SecStorage — System Data Flow & Sequence Diagrams

**Document Version:** 1.0.0  
**Target Sequence Prompt:** Prompt 03 Deliverable  
**Author:** SecStorage Technical Architecture Controller  

---

## 1. Authentication & Session Rotation Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant SPA as React Client (Vite)
    participant API as FastAPI Backend
    participant DB as PostgreSQL Database

    User->>SPA: Enter Credentials (email, password)
    SPA->>API: POST /api/v1/auth/login
    API->>DB: Fetch User Record by Email
    DB-->>API: Return User & Argon2id Hash
    API->>API: Verify Password with Argon2id
    API->>API: Generate Access Token (15m) & Refresh Token (7d)
    API-->>SPA: Return Access Token (JSON) + Set HttpOnly Cookie (Refresh)
    User->>SPA: Navigate to /drive
    SPA->>API: GET /api/v1/folders/root (Header: Authorization Bearer)
    API->>API: Verify Access Token Signature
    API->>DB: Query Root Folders & Files
    DB-->>API: Return Metadata
    API-->>SPA: 200 OK (Data Payload)
```

---

## 2. Direct-to-Storage Presigned File Upload Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant SPA as React Client (Vite)
    participant API as FastAPI Backend
    participant S3 as Supabase Object Storage
    participant DB as PostgreSQL Database

    User->>SPA: Select & Drop File (e.g. spec.pdf, 10MB)
    SPA->>API: POST /api/v1/files/init-upload (name, size, mime, folder_id)
    API->>API: Validate Auth, Permissions, MIME Whitelist & Size
    API->>S3: Generate Presigned PUT Upload URL (15m expiry)
    S3-->>API: Presigned URL
    API-->>SPA: Return upload_url & storage_key
    
    SPA->>S3: HTTP PUT Binary Payload directly to upload_url
    S3-->>SPA: 200 OK (Upload Complete in S3)
    
    SPA->>API: POST /api/v1/files/complete-upload (storage_key, file_id)
    API->>S3: HeadObject(storage_key) to verify binary existence
    S3-->>API: 200 OK (Metadata confirmed)
    API->>DB: INSERT into files (id, user_id, folder_id, name, storage_key, size)
    DB-->>API: Record Persisted
    API-->>SPA: 201 Created (File Metadata Object)
```

---

## 3. Presigned File Download Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant SPA as React Client (Vite)
    participant API as FastAPI Backend
    participant S3 as Supabase Object Storage
    participant DB as PostgreSQL Database

    User->>SPA: Click "Download File"
    SPA->>API: GET /api/v1/files/{id}/download
    API->>API: Verify Access Token
    API->>DB: Fetch File Record & Share Grants
    DB-->>API: File Metadata & Permissions
    API->>API: Evaluate PermissionService (Verify Owner/Editor/Viewer)
    API->>S3: Generate Presigned GET Download URL (5m expiry, filename header)
    S3-->>API: Presigned Download URL
    API-->>SPA: 200 OK (download_url)
    SPA->>S3: GET Binary direct from download_url
    S3-->>User: File Binary Streamed to Browser Download Manager
```

---

## 4. Public Shareable Link Access & Download Flow

```mermaid
sequenceDiagram
    autonumber
    actor ExternalUser as Public User
    participant Browser as Incognito Browser
    participant API as FastAPI Backend
    participant S3 as Supabase Object Storage
    participant DB as PostgreSQL Database

    ExternalUser->>Browser: Click Public Link (/s/x9k2m7q8)
    Browser->>API: GET /api/v1/public-links/x9k2m7q8
    API->>DB: Query link_shares where token = 'x9k2m7q8'
    DB-->>API: Return Link Record (expires_at, hashed_password)
    API->>API: Check expiration date
    
    alt Link Password Protected
        API-->>Browser: 401 Password Required
        ExternalUser->>Browser: Enter Password ("secret123")
        Browser->>API: POST /api/v1/public-links/x9k2m7q8/unlock (password)
        API->>API: Verify Argon2id Password
        API-->>Browser: 200 OK (Temporary Access Token)
    end
    
    Browser->>API: GET /api/v1/public-links/x9k2m7q8/download
    API->>S3: Generate Presigned GET Download URL
    S3-->>API: Presigned URL
    API-->>Browser: 200 OK (download_url)
    Browser->>S3: GET Binary from S3 URL
    S3-->>ExternalUser: File Binary Downloaded
```

---

## 5. File & Folder Lifecycle Flow

```text
    [New Upload Request]
            │
            ▼
   [Upload Initialized] ──(S3 Binary Upload)──► [Complete Upload]
                                                        │
                                                        ▼
                                                  [ACTIVE STATE]
                                                        │
                   ┌────────────────────────────────────┼────────────────────────────────────┐
                   │                                    │                                    │
                   ▼                                    ▼                                    ▼
           [Renamed / Moved]                    [Starred / Unstarred]                   [Shared w/ User]
                   │                                    │                                    │
                   └────────────────────────────────────┼────────────────────────────────────┘
                                                        │
                                                        ▼
                                             [Soft Delete to Trash]
                                              (deleted_at = now())
                                                        │
                                      ┌─────────────────┴─────────────────┐
                                      │                                   │
                                      ▼                                   ▼
                              [Restore to Drive]                 [Permanent Purge]
                            (deleted_at = NULL)             (Delete DB Record & S3 Key)
                                      │                                   │
                                      ▼                                   ▼
                               [ACTIVE STATE]                      [DESTROYED]
```
