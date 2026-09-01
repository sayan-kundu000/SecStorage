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
  Link,
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

export interface FileRowProps {
  file: FileResponse;
  isSelected?: boolean;
  isStarred?: boolean;
  onSelect?: (id: string, event?: React.MouseEvent) => void;
  onPreview?: (file: FileResponse) => void;
  onDownload?: (file: FileResponse) => void;
  onStar?: (file: FileResponse) => void;
  onRename?: (file: FileResponse) => void;
  onShare?: (file: FileResponse) => void;
  onPublicLink?: (file: FileResponse) => void;
  onVersions?: (file: FileResponse) => void;
  onTrash?: (file: FileResponse) => void;
}

export function FileRow({
  file,
  isSelected = false,
  isStarred = false,
  onSelect,
  onPreview,
  onDownload,
  onStar,
  onRename,
  onShare,
  onPublicLink,
  onVersions,
  onTrash,
}: FileRowProps) {
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
            icon: (
              <Star
                className={cn("w-4 h-4", isStarred ? "text-amber-400 fill-amber-400" : "")}
              />
            ),
            onClick: () => onStar(file),
          },
        ]
      : []),
    ...(onShare && canShare(file)
      ? [
          {
            id: "share",
            label: "Share with User",
            icon: <Share2 className="w-4 h-4" />,
            onClick: () => onShare(file),
          },
        ]
      : []),
    ...(onPublicLink && canShare(file)
      ? [
          {
            id: "public-link",
            label: "Public Link",
            icon: <Link className="w-4 h-4" />,
            onClick: () => onPublicLink(file),
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
    <tr
      data-state={isSelected ? "selected" : undefined}
      onClick={(e) => onSelect?.(file.id, e)}
      className={cn(
        "group border-b border-border/50 text-sm transition-colors hover:bg-muted/40 cursor-pointer select-none",
        isSelected && "bg-primary/10 hover:bg-primary/15"
      )}
    >
      <td className="w-10 p-3 text-center" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect?.(file.id)}
          aria-label={`Select ${file.name}`}
        />
      </td>

      <td className="p-3">
        <div className="flex items-center gap-3">
          <FileIcon filename={file.name} mimeType={file.mime_type} />
          <span
            className="font-medium text-foreground truncate max-w-[180px] sm:max-w-xs md:max-w-md hover:underline hover:text-primary transition-colors cursor-pointer"
            title={file.name}
            onClick={(e) => {
              e.stopPropagation();
              navigate(ROUTES.FILE_VIEWER(file.id));
            }}
          >
            {truncateFilename(file.name, 45)}
          </span>
          {isStarred && (
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
          )}
        </div>
      </td>

      <td className="p-3 text-muted-foreground whitespace-nowrap hidden sm:table-cell">
        {formatBytes(file.size_bytes)}
      </td>

      <td className="p-3 text-muted-foreground whitespace-nowrap hidden md:table-cell">
        {formatRelativeTime(file.updated_at || file.created_at)}
      </td>

      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground group-hover:text-foreground"
              aria-label={`Actions for ${file.name}`}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          }
          items={actions}
        />
      </td>
    </tr>
  );
}
