import { useState, useRef } from "react";
import { MoreVertical } from "lucide-react";
import { TargetResource } from "../types/actions";
import { FileContextMenu } from "./FileContextMenu";
import { Button } from "../../../components/ui/button";

export interface FileActionMenuProps {
  target: TargetResource;
  onOpen?: () => void;
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

export function FileActionMenu({
  target,
  onOpen,
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
}: FileActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ x: rect.left, y: rect.bottom + 4 });
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={`Actions for ${target.name}`}
        title="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </Button>

      <FileContextMenu
        isOpen={isOpen}
        x={menuPos.x}
        y={menuPos.y}
        onClose={() => setIsOpen(false)}
        target={target}
        onOpen={onOpen}
        onPreview={onPreview}
        onDownload={onDownload}
        onRename={onRename}
        onMove={onMove}
        onStar={onStar}
        onShare={onShare}
        onDetails={onDetails}
        onTrash={onTrash}
        onRestore={onRestore}
        onPurge={onPurge}
      />
    </>
  );
}
