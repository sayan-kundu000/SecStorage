/**
 * Security & URL Sanitization Utilities.
 * Protects against open redirect attacks and malicious input vectors.
 */

import { ROUTES } from "../app/config/constants";

/**
 * Validates and sanitizes a return-to destination URL.
 * Ensures the target is strictly an internal relative application path.
 *
 * Rejects:
 * - External absolute URLs (e.g., https://evil.example.com)
 * - Protocol-relative URLs (e.g., //evil.example.com)
 * - Scripting schemas (e.g., javascript:alert(1), data:...)
 * - Control characters / backslashes
 */
export function getSafeReturnUrl(
  url: string | null | undefined,
  fallback = ROUTES.FILES
): string {
  if (!url || typeof url !== "string") {
    return fallback;
  }

  const trimmed = url.trim();

  // Must begin with a single forward slash
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  // Reject backslashes (often used in browser redirect bypasses)
  if (trimmed.includes("\\")) {
    return fallback;
  }

  // Reject explicit dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("javascript:") ||
    lower.includes("data:") ||
    lower.includes("vbscript:") ||
    lower.includes("http:") ||
    lower.includes("https:")
  ) {
    return fallback;
  }

  // Must be a valid relative pathname
  try {
    const parsed = new URL(trimmed, "http://localhost");
    // Ensure origin matches the dummy base (meaning it's purely relative)
    if (parsed.origin !== "http://localhost") {
      return fallback;
    }
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
