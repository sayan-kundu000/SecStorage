import { useEffect, useRef } from "react";
import {
  FolderOpen,
  Eye,
  Download,
  Edit2,
  Star,
  FolderInput,
  UserPlus,
  Trash2,
} from "lucide-react";

export interface FileContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  onClose: () => void;
  isFolder: boolean;
  isStarred?: boolean;
  onOpen?: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  onRename?: () => void;
  onStar?: () => void;
  onMove?: () => void;
  onShare?: () => void;
  onTrash?: () => void;
}

export function FileContextMenu({
  isOpen,
  x,
  y,
  onClose,
  isFolder,
  isStarred = false,
  onOpen,
  onPreview,
  onDownload,
  onRename,
  onStar,
  onMove,
  onShare,
  onTrash,
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      window.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      style={{ top: `${y}px`, left: `${x}px` }}
      className="fixed z-50 min-w-[170px] bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-xl py-1 text-xs text-foreground animate-in fade-in-50 zoom-in-95"
      role="menu"
      aria-label="Context Menu"
    >
      {isFolder ? (
        onOpen && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpen();
              onClose();
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left font-medium transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-primary" />
            <span>Open Folder</span>
          </button>
        )
      ) : (
        <>
          {onPreview && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onPreview();
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left font-medium transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-primary" />
              <span>Preview</span>
            </button>
          )}
          {onDownload && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onDownload();
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download</span>
            </button>
          )}
        </>
      )}

      <div className="my-1 border-t border-border/60" />

      {onStar && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onStar();
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left transition-colors"
        >
          <Star
            className={`w-3.5 h-3.5 ${
              isStarred ? "text-amber-400 fill-amber-400" : "text-amber-400"
            }`}
          />
          <span>{isStarred ? "Remove Star" : "Add to Starred"}</span>
        </button>
      )}

      {onRename && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onRename();
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Rename</span>
        </button>
      )}

      {onMove && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onMove();
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left transition-colors"
        >
          <FolderInput className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Move to...</span>
        </button>
      )}

      {onShare && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onShare();
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5 text-purple-400" />
          <span>Share</span>
        </button>
      )}

      <div className="my-1 border-t border-border/60" />

      {onTrash && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onTrash();
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-destructive/10 text-destructive hover:text-destructive text-left font-medium transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Move to Trash</span>
        </button>
      )}
    </div>
  );
}
