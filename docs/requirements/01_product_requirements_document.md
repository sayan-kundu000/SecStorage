# SecStorage — Product Requirements Document (PRD) & MVP Scope Definition

## 1. Executive Summary & Product Identity

- **Product Name**: SecStorage
- **Product Category**: Secure cloud file-storage and file-sharing web application.
- **Product Vision**: A modern, focused, Google Drive-style cloud storage experience optimized for individuals and small teams. SecStorage provides an intuitive, high-performance interface backed by a rock-solid, production-grade security architecture, strict server-side role-based authorization, presigned object storage, and a reliable file lifecycle management system.
- **Primary Product Goal**: Enable authenticated users to securely upload, organize in nested folder hierarchies, search, star, share (with granular permissions), generate expirable public links, download, soft-delete, and restore files through a responsive web application.
- **Secondary Portfolio Goal**: Serve as a resume-ready full-stack SaaS MVP demonstrating best practices in FastAPI, PostgreSQL data modeling, object storage integrations, Argon2id security, JWT authentication, React/Vercel frontend engineering, and Render deployment.

---

## 2. Target Users & Non-Goals

### 2.1 Target Audience
1. **Individual Users**: Users seeking a clean, secure personal drive to upload, organize, and access files from anywhere.
2. **Small Teams**: Small collaborative groups needing role-based file/folder sharing (Viewers vs. Editors) and password-protected external link sharing without enterprise overhead.

### 2.2 Enterprise Non-Goals (Out of Scope for MVP)
To avoid unnecessary complexity, SecStorage explicitly excludes:
- Multi-tenant enterprise administration dashboards
- SAML 2.0 / Single Sign-On (SSO) integration
- SCIM user provisioning
- Complex enterprise organization/departmental hierarchies
- Enterprise usage billing or tiered subscription management
- Advanced regulatory compliance audit suites (e.g., HIPAA compliance certification engines)

---

## 3. Scope Priority Matrix & Feature Boundary

| Priority Level | Scope Designation | Capabilities Included |
| :--- | :--- | :--- |
| **P0 — Core MVP** | **Mandatory for Release** | Email/Password Registration, JWT Auth + HttpOnly Refresh Cookies, Argon2id Hashing, Folder CRUD & Hierarchy, Direct S3/Supabase Presigned Upload & Download Flow, Soft-Delete & Trash/Restore, Starred Files, Name & Type Search, User-to-User Sharing (Owner, Editor, Viewer), Expirable Password-Protected Public Links, Server-Side RBAC, Responsive React Dashboard. |
| **P1 — Enhancements** | **Intermediate Iteration** | Advanced multi-attribute search filtering (date, size), Drag-and-drop upload dropzone UI, Upload progress tracking, Polished empty & error UI states, Pagination for file/folder listings. |
| **P2 — Phase 2** | **Post-MVP Backlog** | File version history, Inline document/image/PDF previews, Detailed activity audit logging, Tags & custom labels, Storage quota management. |
| **P3 — Future Vision** | **Explicitly Excluded** | Real-time collaborative editing, Desktop sync client, Native mobile applications, Built-in Office document editor, AI file classification, Recommendation engines. |

---

## 4. MVP North Star & End-to-End User Journey

The primary metric of success for the MVP is verifying the complete end-to-end user lifecycle:

```text
  [1. User Registration]
           │
           ▼
     [2. Login] ──► Sets Auth Cookies / Session State
           │
           ▼
   [3. Access My Drive]
           │
           ▼
   [4. Create Folder] ──► e.g. "Projects"
           │
           ▼
    [5. Open Folder] ──► Navigate Nested Hierarchy
           │
           ▼
    [6. Upload File] ──► Presigned S3 Upload Flow
           │
           ▼
  [7. File Operations] ──► Rename, Star, Move, Filter
           │
           ▼
   [8. Share Resource] ──► Grant Viewer/Editor to User OR Generate Public Link
           │
           ▼
  [9. External Access] ──► Download via Presigned URL
           │
           ▼
   [10. Soft Delete] ──► Move to Trash
           │
           ▼
   [11. Trash View] ──► Restore Resource to Original Location
           │
           ▼
   [12. Logout] ──► Validate Protected APIs Reject Unauthenticated Access
```

---

## 5. Scope-Change & Anti-Scope-Creep Governance

1. **No Silent Scope Expansion**: Any feature not categorized under P0 must not be included in the initial MVP build unless authorized by an explicit future prompt.
2. **Architecture Preparation Without Premature Implementation**: Architecture may define DB tables for `file_versions` or `activities`, but code MUST focus on solid P0 stability first.
3. **Simplicity as a Core Quality**: Architectural complexity (such as microservices, message queues, or Kubernetes) is strictly forbidden for the MVP. The modular monolith architecture must be preserved.
