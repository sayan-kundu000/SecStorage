import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export interface LoadingSpinnerProps {
  size?: "sm" | "default" | "lg" | "xl";
  className?: string;
  label?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = "default",
  className = "",
  label,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizes = {
    sm: "w-4 h-4",
    default: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  const spinner = (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizes[size])} />
      {label && <p className="text-xs text-muted-foreground font-medium animate-pulse">{label}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}
