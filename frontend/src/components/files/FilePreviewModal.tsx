import { Download, FileWarning } from "lucide-react";
import { PreviewResponse, FileResponse } from "../../types";
import { Dialog } from "../ui/dialog";
import { Button } from "../ui/button";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { FileIcon } from "./FileIcon";
import { formatBytes } from "../../utils/formatters";

export interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file?: FileResponse | null;
  preview?: PreviewResponse | null;
  isLoading?: boolean;
  onDownload?: () => void;
}

export function FilePreviewModal({
  isOpen,
  onClose,
  file,
  preview,
  isLoading = false,
  onDownload,
}: FilePreviewModalProps) {
  if (!file) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2.5 truncate">
          <FileIcon filename={file.name} mimeType={file.mime_type} />
          <span className="truncate">{file.name}</span>
        </div>
      }
      description={`${formatBytes(file.size_bytes)} • ${file.mime_type || "Unknown format"}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-muted-foreground">
            {preview?.preview_type ? `Preview mode: ${preview.preview_type}` : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            {onDownload && (
              <Button variant="default" size="sm" onClick={onDownload} className="gap-1.5 shadow-sm">
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="min-h-[300px] max-h-[65vh] flex items-center justify-center bg-black/20 rounded-lg p-2 overflow-auto">
        {isLoading ? (
          <LoadingSpinner size="lg" label="Generating secure preview..." />
        ) : preview?.preview_type === "IMAGE" && preview.preview_url ? (
          <img
            src={preview.preview_url}
            alt={file.name}
            className="max-h-[60vh] max-w-full object-contain rounded select-none shadow-md"
          />
        ) : preview?.preview_type === "PDF" && preview.preview_url ? (
          <iframe
            src={`${preview.preview_url}#toolbar=0`}
            title={file.name}
            className="w-full h-[60vh] rounded border-0 bg-white"
          />
        ) : preview?.preview_type === "TEXT" && preview.text_content !== undefined ? (
          <div className="w-full h-full text-left space-y-2">
            <pre className="p-4 bg-muted/40 rounded-lg text-xs font-mono overflow-auto max-h-[55vh] text-foreground border border-border whitespace-pre-wrap">
              {preview.text_content}
            </pre>
            {preview.is_truncated && (
              <p className="text-[11px] text-amber-400">
                Notice: Large file text was truncated for inline preview performance.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border flex items-center justify-center text-muted-foreground">
              <FileWarning className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">No inline preview available</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              {preview?.message ||
                "This file format does not support inline browser preview. You can download the file to view it on your device."}
            </p>
            {onDownload && (
              <Button variant="default" size="sm" onClick={onDownload} className="gap-2 mt-2">
                <Download className="w-4 h-4" />
                Download File
              </Button>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
