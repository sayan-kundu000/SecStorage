import React, { useRef, useState } from "react";
import { UploadCloud, AlertCircle } from "lucide-react";
import { formatBytes } from "../../../utils/formatters";
import { MAX_UPLOAD_SIZE_BYTES } from "../../../app/config/constants";
import { validateFileForUpload } from "../utils/fileValidation";
import { cn } from "../../../lib/utils";

export interface UploadDropzoneProps {
  onFilesSelected?: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  hintText?: string;
}

export function UploadDropzone({
  onFilesSelected,
  disabled = false,
  className = "",
  hintText = `or click to browse from your device (up to ${formatBytes(MAX_UPLOAD_SIZE_BYTES)} per file)`,
}: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    let firstError: string | null = null;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validation = validateFileForUpload(file);
      if (!validation.isValid) {
        if (!firstError) firstError = validation.error || "File invalid";
        continue;
      }
      validFiles.push(file);
    }

    if (firstError) {
      setValidationError(firstError);
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
    <div className={cn("space-y-3", className)}>
      <div
        tabIndex={disabled ? -1 : 0}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          isDragActive
            ? "border-primary bg-primary/10 scale-[0.99]"
            : "border-border/80 bg-card/30 hover:border-border hover:bg-card/50",
          disabled && "pointer-events-none opacity-50"
        )}
        aria-label="Upload drag and drop zone"
        role="button"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
          aria-hidden="true"
        />

        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 shadow-inner">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h4 className="text-sm font-semibold text-foreground">
          {isDragActive ? "Drop files to upload" : "Drag and drop files here"}
        </h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">{hintText}</p>
      </div>

      {validationError && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}
