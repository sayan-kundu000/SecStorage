# SecStorage — Frontend Architecture & UI Foundation

Single-page application (SPA) for **SecStorage** built with **React 18+**, **TypeScript (Strict Mode)**, **Vite**, **Tailwind CSS**, and **TanStack Query**.

---

## 🚀 Key Architecture & Features

1. **Strict Type-Safety & REST API Alignment**:
   - 100% mapped against FastAPI backend endpoints defined in Prompts 01–15.
   - Comprehensive TypeScript schemas in `src/types/` (`auth`, `files`, `folders`, `search`, `shares`, `stars`, `trash`, `activity`, `versions`, `preview`, `publicLinks`).

2. **Centralized API Client**:
   - Axios client with automatic Bearer JWT access token attachment.
   - Transparent 401 interceptor with token refresh queue preventing duplicate refresh storms.
   - Presigned S3 direct upload handling with accurate upload progress tracking.
   - Standardized API error normalization mapping backend `ErrorPayload` into user-friendly feedback.

3. **Role-Based Access Control (RBAC)**:
   - Frontend permission matrix mirroring backend security policies via `usePermissions`.
   - Distinguishes between Resource Owner, Shared Editor, Shared Viewer, and System Administrator.

4. **Multi-Selection & File Operations**:
   - `useSelection` hook supporting single click, multi-selection, select all, range shift-click, and ctrl/cmd-click.
   - Floating `SelectionBar` for quick batch operations (Download, Star, Trash, Restore, Share).

5. **Responsive Modern Design System**:
   - Semantic CSS variable theme system supporting **Dark** and **Light** modes (`ThemeProvider`).
   - Reusable UI primitives in `src/components/ui/` and `src/components/common/` (`Button`, `Input`, `Card`, `Badge`, `Dialog`, `DropdownMenu`, `Tooltip`, `Skeleton`, `Table`, `Checkbox`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `PageHeader`, `LoadingSpinner`).
   - Visual file categorization mapping extensions/MIMEs to distinct icons and colors.
   - Direct inline preview modal for Images, PDFs, and sanitized code/text.

6. **Production Routing & Vercel Readiness**:
   - React Router v6 with `createBrowserRouter`, route guards (`ProtectedRoute`, `PublicRoute`), and code-split lazy loading.
   - Full Vercel SPA rewrite support configured in `vercel.json` with security headers.

---

## 📁 Directory Structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── config/          # Environment validation (env.ts) & constants (constants.ts)
│   │   ├── layouts/         # Header, Sidebar, Breadcrumbs, UserMenu, MobileNav, AppLayout, AuthLayout
│   │   ├── providers/       # AuthProvider, ThemeProvider, QueryProvider, AppProviders
│   │   └── router/          # Router tree, ProtectedRoute, PublicRoute
│   ├── components/
│   │   ├── common/          # EmptyState, ErrorState, ConfirmDialog, PageHeader, LoadingSpinner, DocumentTitle
│   │   ├── feedback/        # Alert, ErrorBoundary
│   │   ├── files/           # FileIcon, FileRow, FolderRow, FileCard, FolderCard, FileList, FileGrid, SelectionBar, FileUploadZone, FilePreviewModal
│   │   └── ui/              # button, input, card, badge, dialog, dropdown, tooltip, skeleton, table, checkbox, toast
│   ├── features/            # Feature pages (auth, dashboard, files, starred, shared, trash, search, activity, settings, public, notFound)
│   ├── hooks/               # useAuth, usePermissions, useSelection, useTheme, useDebounce, usePagination, useMediaQuery
│   ├── lib/                 # Tailwind utility merge helpers (cn)
│   ├── services/            # Centralized API client & service layer modules
│   ├── types/               # TypeScript schemas and API contracts
│   ├── utils/               # Formatters, file types, and error normalizers
│   ├── App.tsx              # Application root
│   ├── main.tsx             # DOM mounting entrypoint
│   └── index.css            # Design system CSS variables and base styles
├── tests/                   # Vitest unit and integration test suites
├── vercel.json              # Vercel SPA deployment rewrites & security headers
├── tailwind.config.js       # Tailwind CSS theme configuration
└── vite.config.ts           # Vite configuration with alias resolving
```

---

## 🛠️ Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Ensure `VITE_API_BASE_URL` points to your active backend (default `http://localhost:8000`).

### 2. Development

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

### 3. Testing & Verification

```bash
# Run TypeScript strict typecheck
npm run typecheck

# Run Vitest test suites
npm run test

# Run ESLint
npm run lint

# Build production bundle
npm run build
```

---

## 🛡️ Frontend Security Principles

- **No Secret Storage**: Only client-safe `VITE_` variables are bundled.
- **Strict Presigned Uploads**: Large binary payloads stream directly to secure presigned URLs.
- **Session Protection**: Automatic token refresh lifecycle with in-memory auth state synchronization.
- **Server Enforcement**: All frontend UI permission gates (`usePermissions`) strictly reflect backend RBAC guarantees.
