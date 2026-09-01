# SecStorage — Secure Cloud Media & File Storage SaaS

SecStorage is a production-grade, full-stack cloud file-storage and file-sharing web application featuring Google Drive-inspired core capabilities.

---

## System Integration & Production Status

- **Overall Status:** **PRODUCTION-READY**
- **Backend Test Suite:** 86 / 86 Pytest integration tests passing (100%)
- **Frontend Test Suite:** 87 / 87 Vitest unit & integration tests passing across 19 suites (100%)
- **Type Safety & Quality:** 0 TypeScript errors, 0 ESLint errors
- **Production Build:** Verified Vite bundle compilation (351.29 kB JS, 37.32 kB CSS)

---

## Core Capabilities

- **Authentication & Identity:** User registration, login, logout, current-user profile restoration, password visibility UX, and state-machine auth context (`INITIALIZING`, `AUTHENTICATED`, `UNAUTHENTICATED`, `AUTHENTICATION_ERROR`, `SESSION_EXPIRED`).
- **Protected Routing & Security UX:** Auth-gated route wrappers (`ProtectedRoute`, `PublicRoute`), role-aware routing (`adminOnly` check), open-redirect defense (`getSafeReturnUrl`), automatic TanStack Query cache purging on logout (`queryClient.clear()`), and single-flight 401 refresh token interceptors.
- **Drive Dashboard & Storage Summary:** Personal welcome banner, interactive storage quota progress bar, used byte breakdown, recent files grid, starred favorites list, and recent activity feed.
- **Drive Explorer & File Navigation:** Canonical `/drive` and `/drive/:folderId` folder navigation, clickable multi-level breadcrumbs hierarchy, Grid/List view switcher with `localStorage` state persistence, sort controls (Name, Date, Size, Type) with asc/desc order toggle, and MIME-type filter selector (PDFs, Images, Video, Audio).
- **Item Selection & Context Actions:** Single & multi-item selection with keyboard shortcuts (`Ctrl+A`, `Del`, `Esc`), floating bulk selection toolbar, right-click & overflow context menus (`FileContextMenu`) for Open, Preview, Presigned Download, Star/Unstar, Rename, Move, Share, and Move to Trash.
- **Interactive Modals & Access Control:** Folder destination picker (`MoveDialog`), collaborator email access sharing (`ShareDialog`), direct S3 upload zone (`FileUploadZone`), multi-format file preview modal (`FilePreviewModal`), and soft-deletion confirm dialog.
- **Direct-to-Storage File Uploads:** 3-phase presigned URL uploads directly to Supabase S3 Object Storage, bypassing backend application servers.
- **Role-Based Access Control (RBAC):** Server-side enforced authorization matrix (`PermissionService`) supporting Owner, Editor, and Viewer permissions with IDOR protection.
- **Sharing & Public Links:** Direct user-to-user resource sharing and cryptographically secure, expirable, password-protected public download links (`PublicLinkManager`).
- **Discovery & Lifecycle:** Full-text file/folder search, multi-attribute filtering, starring items, soft-delete Trash storage, and bulk restoration.

---

## Technology Stack

### Backend
- **Language & Runtime:** Python 3.12+
- **Framework:** FastAPI (ASGI Uvicorn server)
- **Database & ORM:** PostgreSQL 15+ + SQLAlchemy 2.x Async (`asyncpg`) + Alembic migrations
- **Validation:** Pydantic v2 & `pydantic-settings`
- **Cryptography & Security:** Argon2id (`passlib` / `argon2-cffi`), PyJWT, `HttpOnly` SameSite cookies
- **Object Storage:** Supabase Storage (S3-Compatible API) via presigned URLs

### Frontend
- **Framework & Build Tool:** React 18+ (TypeScript) + Vite
- **Styling & UI Components:** Tailwind CSS + shadcn/ui primitives + Lucide React icons
- **State & Data Fetching:** TanStack Query (React Query) + Axios (with refresh interceptor)
- **Forms & Validation:** React Hook Form + Zod schemas
- **Routing & Toast:** React Router v6 + Sonner

### Deployment & CI
- **Backend Host:** Render Web Service (`render.yaml` blueprint)
- **Frontend Host:** Vercel Edge CDN (`vercel.json`)
- **CI Workflows:** GitHub Actions (`backend-ci.yml`, `frontend-ci.yml`, `e2e.yml`)

---

## Monorepo Layout

```text
secstorage/
├── .github/
│   └── workflows/              # GitHub Actions CI pipelines (Backend, Frontend, E2E)
├── backend/
│   ├── app/
│   │   ├── core/               # App config, database, security, exception handlers, logging
│   │   ├── models/             # SQLAlchemy 2.x async ORM models
│   │   ├── schemas/            # Pydantic v2 validation & response models
│   │   ├── routes/             # Thin FastAPI REST endpoints (/api/v1)
│   │   └── services/           # Domain business logic & PermissionService
│   ├── alembic/                # Database schema migration scripts (001-006)
│   ├── tests/                  # Pytest async HTTPX integration tests
│   └── pyproject.toml          # Python project metadata & dependencies
├── frontend/
│   ├── src/
│   │   ├── app/                # React entry, router, and query providers
│   │   ├── components/         # UI primitives, layout, and feature components
│   │   ├── features/           # Drive, Search, Shared, Starred, Trash, and Public modules
│   │   ├── services/           # Centralized Axios client & API services
│   │   └── types/              # Shared TypeScript definitions
│   ├── tests/                  # Vitest unit & integration tests
│   └── package.json            # Node.js dependencies & scripts
├── docs/                       # Architecture, API, DB, Security, & Deployment documentation
├── scripts/                    # Development environment setup scripts
├── render.yaml                 # Render infrastructure-as-code deployment blueprint
├── .env.example                # Environment variables template
├── .gitignore                  # Source control exclusion rules
└── README.md
```

---

## Development Setup

### 1. Prerequisites
- **Python:** 3.11+ (Python 3.12 recommended)
- **Node.js:** 18+ (Node 20 recommended)
- **Database:** Local PostgreSQL or Supabase PostgreSQL instance

### 2. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```

### 3. Backend Setup & Run
```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Run migrations & start server
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000/api/v1`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

### 4. Frontend Setup & Run
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
- Local App URL: `http://localhost:5173`

---

## Testing & Quality Assurance

```bash
# Run Backend Pytest Suite
cd backend
py -m pytest

# Run Frontend Quality Checks & Test Suite
cd frontend
npm run typecheck
npm run lint
npm run test
npm run build
```

---

## Deployment Blueprint

1. **Backend (Render):** Deployed via `render.yaml` blueprint. Executes `alembic upgrade head` and starts Uvicorn on `$PORT`.
2. **Frontend (Vercel):** Deployed from GitHub `main` branch with `VITE_API_BASE_URL` pointing to the Render API instance. Contains `vercel.json` SPA rewrite rules and production security headers.

---

## License

This project is licensed under the [MIT License](LICENSE).
