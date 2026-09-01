import { AxiosError } from "axios";

export interface NormalizedError {
  statusCode: number | null;
  message: string;
  isNetworkError: boolean;
  isAuthError: boolean;
  isQuotaError: boolean;
  isRateLimitError: boolean;
}

export function normalizeFileError(error: unknown): NormalizedError {
  if (!error) {
    return {
      statusCode: null,
      message: "An unknown error occurred.",
      isNetworkError: false,
      isAuthError: false,
      isQuotaError: false,
      isRateLimitError: false,
    };
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status ?? null;
    const responseData = error.response?.data;

    // Extract detail or message if present, sanitize strings
    let rawDetail = "";
    if (responseData && typeof responseData === "object") {
      rawDetail = responseData.detail || responseData.message || "";
    }

    // Do not show stack traces or internal storage keys in rawDetail
    if (rawDetail.includes("Traceback") || rawDetail.includes("storage_key") || rawDetail.includes("amazonaws") || rawDetail.includes("s3")) {
      rawDetail = "";
    }

    if (!error.response && error.code === "ERR_NETWORK") {
      return {
        statusCode: null,
        message: "Network connection lost. Please check your internet connection and try again.",
        isNetworkError: true,
        isAuthError: false,
        isQuotaError: false,
        isRateLimitError: false,
      };
    }

    if (error.code === "ERR_CANCELED" || error.name === "CanceledError") {
      return {
        statusCode: null,
        message: "Operation was cancelled.",
        isNetworkError: false,
        isAuthError: false,
        isQuotaError: false,
        isRateLimitError: false,
      };
    }

    switch (status) {
      case 401:
        return {
          statusCode: 401,
          message: "Session expired. Please log in again to perform file actions.",
          isNetworkError: false,
          isAuthError: true,
          isQuotaError: false,
          isRateLimitError: false,
        };
      case 403:
        return {
          statusCode: 403,
          message: rawDetail || "Permission denied. You do not have permission to access or modify this item.",
          isNetworkError: false,
          isAuthError: false,
          isQuotaError: false,
          isRateLimitError: false,
        };
      case 404:
        return {
          statusCode: 404,
          message: rawDetail || "The requested file or folder was not found.",
          isNetworkError: false,
          isAuthError: false,
          isQuotaError: false,
          isRateLimitError: false,
        };
      case 409:
        return {
          statusCode: 409,
          message: rawDetail || "A file or folder with this name already exists in the target location.",
          isNetworkError: false,
          isAuthError: false,
          isQuotaError: false,
          isRateLimitError: false,
        };
      case 413:
        return {
          statusCode: 413,
          message: rawDetail || "File size exceeds the maximum allowed upload limit.",
          isNetworkError: false,
          isAuthError: false,
          isQuotaError: true,
          isRateLimitError: false,
        };
      case 422:
        return {
          statusCode: 422,
          message: rawDetail || "Invalid file payload or parameter format.",
          isNetworkError: false,
          isAuthError: false,
          isQuotaError: false,
          isRateLimitError: false,
        };
      case 429:
        return {
          statusCode: 429,
          message: "Too many requests. Please wait a moment and try again.",
          isNetworkError: false,
          isAuthError: false,
          isQuotaError: false,
          isRateLimitError: true,
        };
      default:
        if (status && status >= 500) {
          return {
            statusCode: status,
            message: "Server error encountered. Please try again in a few moments.",
            isNetworkError: false,
            isAuthError: false,
            isQuotaError: false,
            isRateLimitError: false,
          };
        }
    }
  }

  if (error instanceof Error) {
    if (error.name === "CanceledError" || error.message.includes("cancel")) {
      return {
        statusCode: null,
        message: "Operation was cancelled.",
        isNetworkError: false,
        isAuthError: false,
        isQuotaError: false,
        isRateLimitError: false,
      };
    }
    return {
      statusCode: null,
      message: error.message,
      isNetworkError: false,
      isAuthError: false,
      isQuotaError: false,
      isRateLimitError: false,
    };
  }

  return {
    statusCode: null,
    message: String(error),
    isNetworkError: false,
    isAuthError: false,
    isQuotaError: false,
    isRateLimitError: false,
  };
}
