import { describe, it, expect } from "vitest";
import { normalizeApiError, getErrorMessage } from "../src/utils/errors";
import { ApiError } from "../src/types/api";

describe("API Error Normalization", () => {
  it("passes through existing ApiError instances", () => {
    const original = new ApiError("Custom Error", "CUSTOM_CODE", 400);
    const normalized = normalizeApiError(original);
    expect(normalized).toBe(original);
    expect(normalized.message).toBe("Custom Error");
    expect(normalized.code).toBe("CUSTOM_CODE");
    expect(normalized.status).toBe(400);
  });

  it("normalizes generic Javascript Errors", () => {
    const error = new Error("Something broke");
    const normalized = normalizeApiError(error);
    expect(normalized.message).toBe("Something broke");
    expect(normalized.code).toBe("CLIENT_ERROR");
  });

  it("provides helpful status fallback messages", () => {
    const mockAxiosError = {
      isAxiosError: true,
      response: {
        status: 401,
        data: {},
      },
    };
    const normalized = normalizeApiError(mockAxiosError);
    expect(normalized.message).toBe("Your session has expired. Please sign in again.");
    expect(normalized.status).toBe(401);
  });

  it("extracts backend standardized ErrorPayload messages", () => {
    const mockAxiosError = {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          error: {
            code: "VALIDATION_FAILED",
            message: "Password too short",
          },
        },
      },
    };
    const normalized = normalizeApiError(mockAxiosError);
    expect(normalized.message).toBe("Password too short");
    expect(normalized.code).toBe("VALIDATION_FAILED");
    expect(normalized.status).toBe(422);
  });

  it("getErrorMessage helper extracts message safely", () => {
    expect(getErrorMessage("String error")).toBe("An unexpected error occurred. Please try again.");
    expect(getErrorMessage(new Error("Direct message"))).toBe("Direct message");
  });
});
