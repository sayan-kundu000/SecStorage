import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "../src/app/router/ProtectedRoute";
import { PublicRoute } from "../src/app/router/PublicRoute";
import { AuthContext, AuthContextValue } from "../src/app/providers/AuthContext";
import { User } from "../src/types";

const mockUser: User = {
  id: "user-123",
  email: "user@example.com",
  full_name: "Test User",
  is_active: true,
  is_verified: true,
  is_admin: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function renderWithAuth(
  initialRoute: string,
  user: User | null,
  isLoading = false
) {
  const authContextValue: AuthContextValue = {
    status: isLoading ? "INITIALIZING" : user ? "AUTHENTICATED" : "UNAUTHENTICATED",
    user,
    isAuthenticated: !isLoading && !!user,
    isLoading,
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
            <Route path="/login" element={<div>Login Screen</div>} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/files" element={<div>Protected Files Screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("Route Guards", () => {
  it("redirects unauthenticated user from protected route to login", () => {
    renderWithAuth("/files", null);
    expect(screen.getByText("Login Screen")).toBeInTheDocument();
  });

  it("renders protected content when user is authenticated", () => {
    renderWithAuth("/files", mockUser);
    expect(screen.getByText("Protected Files Screen")).toBeInTheDocument();
  });

  it("redirects authenticated user away from public login route", () => {
    renderWithAuth("/login", mockUser);
    expect(screen.getByText("Protected Files Screen")).toBeInTheDocument();
  });
});
