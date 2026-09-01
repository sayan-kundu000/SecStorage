import { apiClient } from "./client";
import {
  APIResponse,
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  TokenResponse,
  User,
  UserUpdate,
} from "../../types";

export const authService = {
  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const res = await apiClient.post<APIResponse<AuthResponse>>("/auth/register", payload);
    if (!res.data.data) throw new Error("Empty registration response");
    return res.data.data;
  },

  async login(payload: LoginRequest): Promise<AuthResponse> {
    const res = await apiClient.post<APIResponse<AuthResponse>>("/auth/login", payload);
    if (!res.data.data) throw new Error("Empty authentication response");
    return res.data.data;
  },

  async refresh(payload: RefreshTokenRequest): Promise<TokenResponse> {
    const res = await apiClient.post<APIResponse<TokenResponse>>("/auth/refresh", payload);
    if (!res.data.data) throw new Error("Empty token refresh response");
    return res.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  async logoutAll(): Promise<void> {
    await apiClient.post("/auth/logout-all");
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get<APIResponse<User>>("/auth/me");
    if (!res.data.data) throw new Error("Empty user profile response");
    return res.data.data;
  },

  async changePassword(payload: ChangePasswordRequest): Promise<void> {
    await apiClient.post("/auth/change-password", payload);
  },

  async updateProfile(payload: UserUpdate): Promise<User> {
    const res = await apiClient.patch<APIResponse<User>>("/users/me", payload);
    if (!res.data.data) throw new Error("Empty user update response");
    return res.data.data;
  },
};
