import { Download, FileQuestion, ShieldCheck } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { formatBytes } from "../../../../utils/formatters";

export interface UnsupportedViewerProps {
  filename: string;
  mimeType?: string;
  sizeBytes?: number;
  message?: string;
  onDownload?: () => void;
}

export function UnsupportedViewer({
  filename,
  mimeType = "application/octet-stream",
  sizeBytes = 0,
  message,
  onDownload,
}: UnsupportedViewerProps) {
  const ext = filename.split(".").pop()?.toUpperCase() || "BIN";

  return (
    <div className="relative w-full h-[75vh] min-h-[450px] flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-md p-8 rounded-3xl bg-card border border-border/80 shadow-2xl flex flex-col items-center text-center space-y-6 backdrop-blur-md">
        {/* Large Format Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground shadow-inner">
            <FileQuestion className="w-10 h-10" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-mono font-bold text-[10px] shadow-sm uppercase">
            .{ext}
          </span>
        </div>

        {/* File Information */}
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground truncate max-w-xs">{filename}</h3>
          <p className="text-xs text-muted-foreground">
            {formatBytes(sizeBytes)} • {mimeType}
          </p>
        </div>

        <p className="text-xs text-muted-foreground/90 bg-muted/30 p-3 rounded-xl border border-border/40 max-w-sm">
          {message || "No inline preview renderer is available for this file type. You can download the file to inspect or execute it locally."}
        </p>

        <div className="flex items-center gap-2 text-[11px] text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Stored securely with checksum verification</span>
        </div>

        {onDownload && (
          <Button
            variant="default"
            size="default"
            onClick={onDownload}
            className="w-full gap-2 shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Download {filename}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
