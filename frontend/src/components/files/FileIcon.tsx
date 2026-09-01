import {
  Folder,
  Image,
  FileText,
  FileSpreadsheet,
  Presentation,
  Code2,
  Archive,
  Music,
  Video,
  File,
} from "lucide-react";
import { FileCategory, getFileCategory, getFileCategoryColor } from "../../utils/fileTypes";
import { cn } from "../../lib/utils";

export interface FileIconProps {
  filename?: string;
  mimeType?: string | null;
  category?: FileCategory;
  isFolder?: boolean;
  size?: "sm" | "default" | "lg" | "xl";
  className?: string;
}

export function FileIcon({
  filename = "",
  mimeType,
  category,
  isFolder = false,
  size = "default",
  className = "",
}: FileIconProps) {
  const resolvedCategory = isFolder ? "folder" : category || getFileCategory(filename, mimeType);
  const { iconColor } = getFileCategoryColor(resolvedCategory);

  const sizeClasses = {
    sm: "w-4 h-4",
    default: "w-5 h-5",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  const iconClass = cn(sizeClasses[size], iconColor, className);

  switch (resolvedCategory) {
    case "folder":
      return <Folder className={iconClass} fill="currentColor" fillOpacity={0.2} />;
    case "image":
      return <Image className={iconClass} />;
    case "pdf":
    case "document":
      return <FileText className={iconClass} />;
    case "spreadsheet":
      return <FileSpreadsheet className={iconClass} />;
    case "presentation":
      return <Presentation className={iconClass} />;
    case "code":
      return <Code2 className={iconClass} />;
    case "archive":
      return <Archive className={iconClass} />;
    case "audio":
      return <Music className={iconClass} />;
    case "video":
      return <Video className={iconClass} />;
    default:
      return <File className={iconClass} />;
  }
}
