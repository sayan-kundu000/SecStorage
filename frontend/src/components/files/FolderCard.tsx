import React from "react";
import { MoreVertical, FolderOpen, Star, Trash2, Share2, Edit2 } from "lucide-react";
import { FolderResponse } from "../../types";
import { FileIcon } from "./FileIcon";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownItem } from "../ui/dropdown";
import { formatRelativeTime, truncateFilename } from "../../utils/formatters";
import { cn } from "../../lib/utils";
import { usePermissions } from "../../hooks/usePermissions";

export interface FolderCardProps {
  folder: FolderResponse;
  isSelected?: boolean;
  isStarred?: boolean;
  onSelect?: (id: string, event?: React.MouseEvent) => void;
  onOpen?: (folder: FolderResponse) => void;
  onStar?: (folder: FolderResponse) => void;
  onRename?: (folder: FolderResponse) => void;
  onShare?: (folder: FolderResponse) => void;
  onTrash?: (folder: FolderResponse) => void;
}

export function FolderCard({
  folder,
  isSelected = false,
  isStarred = false,
  onSelect,
  onOpen,
  onStar,
  onRename,
  onShare,
  onTrash,
}: FolderCardProps) {
  const { canEdit, canDelete, canShare } = usePermissions();

  const actions: DropdownItem[] = [
    ...(onOpen
      ? [
          {
            id: "open",
            label: "Open Folder",
            icon: <FolderOpen className="w-4 h-4" />,
            onClick: () => onOpen(folder),
          },
        ]
      : []),
    ...(onStar
      ? [
          {
            id: "star",
            label: isStarred ? "Unstar" : "Star",
            icon: <Star className={cn("w-4 h-4", isStarred ? "text-amber-400 fill-amber-400" : "")} />,
            onClick: () => onStar(folder),
          },
        ]
      : []),
    ...(onShare && canShare(folder)
      ? [
          {
            id: "share",
            label: "Share",
            icon: <Share2 className="w-4 h-4" />,
            onClick: () => onShare(folder),
          },
        ]
      : []),
    ...(onRename && canEdit(folder)
      ? [
          {
            id: "rename",
            label: "Rename",
            icon: <Edit2 className="w-4 h-4" />,
            onClick: () => onRename(folder),
          },
        ]
      : []),
    ...(onTrash && canDelete(folder)
      ? [
          { id: "divider-trash", label: "", divider: true, onClick: () => {} },
          {
            id: "trash",
            label: "Move to Trash",
            icon: <Trash2 className="w-4 h-4" />,
            destructive: true,
            onClick: () => onTrash(folder),
          },
        ]
      : []),
  ];

  return (
    <div
      onClick={(e) => onSelect?.(folder.id, e)}
      onDoubleClick={() => onOpen?.(folder)}
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-md cursor-pointer select-none",
        isSelected && "border-primary bg-primary/5 ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect?.(folder.id)}
            aria-label={`Select folder ${folder.name}`}
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
                aria-label={`Actions for folder ${folder.name}`}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            }
            items={actions}
          />
        </div>
      </div>

      <div
        className="flex flex-col items-center justify-center py-6 text-center"
        onClick={(e) => {
          e.stopPropagation();
          onOpen?.(folder);
        }}
      >
        <FileIcon isFolder={true} size="xl" className="mb-3" />
        <span className="font-medium text-xs sm:text-sm text-foreground truncate max-w-[130px] sm:max-w-[150px]">
          {truncateFilename(folder.name, 22)}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2.5">
        <span>Folder</span>
        <span>{formatRelativeTime(folder.updated_at || folder.created_at)}</span>
      </div>
    </div>
  );
}
