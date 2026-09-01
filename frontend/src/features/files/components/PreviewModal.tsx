import { useState } from "react";
import { X, Download, Info } from "lucide-react";
import { FileResponse, PreviewResponse } from "../../../types";
import { FilePreview } from "./FilePreview";
import { FileDetails } from "./FileDetails";
import { Button } from "../../../components/ui/button";

export interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileResponse | null;
  preview: PreviewResponse | null;
  isLoading?: boolean;
  onDownload?: () => void;
  onRetry?: () => void;
}

export function PreviewModal({
  isOpen,
  onClose,
  file,
  preview,
  isLoading = false,
  onDownload,
  onRetry,
}: PreviewModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen || !file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div className="relative flex flex-col w-full max-w-5xl max-h-[90vh] bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Header Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-background/50">
          <div className="truncate pr-4 min-w-0">
            <h3 id="preview-modal-title" className="text-base font-semibold text-foreground truncate">
              {file.name}
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {file.mime_type} • {file.size_bytes ? `${Math.round(file.size_bytes / 1024)} KB` : "0 KB"}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
                className="gap-1.5 text-xs"
                aria-label="Download file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            )}

            <Button
              variant={showDetails ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setShowDetails((prev) => !prev)}
              aria-label="Toggle file details panel"
              title="File Information"
            >
              <Info className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close preview dialog"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content & Optional Sidebar Panel */}
        <div className="flex flex-1 overflow-hidden min-h-[400px]">
          {/* Main Preview Container */}
          <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center bg-background/30">
            <FilePreview
              preview={preview}
              fileId={file.id}
              filename={file.name}
              isLoading={isLoading}
              onRetry={onRetry}
            />
          </div>

          {/* Collapsible Details Drawer */}
          {showDetails && (
            <div className="w-80 border-l border-border/80 bg-card p-5 overflow-y-auto hidden md:block">
              <FileDetails
                resource={{
                  id: file.id,
                  name: file.name,
                  isFolder: false,
                  sizeBytes: file.size_bytes,
                  mimeType: file.mime_type,
                  folderId: file.folder_id,
                  createdAt: file.created_at,
                  updatedAt: file.updated_at,
                  ownerId: file.user_id,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
