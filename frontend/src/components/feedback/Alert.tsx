import * as React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "destructive";
  title?: string;
  children: React.ReactNode;
}

export function Alert({ variant = "info", title, children, className, ...props }: AlertProps) {
  const icons = {
    info: <Info className="h-4 w-4 text-blue-400" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
    destructive: <AlertCircle className="h-4 w-4 text-red-400" />,
  };

  const variantStyles = {
    info: "border-blue-500/20 bg-blue-950/20 text-blue-200",
    success: "border-emerald-500/20 bg-emerald-950/20 text-emerald-200",
    warning: "border-amber-500/20 bg-amber-950/20 text-amber-200",
    destructive: "border-red-500/20 bg-red-950/20 text-red-200",
  };

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4 text-sm flex gap-3 text-left items-start",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <div className="mt-0.5 shrink-0">{icons[variant]}</div>
      <div className="space-y-1">
        {title && <h5 className="font-semibold leading-none tracking-tight">{title}</h5>}
        <div className="text-xs opacity-90 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
