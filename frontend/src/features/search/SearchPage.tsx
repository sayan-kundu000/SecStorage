import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search as SearchIcon, Filter, RefreshCw } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { DocumentTitle } from "../../components/common/DocumentTitle";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { FileListSkeleton, FileGridSkeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
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
import { searchService } from "../../services";
import { QUERY_KEYS, ROUTES, STORAGE_KEYS } from "../../app/config/constants";
import { useDebounce } from "../../hooks/useDebounce";
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

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const navigate = useNavigate();

  const [query, setQuery] = useState(initialQ);
  const debouncedQuery = useDebounce(query, 350);

  const [resourceType, setResourceType] = useState<"all" | "file" | "folder">("all");
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "size">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode] = useState<"list" | "grid">(
    () => (localStorage.getItem(STORAGE_KEYS.VIEW_MODE) as "list" | "grid") || "list"
  );

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

  const effectiveQuery = debouncedQuery.trim() || "*";

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.SEARCH.QUERY({
      q: effectiveQuery,
      type: resourceType,
      sortBy,
      sortOrder,
    }),
    queryFn: ({ signal }) =>
      searchService.searchResources(
        {
          q: effectiveQuery,
          type: resourceType,
          sort_by: sortBy,
          sort_order: sortOrder,
          limit: 50,
        },
        signal
      ),
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
        .filter((i) => i.type === "folder" && !i.trashed)
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
        .filter((i) => i.type === "file" && !i.trashed)
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
          isStarred: !!i.starred,
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

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setSearchParams(val.trim() ? { q: val.trim() } : {});
  };

  const firstMoveTarget = moveTargets[0];

  return (
    <>
      <DocumentTitle title={`Search: ${query || "All resources"}`} />
      <div className="space-y-6 text-left" onClick={() => setContextMenu(null)}>
        <PageHeader
          title="Search & Discovery"
          description="Find files and folders across your drive by name, metadata, format, or creation date"
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

        {/* Search Input & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1">
            <Input
              placeholder="Type filename or keyword..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              startIcon={<SearchIcon className="w-4 h-4" />}
              autoFocus
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 border border-border/80 bg-card px-2.5 py-1.5 rounded-lg text-xs shadow-sm">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value as "all" | "file" | "folder")}
                className="bg-transparent border-0 text-foreground font-medium focus:outline-none cursor-pointer text-xs"
                aria-label="Filter resource type"
              >
                <option value="all" className="bg-popover text-popover-foreground">All Types</option>
                <option value="file" className="bg-popover text-popover-foreground">Files Only</option>
                <option value="folder" className="bg-popover text-popover-foreground">Folders Only</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 border border-border/80 bg-card px-2.5 py-1.5 rounded-lg text-xs shadow-sm">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "createdAt" | "size")}
                className="bg-transparent border-0 text-foreground font-medium focus:outline-none cursor-pointer text-xs"
                aria-label="Sort by attribute"
              >
                <option value="name" className="bg-popover text-popover-foreground">Sort: Name</option>
                <option value="createdAt" className="bg-popover text-popover-foreground">Sort: Date</option>
                <option value="size" className="bg-popover text-popover-foreground">Sort: Size</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              className="h-8 text-xs font-mono shadow-sm"
            >
              {sortOrder.toUpperCase()}
            </Button>
          </div>
        </div>

        {/* Selection Bar for Bulk Actions */}
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
                isStarred: !!i.starred,
              }));
            setDeleteTargets(selectedItems);
          }}
        />

        {/* Search Results Render */}
        {isLoading ? (
          viewMode === "list" ? <FileListSkeleton rows={6} /> : <FileGridSkeleton cards={8} />
        ) : isError ? (
          <ErrorState error={error} title="Search failed" onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<SearchIcon className="w-10 h-10 text-muted-foreground/60" />}
            title="No matching resources"
            description={
              query.trim()
                ? `No files or folders matched your search "${query}". Try adjusting your keywords or filters.`
                : "No files or folders found matching the selected search criteria."
            }
          />
        ) : viewMode === "list" ? (
          <FileList hasItems={items.length > 0}>
            {folders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                isSelected={selection.isSelected(folder.id)}
                onSelect={(id, e) => selection.handleRowClick(id, items.map((i) => i.id), e)}
                onOpen={(f) => navigate(ROUTES.FOLDER_DETAIL(f.id))}
                onStar={() => toggleStar({ id: folder.id, isFolder: true, isStarred: false })}
                onRename={(f) => setRenameTarget({ id: f.id, name: f.name, isFolder: true })}
                onShare={(f) => setShareTarget({ id: f.id, name: f.name, isFolder: true })}
                onTrash={(f) => setDeleteTargets([{ id: f.id, name: f.name, isFolder: true }])}
              />
            ))}
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                isSelected={selection.isSelected(file.id)}
                onSelect={(id, e) => selection.handleRowClick(id, items.map((i) => i.id), e)}
                onPreview={(f) => setPreviewFile(f)}
                onStar={() => toggleStar({ id: file.id, isFolder: false, isStarred: false })}
                onDownload={() => downloadFile(file.id, file.name)}
                onRename={(f) => setRenameTarget({ id: f.id, name: f.name, mimeType: f.mime_type, sizeBytes: f.size_bytes, isFolder: false })}
                onShare={(f) => setShareTarget({ id: f.id, name: f.name, mimeType: f.mime_type, sizeBytes: f.size_bytes, isFolder: false })}
                onTrash={(f) => setDeleteTargets([{ id: f.id, name: f.name, mimeType: f.mime_type, sizeBytes: f.size_bytes, isFolder: false }])}
              />
            ))}
          </FileList>
        ) : (
          <FileGrid>
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                isSelected={selection.isSelected(folder.id)}
                onSelect={(id, e) => selection.handleRowClick(id, items.map((i) => i.id), e)}
                onOpen={(f) => navigate(ROUTES.FOLDER_DETAIL(f.id))}
                onStar={() => toggleStar({ id: folder.id, isFolder: true, isStarred: false })}
                onRename={(f) => setRenameTarget({ id: f.id, name: f.name, isFolder: true })}
                onShare={(f) => setShareTarget({ id: f.id, name: f.name, isFolder: true })}
                onTrash={(f) => setDeleteTargets([{ id: f.id, name: f.name, isFolder: true }])}
              />
            ))}
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                isSelected={selection.isSelected(file.id)}
                onSelect={(id, e) => selection.handleRowClick(id, items.map((i) => i.id), e)}
                onPreview={(f) => setPreviewFile(f)}
                onStar={() => toggleStar({ id: file.id, isFolder: false, isStarred: false })}
                onDownload={() => downloadFile(file.id, file.name)}
                onRename={(f) => setRenameTarget({ id: f.id, name: f.name, mimeType: f.mime_type, sizeBytes: f.size_bytes, isFolder: false })}
                onShare={(f) => setShareTarget({ id: f.id, name: f.name, mimeType: f.mime_type, sizeBytes: f.size_bytes, isFolder: false })}
                onTrash={(f) => setDeleteTargets([{ id: f.id, name: f.name, mimeType: f.mime_type, sizeBytes: f.size_bytes, isFolder: false }])}
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
          onStar={() =>
            contextMenu &&
            toggleStar({
              id: contextMenu.target.id,
              isFolder: contextMenu.target.isFolder,
              isStarred: !!contextMenu.target.isStarred,
            })
          }
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

export default SearchPage;
