import { describe, it, expect } from "vitest";
import { formatBytes, formatDate, formatRelativeTime, truncateFilename } from "../src/utils/formatters";
import { getFileCategory, isPreviewable } from "../src/utils/fileTypes";

describe("Formatting Utilities", () => {
  describe("formatBytes", () => {
    it("handles 0 and falsy values", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(null)).toBe("0 B");
      expect(formatBytes(undefined)).toBe("0 B");
    });

    it("formats binary units accurately", () => {
      expect(formatBytes(500)).toBe("500 B");
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1024 * 1024)).toBe("1 MB");
      expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
    });
  });

  describe("formatDate and formatRelativeTime", () => {
    it("handles invalid or empty dates gracefully", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDate("invalid-date")).toBe("—");
      expect(formatRelativeTime(null)).toBe("—");
      expect(formatRelativeTime("invalid-date")).toBe("—");
    });

    it("formats recent relative time correctly", () => {
      const nowIso = new Date().toISOString();
      expect(formatRelativeTime(nowIso)).toBe("just now");
    });
  });

  describe("truncateFilename", () => {
    it("preserves short filenames", () => {
      expect(truncateFilename("document.pdf", 20)).toBe("document.pdf");
    });

    it("preserves file extension while truncating long names", () => {
      const longName = "very_long_confidential_report_quarter_four_financials.pdf";
      const truncated = truncateFilename(longName, 25);
      expect(truncated.endsWith(".pdf")).toBe(true);
      expect(truncated.length).toBeLessThanOrEqual(25);
    });
  });

  describe("fileTypes classification", () => {
    it("classifies file extensions correctly", () => {
      expect(getFileCategory("photo.png")).toBe("image");
      expect(getFileCategory("report.pdf")).toBe("pdf");
      expect(getFileCategory("data.csv")).toBe("spreadsheet");
      expect(getFileCategory("script.ts")).toBe("code");
      expect(getFileCategory("archive.zip")).toBe("archive");
      expect(getFileCategory("audio.mp3")).toBe("audio");
      expect(getFileCategory("video.mp4")).toBe("video");
      expect(getFileCategory("unknown.xyz")).toBe("generic");
    });

    it("identifies previewable formats", () => {
      expect(isPreviewable("photo.jpg")).toBe(true);
      expect(isPreviewable("doc.pdf")).toBe(true);
      expect(isPreviewable("code.ts")).toBe(true);
      expect(isPreviewable("archive.zip")).toBe(false);
    });
  });
});
