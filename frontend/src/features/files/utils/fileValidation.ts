import { MAX_UPLOAD_SIZE_BYTES } from "../../../app/config/constants";
import { formatBytes } from "../../../utils/formatters";

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateFileForUpload(file: File): FileValidationResult {
  if (!file) {
    return { isValid: false, error: "No file selected." };
  }

  // Check file size limit
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      isValid: false,
      error: `"${file.name}" (${formatBytes(file.size)}) exceeds the maximum allowed upload size of ${formatBytes(MAX_UPLOAD_SIZE_BYTES)}.`,
    };
  }

  // Validate filename has reasonable length
  if (file.name.trim().length === 0) {
    return { isValid: false, error: "File name cannot be empty." };
  }

  if (file.name.length > 255) {
    return { isValid: false, error: `File name "${file.name.substring(0, 30)}..." is too long (max 255 characters).` };
  }

  return { isValid: true };
}

export function sanitizeFilename(filename: string): string {
  // Strip control characters and HTML tags for safe rendering
  return filename
    .replace(/[<>&"']/g, "")
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .trim();
}

export function getFileCategory(mimeType: string, filename: string): "image" | "pdf" | "text" | "video" | "audio" | "archive" | "code" | "document" | "unknown" {
  const mime = mimeType.toLowerCase();
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"].includes(ext)) {
    return "image";
  }
  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf";
  }
  if (
    mime.startsWith("text/") ||
    ["txt", "md", "csv", "json", "xml", "log", "yaml", "yml"].includes(ext)
  ) {
    return "text";
  }
  if (mime.startsWith("video/") || ["mp4", "webm", "mkv", "avi", "mov"].includes(ext)) {
    return "video";
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)) {
    return "audio";
  }
  if (
    ["zip", "tar", "gz", "7z", "rar"].includes(ext) ||
    mime.includes("zip") ||
    mime.includes("compressed") ||
    mime.includes("archive")
  ) {
    return "archive";
  }
  if (["js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "go", "rs", "html", "css"].includes(ext)) {
    return "code";
  }
  if (
    ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt"].includes(ext) ||
    mime.includes("wordprocessingml") ||
    mime.includes("spreadsheetml") ||
    mime.includes("presentationml")
  ) {
    return "document";
  }

  return "unknown";
}
