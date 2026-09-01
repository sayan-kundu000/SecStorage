import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FilePreview } from "../../src/features/files/components/FilePreview";

describe("FilePreview component", () => {
  it("renders loading indicator when isLoading is true", () => {
    render(<FilePreview preview={null} fileId="123" filename="doc.pdf" isLoading={true} />);
    expect(screen.getByText("Preparing file preview...")).toBeInTheDocument();
  });

  it("renders image element when preview_type is IMAGE", () => {
    const previewData = {
      file_id: "123",
      preview_type: "IMAGE",
      mime_type: "image/png",
      preview_url: "https://storage.example.com/sample.png",
      is_truncated: false,
    };

    render(<FilePreview preview={previewData} fileId="123" filename="sample.png" />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://storage.example.com/sample.png");
  });

  it("renders text content when preview_type is TEXT", () => {
    const previewData = {
      file_id: "123",
      preview_type: "TEXT",
      mime_type: "text/plain",
      text_content: "Hello SecStorage file preview!",
      is_truncated: false,
    };

    render(<FilePreview preview={previewData} fileId="123" filename="notes.txt" />);
    expect(screen.getByText("Hello SecStorage file preview!")).toBeInTheDocument();
  });

  it("renders fallback banner for unsupported file types", () => {
    const previewData = {
      file_id: "123",
      preview_type: "UNSUPPORTED",
      mime_type: "application/octet-stream",
      is_truncated: false,
      message: "No preview plugin available.",
    };

    render(<FilePreview preview={previewData} fileId="123" filename="archive.zip" />);
    expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    expect(screen.getByText("Download")).toBeInTheDocument();
  });
});
