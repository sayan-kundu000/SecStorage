# SecStorage — Frontend Architecture Specification

**Document Version:** 1.0.0  
**Target Sequence Prompt:** Prompt 03 Deliverable  
**Author:** SecStorage Technical Architecture Controller  

---

## 1. Directory Blueprint & Organization

The frontend is a single-page React 18+ application built with TypeScript, Vite, Tailwind CSS, and shadcn/ui.

```text
frontend/
├── src/
│   ├── app/                     # App entry point, Router, & Global Context Providers
│   │   ├── main.tsx             # Vite entry script
│   │   ├── App.tsx              # Root component & router setup
│   │   ├── router.tsx           # React Router route definitions
│   │   └── providers/           # QueryClientProvider, AuthProvider, ThemeProvider
│   │
│   ├── components/              # UI components
│   │   ├── ui/                  # Reusable shadcn/ui base primitives (Button, Modal, Input, Table)
│   │   ├── layout/              # Sidebar, Header, Breadcrumbs, LayoutWrapper
│   │   ├── files/               # FileGrid, FileList, FileCard, FileContextMenu
│   │   ├── folders/             # FolderTree, FolderCard, CreateFolderModal
│   │   ├── sharing/             # ShareModal, DirectShareSection, PublicLinkSection
│   │   ├── upload/              # UploadDropzone, UploadProgressToast
│   │   └── common/              # EmptyState, ErrorBoundary, LoadingSpinner
│   │
│   ├── pages/                   # Top-level Page Views
│   │   ├── auth/                # LoginPage.tsx, RegisterPage.tsx
│   │   ├── drive/               # DrivePage.tsx (My Drive folder view)
│   │   ├── shared/              # SharedPage.tsx (Shared with Me view)
│   │   ├── starred/             # StarredPage.tsx (Starred resources view)
│   │   ├── trash/               # TrashPage.tsx (Soft-deleted trash view)
│   │   └── public/              # PublicSharePage.tsx (External public download view)
│   │
│   ├── hooks/                   # Custom React Hooks
│   │   ├── useAuth.ts           # Authentication context hook
│   │   ├── useFiles.ts          # File operations TanStack Query hooks
│   │   ├── useFolders.ts        # Folder operations TanStack Query hooks
│   │   ├── useShares.ts         # Sharing TanStack Query hooks
│   │   └── useSearch.ts        # Search & filter hook
│   │
│   ├── services/                # API Client Layer (Axios instance & endpoint methods)
│   │   ├── api.ts               # Axios base instance with JWT & refresh interceptors
│   │   ├── auth.service.ts      # Auth API endpoints
│   │   ├── files.service.ts     # File & presigned upload API endpoints
│   │   ├── folders.service.ts   # Folder CRUD API endpoints
│   │   ├── shares.service.ts    # Sharing & public links API endpoints
│   │   └── search.service.ts    # Search API endpoints
│   │
│   ├── types/                   # TypeScript Type Definitions
│   │   ├── api.ts               # APIResponse<T>, ErrorResponse schemas
│   │   ├── models.ts            # User, FileItem, FolderItem, ShareItem models
│   │   └── auth.ts              # AuthState, Credentials types
│   │
│   ├── schemas/                 # Frontend validation schemas (Zod)
│   │   ├── auth.schema.ts       # Login & Register Zod schemas
│   │   └── file.schema.ts       # Upload & Rename Zod schemas
│   │
│   └── utils/                   # Formatting & helper utilities
│       ├── formatters.ts        # File size (MB/GB) & date formatters
│       └── mimeIcon.tsx         # File type icon lookup
│
├── index.html                   # HTML template
├── package.json                 # Dependencies
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript compiler config
└── vite.config.ts               # Vite build configuration
```

---

## 2. Frontend State Management Architecture

### 2.1 Server State (TanStack Query)
All remote data (folders, files, search results, shared items, trash items) is managed as **Server State** via TanStack Query (React Query):
- Query keys are hierarchical: `['folders', folderId]`, `['files', folderId]`, `['starred']`, `['trash']`.
- Automated cache invalidation triggers on mutations (e.g., uploading a file invalidates `['files', currentFolderId]`).

### 2.2 Local UI State (React `useState` / Context)
Transient UI state (modal visibility, active selection, view mode `grid|list`, drag hover) is stored strictly in component state or lightweight React context. No Redux or Zustand is required.

---

## 3. Client API Layer & Refresh Token Interceptor

Axios handles API requests with transparent JWT refresh token rotation.

```text
Request Outbound
   │
   ▼ 1. Attach Access Token to Header (Authorization: Bearer <token>)
FastAPI Endpoint
   │
   ▼ 2. Return Response
      - If 200 OK -> Return Data
      - If 401 Unauthorized -> Trigger Axios Interceptor
         │
         ▼ 3. POST /api/v1/auth/refresh (Sends HttpOnly Cookie)
         - If Refresh Succeeds -> Store New Access Token & Retry Original Request
         - If Refresh Fails -> Clear Auth State & Redirect to /login
```

---

## 4. Routing Architecture

The router implements strict protection boundaries via `React Router v6`:

```text
Public Unauthenticated Routes:
  /login        -> LoginPage
  /register     -> RegisterPage
  /s/:token     -> PublicSharePage (accessible without auth)

Protected Authenticated Routes (Requires Valid Session):
  /drive                -> DrivePage (Root directory)
  /drive/folders/:id    -> DrivePage (Subfolder directory view)
  /shared               -> SharedPage (Shared with Me)
  /starred              -> StarredPage (Starred items)
  /trash                -> TrashPage (Soft-deleted items)
```
