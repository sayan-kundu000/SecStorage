import { Loader2, CheckCircle2, AlertCircle, X, RotateCcw, Ban } from "lucide-react";
import { UploadTask } from "../types/operations";
import { formatBytes } from "../../../utils/formatters";
import { Button } from "../../../components/ui/button";

export interface UploadItemProps {
  task: UploadTask;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function UploadItem({ task, onCancel, onRetry, onRemove }: UploadItemProps) {
  const isUploading = task.status === "uploading";
  const isQueued = task.status === "queued";
  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";
  const isCancelled = task.status === "cancelled";

  return (
    <div className="flex flex-col p-3 rounded-xl border border-border/60 bg-card/60 text-xs space-y-2 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {isUploading && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
          {isQueued && <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" title="Queued" />}
          {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {isFailed && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
          {isCancelled && <Ban className="w-4 h-4 text-muted-foreground shrink-0" />}

          <div className="truncate min-w-0 flex-1">
            <p className="font-medium text-foreground truncate">{task.filename}</p>
            <p className="text-[10px] text-muted-foreground">{formatBytes(task.sizeBytes)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isUploading && (
            <span className="text-[11px] font-mono font-semibold text-primary">{task.progress}%</span>
          )}

          {isUploading && onCancel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onCancel(task.id)}
              title="Cancel upload"
              aria-label={`Cancel upload for ${task.filename}`}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}

          {isFailed && onRetry && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary hover:text-primary/80"
              onClick={() => onRetry(task.id)}
              title="Retry upload"
              aria-label={`Retry upload for ${task.filename}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}

          {(isCompleted || isFailed || isCancelled) && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => onRemove(task.id)}
              title="Remove from queue"
              aria-label={`Remove ${task.filename} from queue`}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Real Progress Bar */}
      {isUploading && (
        <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-200"
            style={{ width: `${task.progress}%` }}
            role="progressbar"
            aria-valuenow={task.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      {/* Error detail */}
      {isFailed && task.error && (
        <p className="text-[10px] text-destructive font-medium truncate">{task.error}</p>
      )}
    </div>
  );
}
