import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Folder, FolderOpen, ArrowRight } from "lucide-react";
import { Dialog } from "../ui/dialog";
import { Button } from "../ui/button";
import { searchService } from "../../services";
import { QUERY_KEYS } from "../../app/config/constants";

export interface MoveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetId: string;
  isFolder: boolean;
  onMove: (destinationFolderId: string | null) => Promise<void>;
  isLoading?: boolean;
}

export function MoveDialog({
  isOpen,
  onClose,
  targetName,
  targetId,
  isFolder,
  onMove,
  isLoading = false,
}: MoveDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Fetch available folders in storage root
  const { data: folderData, isLoading: isLoadingFolders } = useQuery({
    queryKey: QUERY_KEYS.SEARCH.QUERY({ type: "folder" }),
    queryFn: () =>
      searchService.searchResources({
        q: "*",
        type: "folder",
        limit: 100,
      }),
    enabled: isOpen,
  });

  const availableFolders = (folderData?.items || []).filter(
    (item) => item.id !== targetId // Prevent moving a folder into itself
  );

  const handleConfirmMove = async () => {
    await onMove(selectedFolderId);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Move "${targetName}"`}
      description={`Select a destination directory for this ${isFolder ? "Folder" : "File"}`}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            isLoading={isLoading}
            onClick={handleConfirmMove}
            className="gap-1.5"
          >
            <span>Move Here</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </>
      }
    >
      <div className="space-y-3 py-2 text-left">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Destination
        </div>

        <div className="max-h-60 overflow-y-auto border border-border/80 rounded-lg p-2 space-y-1 bg-background/50">
          {/* Root Choice */}
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`w-full flex items-center gap-2.5 p-2 rounded-md text-xs transition-colors ${
              selectedFolderId === null
                ? "bg-primary/10 border border-primary/30 text-primary font-medium"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <FolderOpen className="w-4 h-4 text-primary shrink-0" />
            <span>My Drive (Root Storage)</span>
          </button>

          {isLoadingFolders ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              Loading available directories...
            </div>
          ) : availableFolders.length > 0 ? (
            availableFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setSelectedFolderId(folder.id)}
                className={`w-full flex items-center gap-2.5 p-2 rounded-md text-xs transition-colors ${
                  selectedFolderId === folder.id
                    ? "bg-primary/10 border border-primary/30 text-primary font-medium"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{folder.name}</span>
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-muted-foreground">
              No secondary folders created yet.
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
