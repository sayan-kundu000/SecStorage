import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button, ButtonProps } from "../../../components/ui/button";
import { downloadApi } from "../api/download";
import { notify } from "../../../components/ui/toast";
import { normalizeFileError } from "../utils/errorNormalization";

export interface DownloadButtonProps extends Omit<ButtonProps, "onClick" | "onError"> {
  fileId: string;
  filename?: string;
  label?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function DownloadButton({
  fileId,
  filename,
  label = "Download",
  variant = "outline",
  size = "sm",
  className = "",
  disabled = false,
  onSuccess,
  onError,
  ...props
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading || disabled) return;

    setIsDownloading(true);
    try {
      await downloadApi.triggerSecureDownload(fileId, filename);
      notify.success("Download started");
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const normalized = normalizeFileError(err);
      notify.error("Download failed", normalized.message);
      if (onError) onError(normalized.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || isDownloading}
      onClick={handleDownload}
      className={`gap-1.5 ${className}`}
      aria-label={label}
      {...props}
    >
      {isDownloading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      <span>{label}</span>
    </Button>
  );
}
