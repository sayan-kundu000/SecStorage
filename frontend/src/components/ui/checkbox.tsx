import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, label, disabled, id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || (label ? generatedId : undefined);

    const handleClick = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked);
      }
    };

    return (
      <div className="inline-flex items-center space-x-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          disabled={disabled}
          id={checkboxId}
          onClick={handleClick}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary/50 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors flex items-center justify-center",
            checked ? "bg-primary text-primary-foreground border-primary" : "bg-transparent",
            className
          )}
        >
          {checked && <Check className="h-3 w-3 stroke-[3]" />}
        </button>
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        {label && (
          <label
            htmlFor={checkboxId}
            className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none text-foreground"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";
