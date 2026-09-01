/**
 * Generic API & Error Contract Types matching FastAPI response schemas.
 */

export interface ErrorPayload {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }> | unknown[] | null;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message: string | null;
  error?: ErrorPayload | null;
}

export interface PaginationMeta {
  has_more: boolean;
  next_cursor?: string | null;
  total_count?: number | null;
}

export interface PaginatedResponse<T = unknown> {
  items: T[];
  pagination: PaginationMeta;
}

export interface HealthStatus {
  status: string;
  version: string;
  environment: string;
}

export interface ReadinessStatus {
  status: string;
  database: string;
  environment: string;
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, code = "UNKNOWN_ERROR", status = 500, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
