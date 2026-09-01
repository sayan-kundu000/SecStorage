import { describe, it, expect } from "vitest";
import {
  validateFileForUpload,
  sanitizeFilename,
  getFileCategory,
} from "../../src/features/files/utils/fileValidation";

describe("fileValidation utils", () => {
  it("validates safe file under max upload size", () => {
    const file = new File(["test content"], "document.pdf", { type: "application/pdf" });
    const res = validateFileForUpload(file);
    expect(res.isValid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it("rejects file exceeding max upload size limit", () => {
    const file = {
      name: "giant_archive.iso",
      size: 600 * 1024 * 1024, // 600 MB > 500 MB limit
      type: "application/x-iso9660-image",
    } as File;

    const res = validateFileForUpload(file);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("exceeds the maximum allowed upload size");
  });

  it("sanitizes dangerous HTML markup and control characters from filenames", () => {
    const dangerous = "<script>alert('xss')</script>document.pdf";
    const sanitized = sanitizeFilename(dangerous);
    expect(sanitized).toBe("scriptalert(xss)/scriptdocument.pdf");
    expect(sanitized).not.toContain("<");
    expect(sanitized).not.toContain(">");
  });

  it("categorizes file types correctly based on MIME type and extension", () => {
    expect(getFileCategory("image/png", "avatar.png")).toBe("image");
    expect(getFileCategory("application/pdf", "report.pdf")).toBe("pdf");
    expect(getFileCategory("text/plain", "notes.txt")).toBe("text");
    expect(getFileCategory("video/mp4", "movie.mp4")).toBe("video");
    expect(getFileCategory("audio/mpeg", "song.mp3")).toBe("audio");
    expect(getFileCategory("application/zip", "archive.zip")).toBe("archive");
    expect(getFileCategory("application/octet-stream", "script.ts")).toBe("code");
    expect(getFileCategory("unknown/type", "data.xyz")).toBe("unknown");
  });
});
