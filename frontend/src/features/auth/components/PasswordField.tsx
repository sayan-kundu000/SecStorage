import React, { useState, forwardRef, useId } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { cn } from "../../../lib/utils";

export interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ className, label = "Password", error, helperText, disabled, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const [showPassword, setShowPassword] = useState(false);

    const toggleVisibility = () => {
      if (!disabled) {
        setShowPassword((prev) => !prev);
      }
    };

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <Lock className="w-4 h-4" />
          </div>

          <input
            ref={ref}
            id={inputId}
            type={showPassword ? "text" : "password"}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              "flex h-9 w-full rounded-lg border border-input bg-background pl-9 pr-10 py-1 text-xs text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            {...props}
          />

          <button
            type="button"
            tabIndex={0}
            onClick={toggleVisibility}
            disabled={disabled}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error ? (
          <p id={errorId} className="text-[11px] font-medium text-destructive animate-in fade-in-50">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-[11px] text-muted-foreground">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

PasswordField.displayName = "PasswordField";
