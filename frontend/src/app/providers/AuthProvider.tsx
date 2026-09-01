import React, { useCallback, useEffect, useState } from "react";
import { AuthResponse, AuthStatus, LoginRequest, RegisterRequest, User } from "../../types";
import { authService } from "../../services";
import { STORAGE_KEYS } from "../config/constants";
import { queryClient } from "./queryClient";
import { getErrorMessage } from "../../utils/errors";
import { AuthContext, AuthContextValue } from "./AuthContext";

export type { AuthContextValue };


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("INITIALIZING");
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.USER);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearAuth = useCallback((clearCache = true) => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setUser(null);
    if (clearCache) {
      queryClient.clear();
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      clearAuth(true);
      setStatus("UNAUTHENTICATED");
      return;
    }

    try {
      const currentUser = await authService.getMe();
      setUser(currentUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
      setStatus("AUTHENTICATED");
      setError(null);
    } catch {
      clearAuth(true);
      setStatus("UNAUTHENTICATED");
    }
  }, [clearAuth]);

  // Initial session check on application startup
  useEffect(() => {
    refreshUser();

    // Handle token expiration event triggered by API interceptor
    const handleAuthExpired = () => {
      clearAuth(true);
      setStatus("SESSION_EXPIRED");
      setError("Your session has expired. Please sign in again.");
    };

    // Cross-tab synchronization via storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.ACCESS_TOKEN) {
        if (!e.newValue) {
          // Another tab logged out
          clearAuth(true);
          setStatus("UNAUTHENTICATED");
        } else {
          // Another tab logged in
          refreshUser();
        }
      }
    };

    window.addEventListener("secstorage:auth:expired", handleAuthExpired);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("secstorage:auth:expired", handleAuthExpired);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [refreshUser, clearAuth]);

  const login = useCallback(
    async (credentials: LoginRequest): Promise<AuthResponse> => {
      setIsLoggingIn(true);
      setError(null);
      try {
        const result = await authService.login(credentials);
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, result.tokens.access_token);
        if (result.tokens.refresh_token) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, result.tokens.refresh_token);
        }
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));
        setUser(result.user);
        setStatus("AUTHENTICATED");
        // Clear previous query cache so new user starts completely fresh
        queryClient.clear();
        return result;
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        setStatus("AUTHENTICATION_ERROR");
        throw err;
      } finally {
        setIsLoggingIn(false);
      }
    },
    []
  );

  const register = useCallback(
    async (data: RegisterRequest): Promise<AuthResponse> => {
      setIsRegistering(true);
      setError(null);
      try {
        const result = await authService.register(data);
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, result.tokens.access_token);
        if (result.tokens.refresh_token) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, result.tokens.refresh_token);
        }
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));
        setUser(result.user);
        setStatus("AUTHENTICATED");
        queryClient.clear();
        return result;
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        setStatus("AUTHENTICATION_ERROR");
        throw err;
      } finally {
        setIsRegistering(false);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // Gracefully continue local cleanup on network or invalid token error
    } finally {
      clearAuth(true);
      setStatus("UNAUTHENTICATED");
      setIsLoggingOut(false);
    }
  }, [clearAuth]);

  const dismissSessionExpired = useCallback(() => {
    if (status === "SESSION_EXPIRED") {
      setStatus("UNAUTHENTICATED");
      setError(null);
    }
  }, [status]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isAuthenticated = status === "AUTHENTICATED" && user !== null;
  const isLoading = status === "INITIALIZING";

  const contextValue: AuthContextValue = {
    status,
    user,
    isAuthenticated,
    isLoading,
    isLoggingIn,
    isRegistering,
    isLoggingOut,
    error,
    login,
    register,
    logout,
    refreshUser,
    dismissSessionExpired,
    clearError,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
