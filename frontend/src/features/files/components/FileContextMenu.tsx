import { useEffect, useRef } from "react";
import {
  FolderOpen,
  Eye,
  Download,
  Edit2,
  FolderInput,
  Star,
  Share2,
  Info,
  Trash2,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { getActionAvailability, TargetResource } from "../types/actions";

export interface FileContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  onClose: () => void;
  target: TargetResource | null;
  onOpen?: () => void;
  onView?: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onStar?: () => void;
  onShare?: () => void;
  onDetails?: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
  onPurge?: () => void;
}

export function FileContextMenu({
  isOpen,
  x,
  y,
  onClose,
  target,
  onOpen,
  onView,
  onPreview,
  onDownload,
  onRename,
  onMove,
  onStar,
  onShare,
  onDetails,
  onTrash,
  onRestore,
  onPurge,
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !target) return null;

  const availability = getActionAvailability(target);

  // Position adjustments to prevent overflowing viewport edges
  const menuWidth = 220;
  const menuHeight = 320;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-56 rounded-xl border border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-1.5 text-xs text-foreground animate-in fade-in zoom-in-95 duration-100"
      role="menu"
      aria-orientation="vertical"
      aria-label="Context Menu"
    >
      {/* Target Header */}
      <div className="px-2.5 py-1.5 mb-1 border-b border-border/60 text-[11px] font-semibold text-muted-foreground truncate">
        {target.name}
      </div>

      {/* Primary Actions Group */}
      {availability.open && onOpen && (
        <button
          onClick={() => {
            onOpen();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-accent hover:text-accent-foreground font-medium transition-colors"
          role="menuitem"
        >
          <FolderOpen className="w-4 h-4 text-amber-400" />
          <span>Open Folder</span>
        </button>
      )}

      {!target.isFolder && onView && (
        <button
          onClick={() => {
            onView();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-accent hover:text-accent-foreground font-medium transition-colors"
          role="menuitem"
        >
          <ExternalLink className="w-4 h-4 text-primary" />
          <span>Open in Viewer</span>
        </button>
      )}

      {availability.preview && onPreview && (
        <button
          onClick={() => {
            onPreview();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-accent hover:text-accent-foreground font-medium transition-colors"
          role="menuitem"
        >
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span>Quick Preview</span>
        </button>
      )}

      {availability.download && onDownload && (
        <button
          onClick={() => {
            onDownload();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-accent hover:text-accent-foreground font-medium transition-colors"
          role="menuitem"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Download</span>
        </button>
      )}

      {(availability.open || availability.preview || availability.download) && (
        <div className="my-1 border-t border-border/60" />
      )}

      {/* Secondary Actions Group */}
      {availability.rename && onRename && (
        <button
          onClick={() => {
            onRename();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-colors"
          role="menuitem"
        >
          <Edit2 className="w-4 h-4 text-muted-foreground" />
          <span>Rename</span>
        </button>
      )}

      {availability.move && onMove && (
        <button
          onClick={() => {
            onMove();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-colors"
          role="menuitem"
        >
          <FolderInput className="w-4 h-4 text-muted-foreground" />
          <span>Move to...</span>
        </button>
      )}

      {availability.star && onStar && (
        <button
          onClick={() => {
            onStar();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-colors"
          role="menuitem"
        >
          <Star
            className={`w-4 h-4 ${
              target.isStarred ? "text-amber-400 fill-amber-400" : "text-muted-foreground"
            }`}
          />
          <span>{target.isStarred ? "Unstar" : "Add to Starred"}</span>
        </button>
      )}

      {availability.share && onShare && (
        <button
          onClick={() => {
            onShare();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-colors"
          role="menuitem"
        >
          <Share2 className="w-4 h-4 text-muted-foreground" />
          <span>Share</span>
        </button>
      )}

      {availability.details && onDetails && (
        <button
          onClick={() => {
            onDetails();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-colors"
          role="menuitem"
        >
          <Info className="w-4 h-4 text-muted-foreground" />
          <span>File Details</span>
        </button>
      )}

      {/* Restore (Trash mode) */}
      {availability.restore && onRestore && (
        <button
          onClick={() => {
            onRestore();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-accent hover:text-accent-foreground text-emerald-400 font-medium transition-colors"
          role="menuitem"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Restore from Trash</span>
        </button>
      )}

      <div className="my-1 border-t border-border/60" />

      {/* Destructive Actions Group */}
      {availability.trash && onTrash && (
        <button
          onClick={() => {
            onTrash();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-destructive/10 text-destructive font-medium transition-colors"
          role="menuitem"
        >
          <Trash2 className="w-4 h-4" />
          <span>Move to Trash</span>
        </button>
      )}

      {availability.purge && onPurge && (
        <button
          onClick={() => {
            onPurge();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-destructive/10 text-destructive font-medium transition-colors"
          role="menuitem"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Delete Permanently</span>
        </button>
      )}
    </div>
  );
}
