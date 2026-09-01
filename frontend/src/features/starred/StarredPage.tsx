import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { DocumentTitle } from "../../components/common/DocumentTitle";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { FileListSkeleton, FileGridSkeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { FileList } from "../../components/files/FileList";
import { FileGrid } from "../../components/files/FileGrid";
import { FileRow } from "../../components/files/FileRow";
import { FolderRow } from "../../components/files/FolderRow";
import { FileCard } from "../../components/files/FileCard";
import { FolderCard } from "../../components/files/FolderCard";
import { SelectionBar } from "../../components/files/SelectionBar";
import { MoveDialog } from "../../components/files/MoveDialog";
import { ShareDialog } from "../../components/files/ShareDialog";
import { starsService } from "../../services";
import { QUERY_KEYS, ROUTES, STORAGE_KEYS } from "../../app/config/constants";
import { useSelection } from "../../hooks/useSelection";
import { useFileActions } from "../files/hooks/useFileActions";
import { useFilePreview } from "../files/hooks/useFilePreview";
import { useKeyboardShortcuts } from "../files/hooks/useKeyboardShortcuts";
import { FileContextMenu } from "../files/components/FileContextMenu";
import { PreviewModal } from "../files/components/PreviewModal";
import { RenameDialog } from "../files/components/RenameDialog";
import { DeleteDialog } from "../files/components/DeleteDialog";
import { FileDetails } from "../files/components/FileDetails";
import { FileResponse, FolderResponse } from "../../types";
import { TargetResource } from "../files/types/actions";

export function StarredPage() {
  const navigate = useNavigate();
  const [viewMode] = useState<"list" | "grid">(
    () => (localStorage.getItem(STORAGE_KEYS.VIEW_MODE) as "list" | "grid") || "list"
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.STARRED.LIST(),
    queryFn: () => starsService.listStarred(undefined, 50),
  });

  // Dialog & Menu Target States
  const [renameTarget, setRenameTarget] = useState<TargetResource | null>(null);
  const [moveTargets, setMoveTargets] = useState<TargetResource[]>([]);
  const [deleteTargets, setDeleteTargets] = useState<TargetResource[]>([]);
  const [shareTarget, setShareTarget] = useState<TargetResource | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<TargetResource | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; target: TargetResource } | null>(null);

  // Preview State
  const [previewFile, setPreviewFile] = useState<FileResponse | null>(null);
  const { preview, isLoading: isPreviewLoading, loadPreview, clearPreview } = useFilePreview({
    fileId: previewFile?.id,
    isOpen: !!previewFile,
  });

  const {
    renameResource,
    isRenaming,
    moveResource,
    isMoving,
    toggleStar,
    trashResource,
    isTrashing,
    shareResource,
    isSharing,
    downloadFile,
  } = useFileActions();

  const items = data?.items || [];

  const folders: FolderResponse[] = useMemo(
    () =>
      items
        .filter((i) => i.type === "folder")
        .map((f) => ({
          id: f.id,
          user_id: "",
          name: f.name,
          parent_id: f.folder_id || null,
          created_at: f.created_at,
          updated_at: f.updated_at,
        })),
    [items]
  );

  const files: FileResponse[] = useMemo(
    () =>
      items
        .filter((i) => i.type === "file")
        .map((f) => ({
          id: f.id,
          user_id: "",
          folder_id: f.folder_id || null,
          name: f.name,
          mime_type: f.mime_type || "application/octet-stream",
          size_bytes: f.size_bytes || 0,
          storage_key: "",
          status: "READY",
          created_at: f.created_at,
          updated_at: f.updated_at,
        })),
    [items]
  );

  const selection = useSelection();

  // Keyboard Productivity Shortcuts
  useKeyboardShortcuts({
    onDelete: () => {
      const selectedItems: TargetResource[] = items
        .filter((i) => selection.isSelected(i.id))
        .map((i) => ({
          id: i.id,
          name: i.name,
          mimeType: i.mime_type ?? undefined,
          sizeBytes: i.size_bytes ?? undefined,
          isFolder: i.type === "folder",
          isStarred: true,
        }));
      if (selectedItems.length > 0) {
        setDeleteTargets(selectedItems);
      }
    },
    onEscape: () => {
      selection.clear();
      setContextMenu(null);
    },
    onSelectAll: () => {
      selection.selectAll(items.map((i) => i.id));
    },
  });

  const firstMoveTarget = moveTargets[0];

  return (
    <>
      <DocumentTitle title="Starred" />
      <div className="space-y-6 text-left" onClick={() => setContextMenu(null)}>
        <PageHeader
          title="Starred"
          description="Quick access to important files and folders marked as favorites"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-8 gap-1.5 text-xs shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
          }
        />

        {/* Selection Bar */}
        <SelectionBar
          selectedCount={selection.selectedCount}
          onClear={selection.clear}
          onDownload={() => {
            const selectedFiles = items.filter((i) => selection.isSelected(i.id) && i.type === "file");
            selectedFiles.forEach((f) => downloadFile(f.id, f.name));
          }}
          onTrash={() => {
            const selectedItems: TargetResource[] = items
              .filter((i) => selection.isSelected(i.id))
              .map((i) => ({
                id: i.id,
                name: i.name,
                mimeType: i.mime_type ?? undefined,
                sizeBytes: i.size_bytes ?? undefined,
                isFolder: i.type === "folder",
                isStarred: true,
              }));
            setDeleteTargets(selectedItems);
          }}
        />

        {isLoading ? (
          viewMode === "list" ? <FileListSkeleton rows={6} /> : <FileGridSkeleton cards={8} />
        ) : isError ? (
          <ErrorState error={error} title="Failed to load starred items" onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Star className="w-10 h-10 text-amber-400/60" />}
            title="No starred items"
            description="Star files and folders in your drive for fast and convenient access here."
            actionLabel="Browse Files"
            onAction={() => navigate(ROUTES.FILES)}
          />
        ) : viewMode === "list" ? (
          <FileList hasItems={items.length > 0}>
            {folders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                isStarred={true}
                isSelected={selection.isSelected(folder.id)}
                onSelect={(id, e) => selection.handleRowClick(id, items.map((i) => i.id), e)}
                onOpen={(f) => navigate(ROUTES.FOLDER_DETAIL(f.id))}
                onStar={() => toggleStar({ id: folder.id, isFolder: true, isStarred: true })}
                onRename={(f) => setRenameTarget({ id: f.id, name: f.name, isFolder: true, isStarred: true })}
                onShare={(f) => setShareTarget({ id: f.id, name: f.name, isFolder: true, isStarred: true })}
                onTrash={(f) => setDeleteTargets([{ id: f.id, name: f.name, isFolder: true, isStarred: true }])}
              />
            ))}
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                isStarred={true}
                isSelected={selection.isSelected(file.id)}
                onSelect={(id, e) => selection.handleRowClick(id, items.map((i) => i.id), e)}
                onPreview={(f) => setPreviewFile(f)}
                onStar={() => toggleStar({ id: file.id, isFolder: false, isStarred: true })}
                onDownload={() => downloadFile(file.id, file.name)}
                onRename={(f) => setRenameTarget({ id: f.id, name: f.name, mimeType: f.mime_type, sizeBytes: f.size_bytes, isFolder: false, isStarred: true })}
                onShare={(f) => setShareTarget({ id: f.id, name: f.name, mimeType: f.mime_type, sizeBytes: f.size_bytes, isFolder: false, isStarred: true })}
                onTrash={(f) => setDeleteTargets([{ id: f.id, name: f.name, mimeType: f.mime_type, sizeBytes: f.size_bytes, isFolder: false, isStarred: true }])}
              />
            ))}
          </FileList>
        ) : (
          <FileGrid>
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                isStarred={true}
                isSelected={selection.isSelected(folder.id)}
                onSelect={(id, e) => selection.handleRowClick(id, items.map((i) => i.id), e)}
                onOpen={(f) => navigate(ROUTES.FOLDER_DETAIL(f.id))}
                onStar={() => toggleStar({ id: folder.id, isFolder: true, isStarred: true })}
                onRename={(f) => setRenameTarget({ id: f.id, name: f.name, isFolder: true, isStarred: true })}
                onShare={(f) => setShareTarget({ id: f.id, name: f.name, isFolder: true, isStarred: true })}
                onTrash={(f) => setDeleteTargets([{ id: f.id, name: f.name, isFolder: true, isStarred: true }])}
              />
            ))}
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                isStarred={true}
                isSelected={selection.isSelected(file.id)}
                onSelect={(id, e) => selection.handleRowClick(id, items.map((i) => i.id), e)}
                onPreview={(f) => setPreviewFile(f)}
                onStar={() => toggleStar({ id: file.id, isFolder: false, isStarred: true })}
                onDownload={() => downloadFile(file.id, file.name)}
                onRename={(f) => setRenameTarget({ id: f.id, name: f.name, mimeType: f.mime_type, sizeBytes: f.size_bytes, isFolder: false, isStarred: true })}
                onShare={(f) => setShareTarget({ id: f.id, name: f.name, mimeType: f.mime_type, sizeBytes: f.size_bytes, isFolder: false, isStarred: true })}
                onTrash={(f) => setDeleteTargets([{ id: f.id, name: f.name, mimeType: f.mime_type, sizeBytes: f.size_bytes, isFolder: false, isStarred: true }])}
              />
            ))}
          </FileGrid>
        )}

        {/* Desktop Context Menu */}
        <FileContextMenu
          isOpen={!!contextMenu}
          x={contextMenu?.x || 0}
          y={contextMenu?.y || 0}
          target={contextMenu?.target || null}
          onClose={() => setContextMenu(null)}
          onOpen={() => {
            if (contextMenu?.target.isFolder) {
              navigate(ROUTES.FOLDER_DETAIL(contextMenu.target.id));
            }
          }}
          onPreview={() => {
            if (contextMenu?.target && !contextMenu.target.isFolder) {
              const f = files.find((item) => item.id === contextMenu.target.id);
              if (f) setPreviewFile(f);
            }
          }}
          onDownload={() => contextMenu && downloadFile(contextMenu.target.id, contextMenu.target.name)}
          onRename={() => contextMenu && setRenameTarget(contextMenu.target)}
          onMove={() => contextMenu && setMoveTargets([contextMenu.target])}
          onStar={() => contextMenu && toggleStar({ id: contextMenu.target.id, isFolder: contextMenu.target.isFolder, isStarred: true })}
          onShare={() => contextMenu && setShareTarget(contextMenu.target)}
          onDetails={() => contextMenu && setDetailsTarget(contextMenu.target)}
          onTrash={() => contextMenu && setDeleteTargets([contextMenu.target])}
        />

        {/* Preview Modal */}
        <PreviewModal
          isOpen={!!previewFile}
          onClose={() => {
            setPreviewFile(null);
            clearPreview();
          }}
          file={previewFile}
          preview={preview}
          isLoading={isPreviewLoading}
          onDownload={() => previewFile && downloadFile(previewFile.id, previewFile.name)}
          onRetry={() => previewFile && loadPreview(previewFile.id)}
        />

        {/* Rename Dialog */}
        <RenameDialog
          isOpen={!!renameTarget}
          onClose={() => setRenameTarget(null)}
          targetName={renameTarget?.name || ""}
          isFolder={!!renameTarget?.isFolder}
          isLoading={isRenaming}
          onRename={async (newName) => {
            if (renameTarget) {
              await renameResource({ id: renameTarget.id, name: newName, isFolder: renameTarget.isFolder });
              setRenameTarget(null);
            }
          }}
        />

        {/* Move Dialog */}
        <MoveDialog
          isOpen={moveTargets.length > 0}
          onClose={() => setMoveTargets([])}
          targetName={firstMoveTarget?.name || "Selected items"}
          targetId={firstMoveTarget?.id || ""}
          isFolder={!!firstMoveTarget?.isFolder}
          isLoading={isMoving}
          onMove={async (destinationFolderId) => {
            for (const target of moveTargets) {
              await moveResource({ id: target.id, destinationFolderId, isFolder: target.isFolder });
            }
            setMoveTargets([]);
            selection.clear();
          }}
        />

        {/* Delete Dialog */}
        <DeleteDialog
          isOpen={deleteTargets.length > 0}
          onClose={() => setDeleteTargets([])}
          targetName={deleteTargets[0]?.name || "Selected items"}
          itemCount={deleteTargets.length}
          isLoading={isTrashing}
          onConfirm={async () => {
            for (const target of deleteTargets) {
              await trashResource({ id: target.id, isFolder: target.isFolder });
            }
            setDeleteTargets([]);
            selection.clear();
          }}
        />

        {/* Share Dialog */}
        <ShareDialog
          isOpen={!!shareTarget}
          onClose={() => setShareTarget(null)}
          targetName={shareTarget?.name || ""}
          targetId={shareTarget?.id || ""}
          isFolder={!!shareTarget?.isFolder}
          isLoading={isSharing}
          onShare={async (granteeEmail, permission) => {
            if (shareTarget) {
              await shareResource({
                granteeEmail,
                permission,
                fileId: shareTarget.isFolder ? undefined : shareTarget.id,
                folderId: shareTarget.isFolder ? shareTarget.id : undefined,
              });
            }
          }}
        />

        {/* File Details Dialog */}
        <Dialog
          isOpen={!!detailsTarget}
          onClose={() => setDetailsTarget(null)}
          title="File Details"
        >
          {detailsTarget && <FileDetails resource={detailsTarget} />}
        </Dialog>
      </div>
    </>
  );
}

export default StarredPage;
