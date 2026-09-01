import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { getErrorMessage } from "../../utils/errors";

export interface ErrorStateProps {
  error?: unknown;
  title?: string;
  description?: string;
  onRetry?: () => void;
  onBack?: () => void;
  className?: string;
}

export function ErrorState({
  error,
  title = "Failed to load content",
  description,
  onRetry,
  onBack,
  className = "",
}: ErrorStateProps) {
  const message = description || (error ? getErrorMessage(error) : "An error occurred while communicating with the server.");

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-destructive/20 bg-destructive/5 max-w-lg mx-auto my-8 space-y-4 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive">
        <AlertCircle className="w-7 h-7" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{message}</p>
      </div>

      {(onRetry || onBack) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {onRetry && (
            <Button variant="default" size="sm" onClick={onRetry} className="gap-1.5 shadow-sm">
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </Button>
          )}
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Go Back
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
