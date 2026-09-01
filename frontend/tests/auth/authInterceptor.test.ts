import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { apiClient } from "../../src/services/api/client";
import { STORAGE_KEYS } from "../../src/app/config/constants";
import { normalizeApiError } from "../../src/utils/errors";

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...actual,
    default: {
      ...actual.default,
      create: actual.default.create,
      post: vi.fn(),
    },
  };
});

describe("API Client Auth Interceptor & 401 / Refresh Lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("attaches Authorization header when access token is present", async () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, "test-access-token");

    const requestInterceptor = apiClient.interceptors.request as unknown as {
      handlers: Array<{ fulfilled: (config: Record<string, unknown>) => Record<string, unknown> }>;
    };

    const config = { headers: {} };
    const modifiedConfig = requestInterceptor.handlers[0].fulfilled(config);

    expect(modifiedConfig.headers).toHaveProperty("Authorization", "Bearer test-access-token");
  });

  it("dispatches secstorage:auth:expired when 401 occurs and no refresh token exists", async () => {
    const expiredHandler = vi.fn();
    window.addEventListener("secstorage:auth:expired", expiredHandler);

    const responseInterceptor = apiClient.interceptors.response as unknown as {
      handlers: Array<{
        rejected: (error: unknown) => Promise<unknown>;
      }>;
    };

    const mock401Error = {
      isAxiosError: true,
      config: { url: "/files", headers: {} },
      response: { status: 401, data: {} },
    };

    await expect(responseInterceptor.handlers[0].rejected(mock401Error)).rejects.toSatisfy(
      (err: unknown) => {
        const norm = normalizeApiError(err);
        return norm.status === 401;
      }
    );

    expect(expiredHandler).toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();

    window.removeEventListener("secstorage:auth:expired", expiredHandler);
  });

  it("attempts silent token refresh when 401 occurs with valid refresh token", async () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, "expired-access-token");
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, "valid-refresh-token");

    const mockPost = axios.post as unknown as ReturnType<typeof vi.fn>;
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          access_token: "new-access-token-999",
          refresh_token: "new-refresh-token-999",
          token_type: "bearer",
          expires_in: 900,
        },
      },
    });

    const responseInterceptor = apiClient.interceptors.response as unknown as {
      handlers: Array<{
        rejected: (error: unknown) => Promise<unknown>;
      }>;
    };

    // Mock apiClient call inside retry logic
    const originalApiClient = apiClient;
    const mockApiClientCall = vi.fn().mockResolvedValue({ data: { success: true } });

    // Execute response interceptor retry logic
    const mock401Error = {
      isAxiosError: true,
      config: { url: "/files/my-doc.pdf", headers: {} },
      response: { status: 401, data: {} },
    };

    // Spy on internal axios post
    try {
      await responseInterceptor.handlers[0].rejected(mock401Error);
    } catch {
      // In unit environment, re-executing apiClient(originalRequest) will trigger network or mock
    }

    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining("/auth/refresh"),
      { refresh_token: "valid-refresh-token" },
      expect.any(Object)
    );
  });

  it("normalizes HTTP 429 rate limit responses cleanly", () => {
    const mock429Error = {
      isAxiosError: true,
      response: {
        status: 429,
        data: {},
      },
    };

    const normalized = normalizeApiError(mock429Error);
    expect(normalized.status).toBe(429);
    expect(normalized.message).toContain("Too many requests");
  });

  it("normalizes backend offline network failures gracefully", () => {
    const mockNetworkError = {
      isAxiosError: true,
      response: undefined,
    };

    const normalized = normalizeApiError(mockNetworkError);
    expect(normalized.status).toBe(0);
    expect(normalized.message).toContain("Unable to connect to SecStorage");
  });
});
