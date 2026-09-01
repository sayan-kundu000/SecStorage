/**
 * File Type Classification & MIME Detection Utilities.
 */

export type FileCategory =
  | "image"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "code"
  | "archive"
  | "audio"
  | "video"
  | "folder"
  | "generic";

const EXTENSION_CATEGORY_MAP: Record<string, FileCategory> = {
  // Images
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  ico: "image",

  // PDF
  pdf: "pdf",

  // Documents
  doc: "document",
  docx: "document",
  txt: "document",
  md: "document",
  rtf: "document",
  odt: "document",

  // Spreadsheets
  xls: "spreadsheet",
  xlsx: "spreadsheet",
  csv: "spreadsheet",
  ods: "spreadsheet",

  // Presentations
  ppt: "presentation",
  pptx: "presentation",
  odp: "presentation",

  // Code / Data
  js: "code",
  jsx: "code",
  ts: "code",
  tsx: "code",
  json: "code",
  html: "code",
  css: "code",
  scss: "code",
  py: "code",
  rs: "code",
  go: "code",
  java: "code",
  c: "code",
  cpp: "code",
  sh: "code",
  yaml: "code",
  yml: "code",
  xml: "code",
  sql: "code",

  // Archives
  zip: "archive",
  tar: "archive",
  gz: "archive",
  "7z": "archive",
  rar: "archive",

  // Audio
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  m4a: "audio",
  flac: "audio",

  // Video
  mp4: "video",
  webm: "video",
  mov: "video",
  avi: "video",
  mkv: "video",
};

/**
 * Derives the FileCategory from a file name and optional MIME content type.
 */
export function getFileCategory(filename: string, mimeType?: string | null): FileCategory {
  if (mimeType) {
    const lowerMime = mimeType.toLowerCase();
    if (lowerMime.startsWith("image/")) return "image";
    if (lowerMime === "application/pdf") return "pdf";
    if (lowerMime.startsWith("audio/")) return "audio";
    if (lowerMime.startsWith("video/")) return "video";
    if (lowerMime.startsWith("text/") || lowerMime.includes("json") || lowerMime.includes("javascript")) {
      return "code";
    }
  }

  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex !== -1 && dotIndex < filename.length - 1) {
    const ext = filename.slice(dotIndex + 1).toLowerCase();
    if (EXTENSION_CATEGORY_MAP[ext]) {
      return EXTENSION_CATEGORY_MAP[ext];
    }
  }

  return "generic";
}

/**
 * Checks if a file is supported by the inline file preview engine.
 */
export function isPreviewable(filename: string, mimeType?: string | null): boolean {
  const category = getFileCategory(filename, mimeType);
  return category === "image" || category === "pdf" || category === "code" || category === "document";
}

/**
 * Returns a color class associated with a file category for UI badges and icons.
 */
export function getFileCategoryColor(category: FileCategory): {
  iconColor: string;
  badgeBg: string;
  badgeText: string;
} {
  switch (category) {
    case "folder":
      return { iconColor: "text-amber-400", badgeBg: "bg-amber-950/40", badgeText: "text-amber-300" };
    case "image":
      return { iconColor: "text-pink-400", badgeBg: "bg-pink-950/40", badgeText: "text-pink-300" };
    case "pdf":
      return { iconColor: "text-red-400", badgeBg: "bg-red-950/40", badgeText: "text-red-300" };
    case "document":
      return { iconColor: "text-blue-400", badgeBg: "bg-blue-950/40", badgeText: "text-blue-300" };
    case "spreadsheet":
      return { iconColor: "text-emerald-400", badgeBg: "bg-emerald-950/40", badgeText: "text-emerald-300" };
    case "presentation":
      return { iconColor: "text-orange-400", badgeBg: "bg-orange-950/40", badgeText: "text-orange-300" };
    case "code":
      return { iconColor: "text-cyan-400", badgeBg: "bg-cyan-950/40", badgeText: "text-cyan-300" };
    case "archive":
      return { iconColor: "text-amber-500", badgeBg: "bg-amber-950/40", badgeText: "text-amber-300" };
    case "audio":
      return { iconColor: "text-purple-400", badgeBg: "bg-purple-950/40", badgeText: "text-purple-300" };
    case "video":
      return { iconColor: "text-indigo-400", badgeBg: "bg-indigo-950/40", badgeText: "text-indigo-300" };
    default:
      return { iconColor: "text-slate-400", badgeBg: "bg-slate-900/60", badgeText: "text-slate-300" };
  }
}
