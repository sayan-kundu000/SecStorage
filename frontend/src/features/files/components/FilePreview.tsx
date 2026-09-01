import { useState } from "react";
import { FileText, FileQuestion, AlertCircle, RefreshCw } from "lucide-react";
import { PreviewResponse } from "../../../types";
import { DownloadButton } from "./DownloadButton";
import { Button } from "../../../components/ui/button";

export interface FilePreviewProps {
  preview: PreviewResponse | null;
  fileId: string;
  filename: string;
  isLoading?: boolean;
  onRetry?: () => void;
}

export function FilePreview({
  preview,
  fileId,
  filename,
  isLoading = false,
  onRetry,
}: FilePreviewProps) {
  const [imageError, setImageError] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[300px] text-center space-y-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Preparing file preview...</p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[300px] text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-muted-foreground opacity-60" />
        <p className="text-sm font-semibold text-foreground">No preview available</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </Button>
        )}
      </div>
    );
  }

  const previewType = (preview.preview_type || "").toUpperCase();

  // IMAGE PREVIEW
  if (previewType === "IMAGE" && preview.preview_url && !imageError) {
    return (
      <div className="relative flex items-center justify-center w-full min-h-[350px] max-h-[70vh] bg-black/40 rounded-xl overflow-hidden p-2">
        <img
          src={preview.preview_url}
          alt={filename}
          onError={() => setImageError(true)}
          className="max-h-[68vh] max-w-full object-contain rounded shadow-lg transition-transform duration-200"
        />
      </div>
    );
  }

  // PDF PREVIEW
  if (previewType === "PDF" && preview.preview_url) {
    return (
      <div className="w-full h-[65vh] min-h-[400px] rounded-xl overflow-hidden border border-border bg-card">
        <object
          data={preview.preview_url}
          type="application/pdf"
          className="w-full h-full"
        >
          <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
            <FileText className="w-12 h-12 text-primary opacity-80" />
            <p className="text-sm font-medium text-foreground">
              Inline PDF viewer is not supported on this browser.
            </p>
            <DownloadButton fileId={fileId} filename={filename} />
          </div>
        </object>
      </div>
    );
  }

  // TEXT PREVIEW
  if (previewType === "TEXT" && preview.text_content !== undefined) {
    return (
      <div className="w-full max-h-[65vh] overflow-y-auto p-4 rounded-xl border border-border bg-muted/30 font-mono text-xs text-foreground whitespace-pre-wrap break-words">
        {preview.is_truncated && (
          <div className="mb-3 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md text-[11px]">
            Preview truncated for performance. Download file to view complete content.
          </div>
        )}
        <pre className="font-mono text-xs">{preview.text_content || "(Empty file)"}</pre>
      </div>
    );
  }

  // VIDEO PREVIEW
  if (previewType === "VIDEO" && preview.preview_url) {
    return (
      <div className="flex items-center justify-center w-full min-h-[350px] max-h-[65vh] bg-black/60 rounded-xl overflow-hidden">
        <video
          controls
          src={preview.preview_url}
          className="max-h-[60vh] max-w-full rounded"
        >
          Your browser does not support HTML5 video playback.
        </video>
      </div>
    );
  }

  // AUDIO PREVIEW
  if (previewType === "AUDIO" && preview.preview_url) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[250px] bg-card border border-border rounded-xl space-y-4">
        <audio controls src={preview.preview_url} className="w-full max-w-md">
          Your browser does not support HTML5 audio playback.
        </audio>
      </div>
    );
  }

  // UNSUPPORTED OR FALLBACK PREVIEW
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[320px] border border-border/80 bg-card/40 rounded-xl text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
        <FileQuestion className="w-8 h-8" />
      </div>
      <div>
        <h4 className="text-base font-semibold text-foreground">Preview unavailable</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          {preview.message || `No direct preview plugin available for "${filename}".`}
        </p>
      </div>
      <DownloadButton fileId={fileId} filename={filename} variant="default" size="default" />
    </div>
  );
}
