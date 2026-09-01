/**
 * Standardized API Error Normalization & Human-Readable Messaging.
 */

import axios, { AxiosError } from "axios";
import { ApiError, APIResponse } from "../types/api";

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<APIResponse<unknown>>;

    if (axiosError.code === "ECONNABORTED" || (typeof axiosError.message === "string" && axiosError.message.includes("timeout"))) {
      return new ApiError(
        "Request timed out. Please check your network connection and try again.",
        "TIMEOUT",
        408
      );
    }

    if (!axiosError.response) {
      return new ApiError(
        "Unable to connect to SecStorage. Please verify backend service availability.",
        "NETWORK_ERROR",
        0
      );
    }

    const status = axiosError.response.status;
    const responseData = axiosError.response.data;

    // Backend standardized ErrorPayload
    if (responseData && typeof responseData === "object") {
      if (responseData.error && typeof responseData.error === "object") {
        const payload = responseData.error;
        return new ApiError(
          payload.message || getFallbackMessageForStatus(status),
          payload.code || `HTTP_${status}`,
          status,
          payload.details
        );
      }

      if (responseData.message) {
        return new ApiError(responseData.message, `HTTP_${status}`, status);
      }
    }

    return new ApiError(getFallbackMessageForStatus(status), `HTTP_${status}`, status);
  }

  if (error instanceof Error) {
    return new ApiError(error.message, "CLIENT_ERROR", 500);
  }

  return new ApiError("An unexpected error occurred. Please try again.", "UNKNOWN_ERROR", 500);
}

function getFallbackMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "The request was invalid or malformed.";
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "A conflict occurred with the existing resource.";
    case 422:
      return "Validation failed. Please review your input.";
    case 429:
      return "Too many requests. Please slow down and try again shortly.";
    case 500:
    case 502:
    case 503:
      return "SecStorage server encountered an error. Please try again later.";
    default:
      return `Server returned an error (HTTP ${status}).`;
  }
}

export function getErrorMessage(error: unknown): string {
  return normalizeApiError(error).message;
}
