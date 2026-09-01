import React from "react";
import { MoreVertical, FolderOpen, Star, Trash2, Share2, Edit2, Link } from "lucide-react";
import { FolderResponse } from "../../types";
import { FileIcon } from "./FileIcon";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownItem } from "../ui/dropdown";
import { formatRelativeTime, truncateFilename } from "../../utils/formatters";
import { cn } from "../../lib/utils";
import { usePermissions } from "../../hooks/usePermissions";

export interface FolderRowProps {
  folder: FolderResponse;
  isSelected?: boolean;
  isStarred?: boolean;
  onSelect?: (id: string, event?: React.MouseEvent) => void;
  onOpen?: (folder: FolderResponse) => void;
  onStar?: (folder: FolderResponse) => void;
  onRename?: (folder: FolderResponse) => void;
  onShare?: (folder: FolderResponse) => void;
  onPublicLink?: (folder: FolderResponse) => void;
  onTrash?: (folder: FolderResponse) => void;
}

export function FolderRow({
  folder,
  isSelected = false,
  isStarred = false,
  onSelect,
  onOpen,
  onStar,
  onRename,
  onShare,
  onPublicLink,
  onTrash,
}: FolderRowProps) {
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
            icon: (
              <Star
                className={cn("w-4 h-4", isStarred ? "text-amber-400 fill-amber-400" : "")}
              />
            ),
            onClick: () => onStar(folder),
          },
        ]
      : []),
    ...(onShare && canShare(folder)
      ? [
          {
            id: "share",
            label: "Share with User",
            icon: <Share2 className="w-4 h-4" />,
            onClick: () => onShare(folder),
          },
        ]
      : []),
    ...(onPublicLink && canShare(folder)
      ? [
          {
            id: "public-link",
            label: "Public Link",
            icon: <Link className="w-4 h-4" />,
            onClick: () => onPublicLink(folder),
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
    <tr
      data-state={isSelected ? "selected" : undefined}
      onClick={(e) => onSelect?.(folder.id, e)}
      className={cn(
        "group border-b border-border/50 text-sm transition-colors hover:bg-muted/40 cursor-pointer select-none",
        isSelected && "bg-primary/10 hover:bg-primary/15"
      )}
    >
      <td className="w-10 p-3 text-center" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect?.(folder.id)}
          aria-label={`Select folder ${folder.name}`}
        />
      </td>

      <td className="p-3">
        <div
          className="flex items-center gap-3"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onOpen?.(folder);
          }}
        >
          <FileIcon isFolder={true} />
          <span
            className="font-medium text-foreground truncate max-w-[180px] sm:max-w-xs md:max-w-md hover:underline cursor-pointer"
            title={folder.name}
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.(folder);
            }}
          >
            {truncateFilename(folder.name, 45)}
          </span>
          {isStarred && (
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
          )}
        </div>
      </td>

      <td className="p-3 text-muted-foreground whitespace-nowrap hidden sm:table-cell">—</td>

      <td className="p-3 text-muted-foreground whitespace-nowrap hidden md:table-cell">
        {formatRelativeTime(folder.updated_at || folder.created_at)}
      </td>

      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground group-hover:text-foreground"
              aria-label={`Actions for folder ${folder.name}`}
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
