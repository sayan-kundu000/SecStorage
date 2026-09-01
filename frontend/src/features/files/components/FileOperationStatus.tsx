import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { FileOperation } from "../types/operations";

export interface FileOperationStatusProps {
  operations: FileOperation[];
  className?: string;
}

export function FileOperationStatus({ operations, className = "" }: FileOperationStatusProps) {
  if (operations.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`} role="status" aria-live="polite">
      {operations.map((op) => (
        <div
          key={op.id}
          className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card/90 shadow-sm text-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {op.status === "in_progress" && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
            {op.status === "completed" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {op.status === "failed" && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}

            <div className="truncate min-w-0">
              <span className="font-medium text-foreground truncate">{op.itemName}</span>
              <span className="text-muted-foreground ml-2">({op.type})</span>
            </div>
          </div>

          <div className="text-[11px] font-medium text-muted-foreground shrink-0 ml-3">
            {op.status === "in_progress" && (op.progress !== undefined ? `${op.progress}%` : "Processing...")}
            {op.status === "completed" && <span className="text-emerald-400 font-semibold">Done</span>}
            {op.status === "failed" && <span className="text-destructive font-semibold">Failed</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
