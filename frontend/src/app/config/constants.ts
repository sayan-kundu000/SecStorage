/**
 * Centralized Application Constants (Routes, QueryKeys, StorageKeys, Permissions).
 */

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  FILES: "/files",
  FOLDER_DETAIL: (folderId: string) => `/files/${folderId}`,
  FOLDER_DETAIL_PATTERN: "/files/:folderId",
  FILE_VIEWER: (fileId: string) => `/files/${fileId}/view`,
  FILE_VIEWER_PATTERN: "/files/:fileId/view",
  STARRED: "/starred",
  SHARED: "/shared",
  TRASH: "/trash",
  SEARCH: "/search",
  ACTIVITY: "/activity",
  SETTINGS: "/settings",
  PUBLIC_LINK: (token: string) => `/public/${token}`,
  PUBLIC_LINK_PATTERN: "/public/:token",
  NOT_FOUND: "/404",
} as const;

export const QUERY_KEYS = {
  AUTH: {
    ME: ["auth", "me"] as const,
    SESSIONS: ["auth", "sessions"] as const,
  },
  FILES: {
    ALL: ["files"] as const,
    LIST: (folderId?: string | null) => ["files", "list", folderId ?? "root"] as const,
    DETAIL: (fileId: string) => ["files", "detail", fileId] as const,
    VERSIONS: (fileId: string) => ["files", "versions", fileId] as const,
    PREVIEW: (fileId: string, versionId?: string) => ["files", "preview", fileId, versionId ?? "current"] as const,
    ACTIVITY: (fileId: string) => ["files", "activity", fileId] as const,
    SHARES: (fileId: string) => ["files", "shares", fileId] as const,
    PUBLIC_LINKS: (fileId: string) => ["files", "public-links", fileId] as const,
  },
  FOLDERS: {
    ALL: ["folders"] as const,
    LIST: (parentId?: string | null) => ["folders", "list", parentId ?? "root"] as const,
    DETAIL: (folderId: string) => ["folders", "detail", folderId] as const,
    ACTIVITY: (folderId: string) => ["folders", "activity", folderId] as const,
    SHARES: (folderId: string) => ["folders", "shares", folderId] as const,
    PUBLIC_LINKS: (folderId: string) => ["folders", "public-links", folderId] as const,
  },
  STARRED: {
    ALL: ["starred"] as const,
    LIST: (cursor?: string) => ["starred", "list", cursor ?? "initial"] as const,
  },
  SHARED: {
    ALL: ["shared"] as const,
    RECEIVED: ["shared", "received"] as const,
  },
  TRASH: {
    ALL: ["trash"] as const,
    LIST: (cursor?: string, sortBy?: string, sortOrder?: string) =>
      ["trash", "list", cursor ?? "initial", sortBy ?? "deletedAt", sortOrder ?? "desc"] as const,
  },
  SEARCH: {
    ALL: ["search"] as const,
    QUERY: (params: Record<string, unknown>) => ["search", "query", params] as const,
  },
  ACTIVITY: {
    ALL: ["activity"] as const,
    FEED: (page = 1, pageSize = 50) => ["activity", "feed", page, pageSize] as const,
    AUDIT: (page = 1, pageSize = 50) => ["activity", "audit", page, pageSize] as const,
  },
  PUBLIC_LINK: {
    DETAIL: (token: string) => ["public-link", "detail", token] as const,
  },
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "secstorage_access_token",
  REFRESH_TOKEN: "secstorage_refresh_token",
  USER: "secstorage_user",
  THEME: "secstorage_theme",
  VIEW_MODE: "secstorage_view_mode",
  SIDEBAR_COLLAPSED: "secstorage_sidebar_collapsed",
} as const;

export const ROLES = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

export const SHARE_PERMISSIONS = {
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
} as const;

export const MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
export const SEARCH_DEBOUNCE_MS = 300;
export const DEFAULT_PAGE_SIZE = 20;
