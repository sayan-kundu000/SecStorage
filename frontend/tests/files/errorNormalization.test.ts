import { describe, it, expect } from "vitest";
import { AxiosError } from "axios";
import { normalizeFileError } from "../../src/features/files/utils/errorNormalization";

describe("errorNormalization utils", () => {
  it("normalizes 401 Unauthorized status into session expired error", () => {
    const error = new AxiosError("Unauthorized", "401", undefined, undefined, {
      status: 401,
      data: { detail: "Token expired" },
      statusText: "Unauthorized",
      headers: {},
      config: { headers: {} as any },
    });

    const normalized = normalizeFileError(error);
    expect(normalized.statusCode).toBe(401);
    expect(normalized.isAuthError).toBe(true);
    expect(normalized.message).toContain("Session expired");
  });

  it("normalizes 403 Forbidden status into permission denied error", () => {
    const error = new AxiosError("Forbidden", "403", undefined, undefined, {
      status: 403,
      data: { detail: "User lacks files:delete permission" },
      statusText: "Forbidden",
      headers: {},
      config: { headers: {} as any },
    });

    const normalized = normalizeFileError(error);
    expect(normalized.statusCode).toBe(403);
    expect(normalized.message).toContain("User lacks files:delete permission");
  });

  it("normalizes 409 Conflict status into duplicate item error", () => {
    const error = new AxiosError("Conflict", "409", undefined, undefined, {
      status: 409,
      data: { detail: "File already exists" },
      statusText: "Conflict",
      headers: {},
      config: { headers: {} as any },
    });

    const normalized = normalizeFileError(error);
    expect(normalized.statusCode).toBe(409);
    expect(normalized.message).toContain("File already exists");
  });

  it("normalizes 429 Too Many Requests into rate limit error", () => {
    const error = new AxiosError("Too Many Requests", "429", undefined, undefined, {
      status: 429,
      data: {},
      statusText: "Too Many Requests",
      headers: {},
      config: { headers: {} as any },
    });

    const normalized = normalizeFileError(error);
    expect(normalized.statusCode).toBe(429);
    expect(normalized.isRateLimitError).toBe(true);
    expect(normalized.message).toContain("Too many requests");
  });

  it("normalizes network failures", () => {
    const error = new AxiosError("Network Error", "ERR_NETWORK", undefined, undefined, undefined);

    const normalized = normalizeFileError(error);
    expect(normalized.isNetworkError).toBe(true);
    expect(normalized.message).toContain("Network connection lost");
  });
});
