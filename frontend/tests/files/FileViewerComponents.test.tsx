import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  ImageViewer,
  PdfViewer,
  TextViewer,
  MediaViewer,
  UnsupportedViewer,
} from "../../src/features/files/components/viewers";

describe("Dedicated Viewer Components", () => {
  describe("ImageViewer", () => {
    it("renders image with zoom and rotate controls", () => {
      render(
        <ImageViewer url="https://example.com/photo.jpg" filename="photo.jpg" />
      );

      const img = screen.getByRole("img");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
      expect(screen.getByText("100%")).toBeInTheDocument();

      // Click Zoom In button
      const zoomInBtn = screen.getByTitle("Zoom In (+)");
      fireEvent.click(zoomInBtn);
      expect(screen.getByText("125%")).toBeInTheDocument();
    });
  });

  describe("PdfViewer", () => {
    it("renders embedded PDF iframe and action buttons", () => {
      const handleDownload = vi.fn();
      render(
        <PdfViewer
          url="https://example.com/doc.pdf"
          filename="doc.pdf"
          onDownload={handleDownload}
        />
      );

      expect(screen.getByText("doc.pdf")).toBeInTheDocument();
      expect(screen.getByText("Open in Tab")).toBeInTheDocument();
      expect(screen.getByText("Download")).toBeInTheDocument();

      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();
      expect(iframe?.getAttribute("src")).toContain("https://example.com/doc.pdf");
    });
  });

  describe("TextViewer", () => {
    it("renders code with line numbers, font sizing, and copy button", () => {
      render(
        <TextViewer
          content={`function add(a, b) {\n  return a + b;\n}`}
          filename="math.ts"
        />
      );

      expect(screen.getByText(/lines/)).toBeInTheDocument();
      expect(screen.getByText("Copy")).toBeInTheDocument();
      expect(screen.getByText(/return a \+ b/)).toBeInTheDocument();
    });

    it("renders CSV in table view mode", () => {
      render(
        <TextViewer
          content={`Name,Age,Role\nAlice,30,Admin\nBob,25,User`}
          filename="users.csv"
        />
      );

      expect(screen.getByText("Table View")).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
  });

  describe("MediaViewer", () => {
    it("renders video player and speed controls", () => {
      render(
        <MediaViewer
          url="https://example.com/clip.mp4"
          filename="clip.mp4"
          type="VIDEO"
        />
      );

      const video = document.querySelector("video");
      expect(video).toBeInTheDocument();
      expect(screen.getByText("Speed:")).toBeInTheDocument();
      expect(screen.getByText("1.5x")).toBeInTheDocument();
    });

    it("renders audio player and track name", () => {
      render(
        <MediaViewer
          url="https://example.com/song.mp3"
          filename="song.mp3"
          type="AUDIO"
        />
      );

      const audio = document.querySelector("audio");
      expect(audio).toBeInTheDocument();
      expect(screen.getByText("song.mp3")).toBeInTheDocument();
      expect(screen.getByText("Audio Recording / Track")).toBeInTheDocument();
    });
  });

  describe("UnsupportedViewer", () => {
    it("renders unsupported format fallback with download button", () => {
      const handleDownload = vi.fn();
      render(
        <UnsupportedViewer
          filename="archive.tar.gz"
          sizeBytes={1048576}
          onDownload={handleDownload}
        />
      );

      expect(screen.getByText("archive.tar.gz")).toBeInTheDocument();
      expect(screen.getByText(/1 MB/)).toBeInTheDocument();
      expect(screen.getByText("Download archive.tar.gz")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Download archive.tar.gz"));
      expect(handleDownload).toHaveBeenCalled();
    });
  });
});
