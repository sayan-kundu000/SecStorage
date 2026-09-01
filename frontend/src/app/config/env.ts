/**
 * Client-side environment configuration.
 * Validates and exposes only safe, non-sensitive client configuration.
 */

export interface AppEnv {
  apiBaseUrl: string;
  appName: string;
  appEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
}

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const fallbackApiBaseUrl = "http://localhost:8000/api/v1";

// Ensure URL is normalized without a trailing slash
const apiBaseUrl = (rawApiBaseUrl ? rawApiBaseUrl.trim() : fallbackApiBaseUrl).replace(/\/+$/, "");

export const env: AppEnv = {
  apiBaseUrl,
  appName: import.meta.env.VITE_APP_NAME || "SecStorage",
  appEnv: import.meta.env.VITE_APP_ENV || import.meta.env.MODE || "development",
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,
};
