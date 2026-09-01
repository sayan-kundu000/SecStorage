import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermissions } from "../src/hooks/usePermissions";
import { AuthContext, AuthContextValue } from "../src/app/providers/AuthContext";
import { User } from "../src/types";

const mockStandardUser: User = {
  id: "user-123",
  email: "user@example.com",
  full_name: "Standard User",
  is_active: true,
  is_verified: true,
  is_admin: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockAdminUser: User = {
  id: "admin-456",
  email: "admin@example.com",
  full_name: "Admin User",
  is_active: true,
  is_verified: true,
  is_admin: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function createWrapper(user: User | null) {
  const authContextValue: AuthContextValue = {
    status: user ? "AUTHENTICATED" : "UNAUTHENTICATED",
    user,
    isAuthenticated: !!user,
    isLoading: false,
    isLoggingIn: false,
    isRegistering: false,
    isLoggingOut: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    dismissSessionExpired: vi.fn(),
    clearError: vi.fn(),
  };

  return ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>
  );
}

describe("usePermissions Hook", () => {
  it("evaluates ownership correctly for regular user", () => {
    const wrapper = createWrapper(mockStandardUser);
    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isOwner({ user_id: "user-123" })).toBe(true);
    expect(result.current.isOwner({ user_id: "other-user" })).toBe(false);
    expect(result.current.canDelete({ user_id: "user-123" })).toBe(true);
    expect(result.current.canDelete({ user_id: "other-user" })).toBe(false);
    expect(result.current.canViewAudit).toBe(false);
  });

  it("evaluates shared editor and viewer permissions", () => {
    const wrapper = createWrapper(mockStandardUser);
    const { result } = renderHook(() => usePermissions(), { wrapper });

    // Viewer shared resource
    const viewerResource = { user_id: "owner-999", permission: "VIEWER" };
    expect(result.current.canRead(viewerResource)).toBe(true);
    expect(result.current.canDownload(viewerResource)).toBe(true);
    expect(result.current.canEdit(viewerResource)).toBe(false);
    expect(result.current.canDelete(viewerResource)).toBe(false);

    // Editor shared resource
    const editorResource = { user_id: "owner-999", permission: "EDITOR" };
    expect(result.current.canRead(editorResource)).toBe(true);
    expect(result.current.canEdit(editorResource)).toBe(true);
    expect(result.current.canDelete(editorResource)).toBe(false);
  });

  it("grants all administrative permissions to admin users", () => {
    const wrapper = createWrapper(mockAdminUser);
    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.canViewAudit).toBe(true);
    expect(result.current.canDelete({ user_id: "unowned-file" })).toBe(true);
    expect(result.current.canEdit({ user_id: "unowned-file" })).toBe(true);
  });
});
