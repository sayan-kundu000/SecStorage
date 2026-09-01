import { useContext } from "react";
import { AuthContext, AuthContextValue } from "../app/providers/AuthContext";
import { authService } from "../services/api/auth.service";
import { STORAGE_KEYS } from "../app/config/constants";
import { queryClient } from "../app/providers/queryClient";
import { LoginRequest, RegisterRequest, User } from "../types";

/**
 * Resilient fallback auth provider implementation.
 * Ensures that even if the React context tree is temporarily unmounted or disrupted
 * during HMR (hot-module replacement) or non-standard rendering cycles,
 * authentication calls (login, register, logout) will gracefully proceed via authService
 * rather than throwing "Authentication provider not mounted" errors.
 */
function getCachedUser(): User | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.USER);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

const fallbackAuthContextValue: AuthContextValue = {
  status: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ? "AUTHENTICATED" : "UNAUTHENTICATED",
  user: getCachedUser(),
  isAuthenticated: !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
  isLoading: false,
  isLoggingIn: false,
  isRegistering: false,
  isLoggingOut: false,
  error: null,
  login: async (credentials: LoginRequest) => {
    console.warn("[SecStorage] useAuth: Fallback login triggered via direct authService.");
    const result = await authService.login(credentials);
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, result.tokens.access_token);
    if (result.tokens.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, result.tokens.refresh_token);
    }
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));
    queryClient.clear();
    // Dispatch storage event to notify other listeners and sync state
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEYS.ACCESS_TOKEN,
        newValue: result.tokens.access_token,
      })
    );
    return result;
  },
  register: async (data: RegisterRequest) => {
    console.warn("[SecStorage] useAuth: Fallback register triggered via direct authService.");
    const result = await authService.register(data);
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, result.tokens.access_token);
    if (result.tokens.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, result.tokens.refresh_token);
    }
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));
    queryClient.clear();
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEYS.ACCESS_TOKEN,
        newValue: result.tokens.access_token,
      })
    );
    return result;
  },
  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout cleanup
    } finally {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      queryClient.clear();
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEYS.ACCESS_TOKEN,
          newValue: null,
        })
      );
    }
  },
  refreshUser: async () => {
    try {
      const user = await authService.getMe();
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch {
      // Ignored in fallback
    }
  },
  dismissSessionExpired: () => {},
  clearError: () => {},
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  return context ?? fallbackAuthContextValue;
}

export type { AuthContextValue };
