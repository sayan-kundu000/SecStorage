import React, { useRef } from "react";
import { Plus, Upload } from "lucide-react";
import { Button, ButtonProps } from "../../../components/ui/button";

export interface UploadButtonProps extends Omit<ButtonProps, "onClick"> {
  onFilesSelected?: (files: File[]) => void;
  multiple?: boolean;
  label?: string;
  icon?: React.ReactNode;
}

export function UploadButton({
  onFilesSelected,
  multiple = true,
  label = "Upload",
  icon = <Plus className="w-4 h-4" />,
  variant = "default",
  size = "sm",
  className = "",
  disabled = false,
  ...props
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onFilesSelected) {
      onFilesSelected(Array.from(files));
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        aria-label="Upload file input"
      />
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`gap-1.5 shadow-sm ${className}`}
        aria-label={label}
        {...props}
      >
        {icon || <Upload className="w-4 h-4" />}
        <span>{label}</span>
      </Button>
    </>
  );
}
