import { createContext } from "react";
import { AuthResponse, AuthStatus, LoginRequest, RegisterRequest, User } from "../../types";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingIn: boolean;
  isRegistering: boolean;
  isLoggingOut: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  dismissSessionExpired: () => void;
  clearError: () => void;
}

/**
 * Singleton React Context for Authentication.
 * Kept in a dedicated file without React components to ensure stable identity across
 * Vite HMR (Hot Module Replacement) and React Fast Refresh.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);
