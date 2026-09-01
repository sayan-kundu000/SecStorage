import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  CloudUpload,
  LayoutGrid,
  List,
  FolderPlus,
  RefreshCw,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { DocumentTitle } from "../../components/common/DocumentTitle";
import { Breadcrumbs } from "../../app/layouts/Breadcrumbs";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog } from "../../components/ui/dialog";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { FileListSkeleton, FileGridSkeleton } from "../../components/ui/skeleton";
import { FileList } from "../../components/files/FileList";
import { FileGrid } from "../../components/files/FileGrid";
import { FileRow } from "../../components/files/FileRow";
import { FolderRow } from "../../components/files/FolderRow";
import { FileCard } from "../../components/files/FileCard";
import { FolderCard } from "../../components/files/FolderCard";
import { SelectionBar } from "../../components/files/SelectionBar";
import { MoveDialog } from "../../components/files/MoveDialog";
import { ShareDialog } from "../../components/files/ShareDialog";
import { useSelection } from "../../hooks/useSelection";
import { useDrive } from "../../hooks/useDrive";
import { FileResponse, FolderResponse } from "../../types";
import { ROUTES, STORAGE_KEYS } from "../../app/config/constants";
import {
  useUploadQueue,
  useFileActions,
  useFilePreview,
  useKeyboardShortcuts,
  UploadDropzone,
  UploadQueue,
  PreviewModal,
  FileContextMenu,
  RenameDialog,
  DeleteDialog,
  TargetResource,
} from "./index";

export interface FilesPageProps {
  folderId?: string;
}

export function FilesPage({ folderId: propFolderId }: FilesPageProps) {
  const { folderId: routeFolderId } = useParams<{ folderId?: string }>();
  const activeFolderId = propFolderId || routeFolderId || null;
  const navigate = useNavigate();

  // Sort & Filter state
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "updatedAt" | "size">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterType, setFilterType] = useState<string>("all");

  // View Mode: grid or list
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
      return stored === "grid" ? "grid" : "list";
    } catch {
      return "list";
    }
  });

  const toggleViewMode = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
  };

  // Centralized Drive Hook
  const {
    currentFolder,
    items,
    isLoading,
    isError,
    error,
    refetch,
    createFolder,
    isCreatingFolder,
  } = useDrive({
    folderId: activeFolderId,
    sortBy,
    sortOrder,
    filterType,
  });

  // Feature File Hooks
  const { queue, addFiles, cancelUpload, retryUpload, removeTask, clearCompleted } = useUploadQueue();

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

  // Selection hook
  const {
    selectedArray,
    selectedCount,
    isSelected,
    selectAll,
    clear,
    handleRowClick,
  } = useSelection();

  // Dialog States
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string; isFolder: boolean } | null>(null);

  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{ id: string; name: string; isFolder: boolean } | null>(null);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; name: string; isFolder: boolean } | null>(null);

  const [isTrashConfirmOpen, setIsTrashConfirmOpen] = useState(false);
  const [trashTarget, setTrashTarget] = useState<{ id: string; name: string; isFolder: boolean } | null>(null);

  // File Preview Hook
  const [previewFile, setPreviewFile] = useState<FileResponse | null>(null);
  const { preview, isLoading: isPreviewLoading, loadPreview } = useFilePreview({
    fileId: previewFile?.id,
    isOpen: !!previewFile,
  });

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    target: TargetResource | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    target: null,
  });

  // Filter items into files and folders
  const folders: FolderResponse[] = items
    .filter((item) => item.type === "folder" && !item.trashed)
    .map((item) => ({
      id: item.id,
      user_id: "",
      name: item.name,
      parent_id: item.folder_id || null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

  const files: FileResponse[] = items
    .filter((item) => item.type === "file" && !item.trashed)
    .map((item) => ({
      id: item.id,
      user_id: "",
      folder_id: item.folder_id || null,
      name: item.name,
      mime_type: item.mime_type || "application/octet-stream",
      size_bytes: item.size_bytes || 0,
      storage_key: "",
      status: "READY",
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

  const allResourceIds = [...folders.map((f) => f.id), ...files.map((f) => f.id)];
  const isAllSelected = allResourceIds.length > 0 && selectedCount === allResourceIds.length;

  // Keyboard Shortcuts Hook
  useKeyboardShortcuts({
    onEnter: () => {
      if (selectedArray.length === 1) {
        const selectedId = selectedArray[0];
        const targetFolder = folders.find((f) => f.id === selectedId);
        if (targetFolder) {
          handleOpenFolder(targetFolder);
          return;
        }
        const targetFile = files.find((f) => f.id === selectedId);
        if (targetFile) {
          navigate(ROUTES.FILE_VIEWER(targetFile.id));
        }
      }
    },
    onDelete: () => {
      if (selectedCount > 0) {
        if (selectedArray.length === 1) {
          const item = items.find((i) => i.id === selectedArray[0]);
          if (item) {
            setTrashTarget({ id: item.id, name: item.name, isFolder: item.type === "folder" });
            setIsTrashConfirmOpen(true);
          }
        } else {
          setTrashTarget({ id: "bulk", name: `${selectedCount} items`, isFolder: false });
          setIsTrashConfirmOpen(true);
        }
      }
    },
    onEscape: () => {
      clear();
      setContextMenu((prev) => ({ ...prev, isOpen: false }));
    },
    onSelectAll: () => {
      if (allResourceIds.length > 0) {
        selectAll(allResourceIds);
      }
    },
  });

  // Action Handlers
  const handleOpenFolder = (folder: FolderResponse) => {
    clear();
    navigate(ROUTES.FOLDER_DETAIL(folder.id));
  };

  const handlePreviewFile = (file: FileResponse) => {
    setPreviewFile(file);
    loadPreview(file.id);
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    target: TargetResource
  ) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      target,
    });
  };

  return (
    <>
      <DocumentTitle title={currentFolder ? currentFolder.name : "My Drive"} />
      <div className="space-y-6">
        {/* Page Top Header with Breadcrumbs & Action Bar */}
        <PageHeader
          title={currentFolder ? currentFolder.name : "My Drive"}
          description="Manage documents, photos, media, and folder structures"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {/* Sort selector */}
              <div className="flex items-center border border-border/80 rounded-lg p-0.5 bg-background/50 text-xs">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "name" | "createdAt" | "updatedAt" | "size")}
                  className="bg-transparent text-[11px] font-medium text-foreground focus:outline-none px-2"
                >
                  <option value="name">Name</option>
                  <option value="updatedAt">Modified</option>
                  <option value="createdAt">Created</option>
                  <option value="size">Size</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                  className="h-7 px-2 gap-1 text-[11px]"
                  title={`Sort ${sortOrder === "asc" ? "ascending" : "descending"}`}
                >
                  <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[9px] uppercase font-mono">{sortOrder}</span>
                </Button>
              </div>

              {/* Filter selector */}
              <div className="flex items-center border border-border/80 rounded-lg p-0.5 bg-background/50 text-xs">
                <Filter className="w-3 h-3 text-muted-foreground ml-2 mr-1" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-transparent text-[11px] font-medium text-foreground focus:outline-none pr-2"
                >
                  <option value="all">All Types</option>
                  <option value="application/pdf">PDF Documents</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                  <option value="audio">Audio</option>
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-8 gap-1.5 text-xs"
                aria-label="Refresh file listing"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => toggleViewMode("list")}
                  className="h-7 w-7 rounded-md"
                  aria-label="List view"
                >
                  <List className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => toggleViewMode("grid")}
                  className="h-7 w-7 rounded-md"
                  aria-label="Grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewFolderOpen(true)}
                className="h-8 gap-1.5 text-xs shadow-sm"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>New Folder</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => setIsUploadOpen(true)}
                className="h-8 gap-1.5 text-xs shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Upload</span>
              </Button>
            </div>
          }
        >
          <Breadcrumbs
            items={currentFolder ? [{ id: currentFolder.id, name: currentFolder.name }] : []}
          />
        </PageHeader>

        {/* Content Body: Loading, Error, Empty, List or Grid */}
        {isLoading ? (
          viewMode === "list" ? (
            <FileListSkeleton rows={8} />
          ) : (
            <FileGridSkeleton cards={10} />
          )
        ) : isError ? (
          <ErrorState
            error={error}
            title="Unable to load files"
            onRetry={() => refetch()}
          />
        ) : folders.length === 0 && files.length === 0 ? (
          <EmptyState
            title="This folder is empty"
            description="Upload your files or create a new directory to start organizing your cloud storage."
            actionLabel="Upload Files"
            actionIcon={<CloudUpload className="w-4 h-4" />}
            onAction={() => setIsUploadOpen(true)}
            secondaryActionLabel="New Folder"
            onSecondaryAction={() => setIsNewFolderOpen(true)}
          />
        ) : viewMode === "list" ? (
          <FileList
            allSelected={isAllSelected}
            onSelectAll={() => (isAllSelected ? clear() : selectAll(allResourceIds))}
            hasItems={allResourceIds.length > 0}
          >
            {folders.map((folder) => (
              <div
                key={folder.id}
                onContextMenu={(e) =>
                  handleContextMenu(e, {
                    id: folder.id,
                    name: folder.name,
                    isFolder: true,
                    folderId: folder.parent_id,
                    createdAt: folder.created_at,
                    updatedAt: folder.updated_at,
                  })
                }
              >
                <FolderRow
                  folder={folder}
                  isSelected={isSelected(folder.id)}
                  onSelect={(id, e) => handleRowClick(id, allResourceIds, e)}
                  onOpen={handleOpenFolder}
                  onStar={() => toggleStar({ id: folder.id, isFolder: true, isStarred: false })}
                  onRename={(f) => {
                    setRenameTarget({ id: f.id, name: f.name, isFolder: true });
                    setIsRenameOpen(true);
                  }}
                  onTrash={(f) => {
                    setTrashTarget({ id: f.id, name: f.name, isFolder: true });
                    setIsTrashConfirmOpen(true);
                  }}
                />
              </div>
            ))}
            {files.map((file) => (
              <div
                key={file.id}
                onContextMenu={(e) =>
                  handleContextMenu(e, {
                    id: file.id,
                    name: file.name,
                    isFolder: false,
                    sizeBytes: file.size_bytes,
                    mimeType: file.mime_type,
                    folderId: file.folder_id,
                    createdAt: file.created_at,
                    updatedAt: file.updated_at,
                  })
                }
              >
                <FileRow
                  file={file}
                  isSelected={isSelected(file.id)}
                  onSelect={(id, e) => handleRowClick(id, allResourceIds, e)}
                  onPreview={handlePreviewFile}
                  onDownload={(f) => downloadFile(f.id, f.name)}
                  onStar={() => toggleStar({ id: file.id, isFolder: false, isStarred: false })}
                  onRename={(f) => {
                    setRenameTarget({ id: f.id, name: f.name, isFolder: false });
                    setIsRenameOpen(true);
                  }}
                  onTrash={(f) => {
                    setTrashTarget({ id: f.id, name: f.name, isFolder: false });
                    setIsTrashConfirmOpen(true);
                  }}
                />
              </div>
            ))}
          </FileList>
        ) : (
          <FileGrid>
            {folders.map((folder) => (
              <div
                key={folder.id}
                onContextMenu={(e) =>
                  handleContextMenu(e, {
                    id: folder.id,
                    name: folder.name,
                    isFolder: true,
                    folderId: folder.parent_id,
                    createdAt: folder.created_at,
                    updatedAt: folder.updated_at,
                  })
                }
              >
                <FolderCard
                  folder={folder}
                  isSelected={isSelected(folder.id)}
                  onSelect={(id, e) => handleRowClick(id, allResourceIds, e)}
                  onOpen={handleOpenFolder}
                  onStar={() => toggleStar({ id: folder.id, isFolder: true, isStarred: false })}
                  onRename={(f) => {
                    setRenameTarget({ id: f.id, name: f.name, isFolder: true });
                    setIsRenameOpen(true);
                  }}
                  onTrash={(f) => {
                    setTrashTarget({ id: f.id, name: f.name, isFolder: true });
                    setIsTrashConfirmOpen(true);
                  }}
                />
              </div>
            ))}
            {files.map((file) => (
              <div
                key={file.id}
                onContextMenu={(e) =>
                  handleContextMenu(e, {
                    id: file.id,
                    name: file.name,
                    isFolder: false,
                    sizeBytes: file.size_bytes,
                    mimeType: file.mime_type,
                    folderId: file.folder_id,
                    createdAt: file.created_at,
                    updatedAt: file.updated_at,
                  })
                }
              >
                <FileCard
                  file={file}
                  isSelected={isSelected(file.id)}
                  onSelect={(id, e) => handleRowClick(id, allResourceIds, e)}
                  onPreview={handlePreviewFile}
                  onDownload={(f) => downloadFile(f.id, f.name)}
                  onStar={() => toggleStar({ id: file.id, isFolder: false, isStarred: false })}
                  onRename={(f) => {
                    setRenameTarget({ id: f.id, name: f.name, isFolder: false });
                    setIsRenameOpen(true);
                  }}
                  onTrash={(f) => {
                    setTrashTarget({ id: f.id, name: f.name, isFolder: false });
                    setIsTrashConfirmOpen(true);
                  }}
                />
              </div>
            ))}
          </FileGrid>
        )}

        {/* Floating Multi-Selection Bar */}
        <SelectionBar
          selectedCount={selectedCount}
          onClear={clear}
          onTrash={() => {
            if (selectedArray.length === 1) {
              const item = items.find((i) => i.id === selectedArray[0]);
              if (item) {
                setTrashTarget({ id: item.id, name: item.name, isFolder: item.type === "folder" });
                setIsTrashConfirmOpen(true);
              }
            } else if (selectedArray.length > 1) {
              setTrashTarget({ id: "bulk", name: `${selectedCount} items`, isFolder: false });
              setIsTrashConfirmOpen(true);
            }
          }}
        />

        {/* Floating Upload Queue Indicator */}
        <UploadQueue
          queue={queue}
          onCancelTask={cancelUpload}
          onRetryTask={retryUpload}
          onRemoveTask={removeTask}
          onClearCompleted={clearCompleted}
        />

        {/* Context Menu Component */}
        <FileContextMenu
          isOpen={contextMenu.isOpen}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
          target={contextMenu.target}
          onOpen={
            contextMenu.target?.isFolder
              ? () => {
                  const targetFolder = folders.find((f) => f.id === contextMenu.target?.id);
                  if (targetFolder) handleOpenFolder(targetFolder);
                }
              : undefined
          }
          onView={
            !contextMenu.target?.isFolder
              ? () => {
                  if (contextMenu.target?.id) {
                    navigate(ROUTES.FILE_VIEWER(contextMenu.target.id));
                  }
                }
              : undefined
          }
          onPreview={
            !contextMenu.target?.isFolder
              ? () => {
                  const targetFile = files.find((f) => f.id === contextMenu.target?.id);
                  if (targetFile) handlePreviewFile(targetFile);
                }
              : undefined
          }
          onDownload={
            !contextMenu.target?.isFolder
              ? () => {
                  if (contextMenu.target) downloadFile(contextMenu.target.id, contextMenu.target.name);
                }
              : undefined
          }
          onStar={() => {
            if (contextMenu.target) {
              toggleStar({
                id: contextMenu.target.id,
                isFolder: contextMenu.target.isFolder,
                isStarred: !!contextMenu.target.isStarred,
              });
            }
          }}
          onRename={() => {
            if (contextMenu.target) {
              setRenameTarget({
                id: contextMenu.target.id,
                name: contextMenu.target.name,
                isFolder: contextMenu.target.isFolder,
              });
              setIsRenameOpen(true);
            }
          }}
          onMove={() => {
            if (contextMenu.target) {
              setMoveTarget({
                id: contextMenu.target.id,
                name: contextMenu.target.name,
                isFolder: contextMenu.target.isFolder,
              });
              setIsMoveOpen(true);
            }
          }}
          onShare={() => {
            if (contextMenu.target) {
              setShareTarget({
                id: contextMenu.target.id,
                name: contextMenu.target.name,
                isFolder: contextMenu.target.isFolder,
              });
              setIsShareOpen(true);
            }
          }}
          onTrash={() => {
            if (contextMenu.target) {
              setTrashTarget({
                id: contextMenu.target.id,
                name: contextMenu.target.name,
                isFolder: contextMenu.target.isFolder,
              });
              setIsTrashConfirmOpen(true);
            }
          }}
        />

        {/* New Folder Modal */}
        <Dialog
          isOpen={isNewFolderOpen}
          onClose={() => setIsNewFolderOpen(false)}
          title="Create New Folder"
          description="Enter a name for your new directory"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setIsNewFolderOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={!newFolderName.trim()}
                isLoading={isCreatingFolder}
                onClick={async () => {
                  if (newFolderName.trim()) {
                    await createFolder(newFolderName.trim());
                    setIsNewFolderOpen(false);
                    setNewFolderName("");
                  }
                }}
              >
                Create Folder
              </Button>
            </>
          }
        >
          <div className="py-2">
            <Input
              label="Folder Name"
              placeholder="e.g. Invoices, Project Assets"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newFolderName.trim()) {
                  createFolder(newFolderName.trim()).then(() => {
                    setIsNewFolderOpen(false);
                    setNewFolderName("");
                  });
                }
              }}
            />
          </div>
        </Dialog>

        {/* Upload Modal */}
        <Dialog
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          title="Upload Files"
          description="Upload files directly to secure object storage"
          maxWidth="lg"
        >
          <UploadDropzone
            onFilesSelected={(selectedFiles) => {
              addFiles(selectedFiles, activeFolderId);
              setIsUploadOpen(false);
            }}
          />
        </Dialog>

        {/* Rename Modal */}
        {renameTarget && (
          <RenameDialog
            isOpen={isRenameOpen}
            onClose={() => {
              setIsRenameOpen(false);
              setRenameTarget(null);
            }}
            targetName={renameTarget.name}
            isFolder={renameTarget.isFolder}
            isLoading={isRenaming}
            onRename={async (newName) => {
              await renameResource({
                id: renameTarget.id,
                name: newName,
                isFolder: renameTarget.isFolder,
              });
            }}
          />
        )}

        {/* Move Dialog */}
        {moveTarget && (
          <MoveDialog
            isOpen={isMoveOpen}
            onClose={() => {
              setIsMoveOpen(false);
              setMoveTarget(null);
            }}
            targetId={moveTarget.id}
            targetName={moveTarget.name}
            isFolder={moveTarget.isFolder}
            isLoading={isMoving}
            onMove={async (destinationFolderId) => {
              await moveResource({
                id: moveTarget.id,
                destinationFolderId,
                isFolder: moveTarget.isFolder,
              });
            }}
          />
        )}

        {/* Share Dialog */}
        {shareTarget && (
          <ShareDialog
            isOpen={isShareOpen}
            onClose={() => {
              setIsShareOpen(false);
              setShareTarget(null);
            }}
            targetId={shareTarget.id}
            targetName={shareTarget.name}
            isFolder={shareTarget.isFolder}
            isLoading={isSharing}
            onShare={async (granteeEmail, permission) => {
              await shareResource({
                granteeEmail,
                permission,
                fileId: shareTarget.isFolder ? undefined : shareTarget.id,
                folderId: shareTarget.isFolder ? shareTarget.id : undefined,
              });
            }}
          />
        )}

        {/* Confirm Move to Trash Modal */}
        {trashTarget && (
          <DeleteDialog
            isOpen={isTrashConfirmOpen}
            onClose={() => {
              setIsTrashConfirmOpen(false);
              setTrashTarget(null);
            }}
            targetName={trashTarget.name}
            itemCount={trashTarget.id === "bulk" ? selectedCount : 1}
            isPermanent={false}
            isLoading={isTrashing}
            onConfirm={async () => {
              if (trashTarget.id === "bulk") {
                for (const id of selectedArray) {
                  const item = items.find((i) => i.id === id);
                  if (item) {
                    await trashResource({ id: item.id, isFolder: item.type === "folder" });
                  }
                }
              } else {
                await trashResource({ id: trashTarget.id, isFolder: trashTarget.isFolder });
              }
              clear();
            }}
          />
        )}

        {/* File Preview Modal */}
        <PreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
          preview={preview}
          isLoading={isPreviewLoading}
          onDownload={() => previewFile && downloadFile(previewFile.id, previewFile.name)}
          onRetry={() => previewFile && loadPreview(previewFile.id)}
        />
      </div>
    </>
  );
}

export default FilesPage;

