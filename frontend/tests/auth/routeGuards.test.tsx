import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "../../src/app/router/ProtectedRoute";
import { PublicRoute } from "../../src/app/router/PublicRoute";
import { AuthContext, AuthContextValue } from "../../src/app/providers/AuthContext";
import { getSafeReturnUrl } from "../../src/utils/security";
import { User, AuthStatus } from "../../src/types";

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

function renderWithAuthRoute(
  initialRoute: string,
  user: User | null,
  status: AuthStatus = "AUTHENTICATED"
) {
  const authContextValue: AuthContextValue = {
    status,
    user,
    isAuthenticated: status === "AUTHENTICATED" && !!user,
    isLoading: status === "INITIALIZING",
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

  return render(
    <AuthContext.Provider value={authContextValue}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<div>Public Login Screen</div>} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/files" element={<div>Protected Files Screen</div>} />
          </Route>

          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/admin" element={<div>Protected Admin Screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("Route Guards & Open Redirect Defense", () => {
  describe("getSafeReturnUrl Utility", () => {
    it("accepts valid relative application paths", () => {
      expect(getSafeReturnUrl("/files")).toBe("/files");
      expect(getSafeReturnUrl("/files/folder-123?sort=name")).toBe("/files/folder-123?sort=name");
      expect(getSafeReturnUrl("/settings")).toBe("/settings");
    });

    it("rejects protocol-relative open redirect attacks", () => {
      expect(getSafeReturnUrl("//evil.com")).toBe("/files");
      expect(getSafeReturnUrl("//attacker.org/phish")).toBe("/files");
    });

    it("rejects absolute external URLs", () => {
      expect(getSafeReturnUrl("https://evil.com")).toBe("/files");
      expect(getSafeReturnUrl("http://attacker.org")).toBe("/files");
    });

    it("rejects malicious scripting schemas and backslashes", () => {
      expect(getSafeReturnUrl("javascript:alert(1)")).toBe("/files");
      expect(getSafeReturnUrl("data:text/html,evil")).toBe("/files");
      expect(getSafeReturnUrl("/\\evil.com")).toBe("/files");
    });
  });

  describe("ProtectedRoute Guard", () => {
    it("displays loading spinner during INITIALIZING state without flashing content", () => {
      renderWithAuthRoute("/files", null, "INITIALIZING");
      expect(screen.getByText(/validating session/i)).toBeInTheDocument();
      expect(screen.queryByText("Protected Files Screen")).not.toBeInTheDocument();
    });

    it("redirects unauthenticated users to /login", () => {
      renderWithAuthRoute("/files", null, "UNAUTHENTICATED");
      expect(screen.getByText("Public Login Screen")).toBeInTheDocument();
    });

    it("renders protected content for authenticated standard user", () => {
      renderWithAuthRoute("/files", mockStandardUser, "AUTHENTICATED");
      expect(screen.getByText("Protected Files Screen")).toBeInTheDocument();
    });

    it("blocks standard user from admin-only route with 403 access denied card", () => {
      renderWithAuthRoute("/admin", mockStandardUser, "AUTHENTICATED");
      expect(screen.getByText(/administrative access required/i)).toBeInTheDocument();
      expect(screen.queryByText("Protected Admin Screen")).not.toBeInTheDocument();
    });

    it("allows administrator user to access admin-only route", () => {
      renderWithAuthRoute("/admin", mockAdminUser, "AUTHENTICATED");
      expect(screen.getByText("Protected Admin Screen")).toBeInTheDocument();
    });
  });

  describe("PublicRoute Guard", () => {
    it("redirects authenticated user away from public login screen", () => {
      renderWithAuthRoute("/login", mockStandardUser, "AUTHENTICATED");
      expect(screen.getByText("Protected Files Screen")).toBeInTheDocument();
    });
  });
});
