import React from "react";
import { useNavigate } from "react-router-dom";
import {
  MoreVertical,
  Download,
  Eye,
  Star,
  Trash2,
  Share2,
  History,
  Edit2,
  ExternalLink,
} from "lucide-react";
import { FileResponse } from "../../types";
import { FileIcon } from "./FileIcon";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownItem } from "../ui/dropdown";
import { formatBytes, formatRelativeTime, truncateFilename } from "../../utils/formatters";
import { isPreviewable } from "../../utils/fileTypes";
import { cn } from "../../lib/utils";
import { usePermissions } from "../../hooks/usePermissions";
import { ROUTES } from "../../app/config/constants";

export interface FileCardProps {
  file: FileResponse;
  isSelected?: boolean;
  isStarred?: boolean;
  onSelect?: (id: string, event?: React.MouseEvent) => void;
  onPreview?: (file: FileResponse) => void;
  onDownload?: (file: FileResponse) => void;
  onStar?: (file: FileResponse) => void;
  onRename?: (file: FileResponse) => void;
  onShare?: (file: FileResponse) => void;
  onVersions?: (file: FileResponse) => void;
  onTrash?: (file: FileResponse) => void;
}

export function FileCard({
  file,
  isSelected = false,
  isStarred = false,
  onSelect,
  onPreview,
  onDownload,
  onStar,
  onRename,
  onShare,
  onVersions,
  onTrash,
}: FileCardProps) {
  const navigate = useNavigate();
  const { canEdit, canDelete, canShare, canDownload: canDl } = usePermissions();
  const previewPossible = isPreviewable(file.name, file.mime_type);

  const actions: DropdownItem[] = [
    {
      id: "view",
      label: "Open in Viewer",
      icon: <ExternalLink className="w-4 h-4 text-primary" />,
      onClick: () => navigate(ROUTES.FILE_VIEWER(file.id)),
    },
    ...(previewPossible && onPreview
      ? [
          {
            id: "preview",
            label: "Quick Preview",
            icon: <Eye className="w-4 h-4" />,
            onClick: () => onPreview(file),
          },
        ]
      : []),
    ...(onDownload && canDl(file)
      ? [
          {
            id: "download",
            label: "Download",
            icon: <Download className="w-4 h-4" />,
            onClick: () => onDownload(file),
          },
        ]
      : []),
    ...(onStar
      ? [
          {
            id: "star",
            label: isStarred ? "Unstar" : "Star",
            icon: <Star className={cn("w-4 h-4", isStarred ? "text-amber-400 fill-amber-400" : "")} />,
            onClick: () => onStar(file),
          },
        ]
      : []),
    ...(onShare && canShare(file)
      ? [
          {
            id: "share",
            label: "Share",
            icon: <Share2 className="w-4 h-4" />,
            onClick: () => onShare(file),
          },
        ]
      : []),
    ...(onVersions
      ? [
          {
            id: "versions",
            label: "Version History",
            icon: <History className="w-4 h-4" />,
            onClick: () => onVersions(file),
          },
        ]
      : []),
    ...(onRename && canEdit(file)
      ? [
          {
            id: "rename",
            label: "Rename",
            icon: <Edit2 className="w-4 h-4" />,
            onClick: () => onRename(file),
          },
        ]
      : []),
    ...(onTrash && canDelete(file)
      ? [
          { id: "divider-trash", label: "", divider: true, onClick: () => {} },
          {
            id: "trash",
            label: "Move to Trash",
            icon: <Trash2 className="w-4 h-4" />,
            destructive: true,
            onClick: () => onTrash(file),
          },
        ]
      : []),
  ];

  return (
    <div
      onClick={(e) => onSelect?.(file.id, e)}
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-md cursor-pointer select-none",
        isSelected && "border-primary bg-primary/5 ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect?.(file.id)}
            aria-label={`Select ${file.name}`}
          />
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isStarred && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
          <DropdownMenu
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label={`Actions for ${file.name}`}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            }
            items={actions}
          />
        </div>
      </div>

      <div
        className="flex flex-col items-center justify-center py-6 text-center group-hover:opacity-95 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          navigate(ROUTES.FILE_VIEWER(file.id));
        }}
      >
        <FileIcon filename={file.name} mimeType={file.mime_type} size="xl" className="mb-3 transition-transform group-hover:scale-105 duration-200" />
        <span className="font-medium text-xs sm:text-sm text-foreground truncate max-w-[130px] sm:max-w-[150px] title-name group-hover:text-primary transition-colors">
          {truncateFilename(file.name, 22)}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2.5">
        <span>{formatBytes(file.size_bytes)}</span>
        <span>{formatRelativeTime(file.updated_at || file.created_at)}</span>
      </div>
    </div>
  );
}
