import { X, Download, Star, Trash2, RotateCcw, Share2 } from "lucide-react";
import { Button } from "../ui/button";

export interface SelectionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDownload?: () => void;
  onStar?: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
  onShare?: () => void;
  isTrashView?: boolean;
}

export function SelectionBar({
  selectedCount,
  onClear,
  onDownload,
  onStar,
  onTrash,
  onRestore,
  onShare,
  isTrashView = false,
}: SelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-card/95 backdrop-blur-md border border-border px-4 py-2.5 rounded-full shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-2 border-r border-border pr-3">
        <span className="text-xs font-semibold text-foreground bg-primary/20 text-primary px-2.5 py-0.5 rounded-full">
          {selectedCount}
        </span>
        <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
          {selectedCount === 1 ? "item selected" : "items selected"}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {isTrashView ? (
          <>
            {onRestore && (
              <Button variant="outline" size="sm" onClick={onRestore} className="h-8 gap-1.5 text-xs">
                <RotateCcw className="w-3.5 h-3.5" />
                Restore
              </Button>
            )}
            {onTrash && (
              <Button variant="destructive" size="sm" onClick={onTrash} className="h-8 gap-1.5 text-xs">
                <Trash2 className="w-3.5 h-3.5" />
                Delete Forever
              </Button>
            )}
          </>
        ) : (
          <>
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload} className="h-8 gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            )}
            {onStar && (
              <Button variant="outline" size="sm" onClick={onStar} className="h-8 gap-1.5 text-xs">
                <Star className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Star</span>
              </Button>
            )}
            {selectedCount === 1 && onShare && (
              <Button variant="outline" size="sm" onClick={onShare} className="h-8 gap-1.5 text-xs">
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            )}
            {onTrash && (
              <Button variant="destructive" size="sm" onClick={onTrash} className="h-8 gap-1.5 text-xs">
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Trash</span>
              </Button>
            )}
          </>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onClear}
        className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full ml-1"
        aria-label="Clear selection"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
