import { useState } from "react";
import { ChevronUp, ChevronDown, X, Upload } from "lucide-react";
import { UploadTask } from "../types/operations";
import { UploadItem } from "./UploadItem";
import { Button } from "../../../components/ui/button";

export interface UploadQueueProps {
  queue: UploadTask[];
  onCancelTask?: (id: string) => void;
  onRetryTask?: (id: string) => void;
  onRemoveTask?: (id: string) => void;
  onClearCompleted?: () => void;
}

export function UploadQueue({
  queue,
  onCancelTask,
  onRetryTask,
  onRemoveTask,
  onClearCompleted,
}: UploadQueueProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (queue.length === 0) return null;

  const activeCount = queue.filter((t) => t.status === "uploading" || t.status === "queued").length;
  const completedCount = queue.filter((t) => t.status === "completed").length;
  const failedCount = queue.filter((t) => t.status === "failed").length;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-200"
      role="region"
      aria-label="Upload Queue Status"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-semibold text-foreground">
            {activeCount > 0
              ? `Uploading ${activeCount} file${activeCount > 1 ? "s" : ""}`
              : `Uploads completed (${completedCount}/${queue.length})`}
          </h4>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMinimized((prev) => !prev)}
            aria-label={isMinimized ? "Expand upload queue" : "Minimize upload queue"}
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
          {onClearCompleted && (completedCount > 0 || failedCount > 0) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={onClearCompleted}
              title="Dismiss completed"
              aria-label="Dismiss completed uploads"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Queue Body */}
      {!isMinimized && (
        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
          {queue.map((task) => (
            <UploadItem
              key={task.id}
              task={task}
              onCancel={onCancelTask}
              onRetry={onRetryTask}
              onRemove={onRemoveTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
