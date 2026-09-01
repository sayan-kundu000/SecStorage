import React, { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { formatBytes } from "../../utils/formatters";
import { MAX_UPLOAD_SIZE_BYTES } from "../../app/config/constants";
import { cn } from "../../lib/utils";

export interface QueuedUploadItem {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "success" | "error";
  error?: string;
}

export interface FileUploadZoneProps {
  onFilesSelected?: (files: File[]) => void;
  queue?: QueuedUploadItem[];
  onRemoveQueueItem?: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

export function FileUploadZone({
  onFilesSelected,
  queue = [],
  onRemoveQueueItem,
  disabled = false,
  className = "",
}: FileUploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || disabled) return;

    setValidationError(null);
    const validFiles: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        setValidationError(`"${file.name}" exceeds maximum allowed file size of ${formatBytes(MAX_UPLOAD_SIZE_BYTES)}.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0 && onFilesSelected) {
      onFilesSelected(validFiles);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center",
          isDragActive
            ? "border-primary bg-primary/10 scale-[0.99]"
            : "border-border/80 bg-card/30 hover:border-border hover:bg-card/50",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 shadow-inner">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h4 className="text-sm font-semibold text-foreground">
          {isDragActive ? "Drop files to upload" : "Drag and drop files here"}
        </h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          or click to browse from your device (up to {formatBytes(MAX_UPLOAD_SIZE_BYTES)} per file)
        </p>
      </div>

      {validationError && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Uploading Queue Display */}
      {queue.length > 0 && (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <h5 className="text-xs font-semibold text-foreground pb-1">Upload Queue ({queue.length})</h5>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-background/60 text-xs gap-3"
              >
                <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                  {item.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
                  {item.status === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {item.status === "error" && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                  {item.status === "queued" && <div className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" />}

                  <div className="truncate flex-1">
                    <p className="font-medium text-foreground truncate">{item.file.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatBytes(item.file.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.status === "uploading" && (
                    <span className="text-[10px] font-semibold text-primary">{item.progress}%</span>
                  )}
                  {item.status === "error" && (
                    <span className="text-[10px] font-semibold text-destructive">{item.error || "Failed"}</span>
                  )}
                  {onRemoveQueueItem && (item.status === "success" || item.status === "error") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => onRemoveQueueItem(item.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
