/**
 * Standardized Formatting Utilities for SecStorage.
 */

/**
 * Formats a byte size into human-readable binary units (B, KB, MB, GB, TB).
 */
export function formatBytes(bytes: number | null | undefined, decimals = 1): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes === 0) {
    return "0 B";
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const normalizedIndex = Math.min(i, sizes.length - 1);

  const value = parseFloat((bytes / Math.pow(k, normalizedIndex)).toFixed(dm));
  return `${value} ${sizes[normalizedIndex]}`;
}

/**
 * Formats an ISO datetime string into a localized readable date/time.
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "—";
  }
}

/**
 * Formats an ISO datetime string into a concise relative time string (e.g. "5m ago", "2d ago").
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return "just now";
    if (diffSec < 90) return "1m ago";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: now.getFullYear() !== date.getFullYear() ? "numeric" : undefined,
    }).format(date);
  } catch {
    return "—";
  }
}

/**
 * Truncates a filename or string while preserving the extension if requested.
 */
export function truncateFilename(filename: string, maxLength = 32): string {
  if (!filename || filename.length <= maxLength) return filename;

  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex > 0 && filename.length - dotIndex <= 8) {
    const ext = filename.slice(dotIndex);
    const base = filename.slice(0, dotIndex);
    const available = maxLength - ext.length - 3;
    if (available > 3) {
      return `${base.slice(0, available)}...${ext}`;
    }
  }

  return `${filename.slice(0, maxLength - 3)}...`;
}
