import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider } from "../../src/app/providers/AuthProvider";
import { useAuth } from "../../src/hooks/useAuth";
import { authService } from "../../src/services";
import { queryClient } from "../../src/app/providers/queryClient";
import { STORAGE_KEYS } from "../../src/app/config/constants";
import { User, AuthResponse } from "../../src/types";

const mockUser: User = {
  id: "user-123",
  email: "test@example.com",
  full_name: "Test User",
  is_active: true,
  is_verified: true,
  is_admin: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockAuthResponse: AuthResponse = {
  user: mockUser,
  tokens: {
    access_token: "access-token-123",
    refresh_token: "refresh-token-123",
    token_type: "bearer",
    expires_in: 900,
  },
};

describe("AuthProvider & Auth State Machine", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("transitions to UNAUTHENTICATED when no token exists on startup", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.status).toBe("UNAUTHENTICATED");
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("restores session and transitions to AUTHENTICATED when valid token exists", async () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, "valid-token");
    vi.spyOn(authService, "getMe").mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.status).toBe("AUTHENTICATED");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it("handles login successfully, sets storage tokens, and clears query cache", async () => {
    vi.spyOn(authService, "login").mockResolvedValueOnce(mockAuthResponse);
    const clearSpy = vi.spyOn(queryClient, "clear");

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.status).toBe("UNAUTHENTICATED");
    });

    await act(async () => {
      await result.current.login({ email: "test@example.com", password: "password123" });
    });

    expect(result.current.status).toBe("AUTHENTICATED");
    expect(result.current.user).toEqual(mockUser);
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe("access-token-123");
    expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBe("refresh-token-123");
    expect(clearSpy).toHaveBeenCalled();
  });

  it("handles logout, calls backend, clears storage and purges query cache", async () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, "valid-token");
    vi.spyOn(authService, "getMe").mockResolvedValueOnce(mockUser);
    const logoutSpy = vi.spyOn(authService, "logout").mockResolvedValueOnce();
    const clearSpy = vi.spyOn(queryClient, "clear");

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.status).toBe("AUTHENTICATED");
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(logoutSpy).toHaveBeenCalled();
    expect(result.current.status).toBe("UNAUTHENTICATED");
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(clearSpy).toHaveBeenCalled();
  });

  it("handles multi-tab logout synchronization via storage event", async () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, "valid-token");
    vi.spyOn(authService, "getMe").mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.status).toBe("AUTHENTICATED");
    });

    // Simulate another tab clearing the access token
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEYS.ACCESS_TOKEN,
          oldValue: "valid-token",
          newValue: null,
        })
      );
    });

    expect(result.current.status).toBe("UNAUTHENTICATED");
    expect(result.current.user).toBeNull();
  });

  it("transitions to SESSION_EXPIRED on secstorage:auth:expired event", async () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, "valid-token");
    vi.spyOn(authService, "getMe").mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.status).toBe("AUTHENTICATED");
    });

    act(() => {
      window.dispatchEvent(new CustomEvent("secstorage:auth:expired"));
    });

    expect(result.current.status).toBe("SESSION_EXPIRED");
    expect(result.current.error).toContain("expired");
  });
});
