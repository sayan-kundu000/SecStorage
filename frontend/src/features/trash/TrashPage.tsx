import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, RotateCcw, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { DocumentTitle } from "../../components/common/DocumentTitle";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { FileListSkeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { FileIcon } from "../../components/files/FileIcon";
import { trashService } from "../../services";
import { QUERY_KEYS, ROUTES } from "../../app/config/constants";
import { formatBytes, formatRelativeTime, truncateFilename } from "../../utils/formatters";
import { useSelection } from "../../hooks/useSelection";
import { notify } from "../../components/ui/toast";
import { getErrorMessage } from "../../utils/errors";
import { FileDetails } from "../files/components/FileDetails";
import { TrashItemResponse } from "../../types";

export function TrashPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [purgeTarget, setPurgeTarget] = useState<TrashItemResponse | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<TrashItemResponse | null>(null);
  const [isPurgingAll, setIsPurgingAll] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.TRASH.LIST(),
    queryFn: () => trashService.listTrash(undefined, 100),
  });

  const items = data?.items || [];
  const selection = useSelection();

  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRASH.ALL });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FILES.ALL });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SEARCH.ALL });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STARRED.ALL });
  };

  const restoreMutation = useMutation({
    mutationFn: (item: TrashItemResponse) => trashService.restoreResource(item.id),
    onSuccess: (res) => {
      notify.success("Resource Restored", `"${res.name}" has been restored to your drive.`);
      invalidateCache();
    },
    onError: (err) => {
      notify.error("Restore failed", getErrorMessage(err));
    },
  });

  const purgeMutation = useMutation({
    mutationFn: (item: TrashItemResponse) => trashService.purgeResource(item.id),
    onSuccess: () => {
      notify.success("Permanently Deleted");
      setPurgeTarget(null);
      invalidateCache();
    },
    onError: (err) => {
      notify.error("Delete failed", getErrorMessage(err));
    },
  });

  const getSelectedItems = () => items.filter((i) => selection.isSelected(i.id));

  const handleBulkRestore = async () => {
    const selected = getSelectedItems();
    let count = 0;
    for (const item of selected) {
      try {
        await trashService.restoreResource(item.id);
        count++;
      } catch {
        // Continue restoring remaining items
      }
    }
    notify.success("Bulk Restore Complete", `Restored ${count} of ${selected.length} items.`);
    selection.clear();
    invalidateCache();
  };

  const handleBulkPurge = async () => {
    const selected = getSelectedItems();
    let count = 0;
    for (const item of selected) {
      try {
        await trashService.purgeResource(item.id);
        count++;
      } catch {
        // Continue purging remaining items
      }
    }
    notify.success("Bulk Delete Complete", `Permanently deleted ${count} items.`);
    selection.clear();
    invalidateCache();
  };

  const isAllSelected = items.length > 0 && items.every((i) => selection.isSelected(i.id));
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      selection.selectAll(items.map((i) => i.id));
    } else {
      selection.clear();
    }
  };

  return (
    <>
      <DocumentTitle title="Trash" />
      <div className="space-y-6 text-left">
        <PageHeader
          title="Trash"
          description="Recover soft-deleted resources or purge binary objects permanently from storage"
          actions={
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPurgingAll(true)}
                  className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Empty Trash</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-8 gap-1.5 text-xs shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </Button>
            </div>
          }
        />

        {/* Selection Bar for Trash Bulk Operations */}
        {selection.selectedCount > 0 && (
          <div className="p-3 rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-between gap-2 shadow-sm text-xs">
            <span className="font-semibold text-foreground">
              {selection.selectedCount} item{selection.selectedCount > 1 ? "s" : ""} selected
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkRestore}
                className="h-7 text-xs gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore Selected</span>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkPurge}
                className="h-7 text-xs gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Permanently</span>
              </Button>

              <Button variant="ghost" size="sm" onClick={selection.clear} className="h-7 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <FileListSkeleton rows={6} />
        ) : isError ? (
          <ErrorState error={error} title="Failed to load trash" onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Trash2 className="w-10 h-10 text-muted-foreground/60" />}
            title="Trash is empty"
            description="Items moved to trash will remain available for recovery until permanently deleted."
            actionLabel="My Files"
            onAction={() => navigate(ROUTES.FILES)}
          />
        ) : (
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                      aria-label="Select all trashed items"
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Resource</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Size</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Deleted At</TableHead>
                  <TableHead className="w-36 text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`hover:bg-muted/40 transition-colors ${
                      selection.isSelected(item.id) ? "bg-primary/10" : ""
                    }`}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selection.isSelected(item.id)}
                        onChange={() => selection.toggle(item.id)}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                        aria-label={`Select ${item.name}`}
                      />
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileIcon
                          filename={item.name}
                          mimeType={item.mime_type}
                          isFolder={item.type === "folder"}
                        />
                        <span
                          className="font-medium text-foreground truncate max-w-[180px] sm:max-w-xs md:max-w-md cursor-pointer hover:underline"
                          onClick={() => setDetailsTarget(item)}
                        >
                          {truncateFilename(item.name, 45)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {item.type === "folder" ? "—" : formatBytes(item.size_bytes)}
                    </TableCell>

                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {formatRelativeTime(item.deleted_at)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreMutation.mutate(item)}
                          isLoading={restoreMutation.isPending}
                          className="h-8 gap-1 text-xs"
                          aria-label={`Restore ${item.name}`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPurgeTarget(item)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Permanently delete ${item.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Single Item Purge Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!purgeTarget}
          onClose={() => setPurgeTarget(null)}
          title="Permanently Delete Resource?"
          description={`Are you sure you want to permanently delete "${purgeTarget?.name}"? This action cannot be undone and purges binary objects immediately from storage.`}
          confirmLabel="Delete Forever"
          variant="destructive"
          isLoading={purgeMutation.isPending}
          onConfirm={() => {
            if (purgeTarget) {
              purgeMutation.mutate(purgeTarget);
            }
          }}
        />

        {/* Empty Trash Purge Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isPurgingAll}
          onClose={() => setIsPurgingAll(false)}
          title="Empty Entire Trash?"
          description={`Are you sure you want to permanently purge all ${items.length} soft-deleted items in your trash? All files and folders will be unrecoverable.`}
          confirmLabel="Empty Trash Now"
          variant="destructive"
          onConfirm={async () => {
            setIsPurgingAll(false);
            for (const item of items) {
              try {
                await trashService.purgeResource(item.id);
              } catch {
                // Continue purging
              }
            }
            notify.success("Trash Emptied");
            invalidateCache();
          }}
        />

        {/* File Details Dialog */}
        <Dialog
          isOpen={!!detailsTarget}
          onClose={() => setDetailsTarget(null)}
          title="File Details"
        >
          {detailsTarget && (
            <FileDetails
              resource={{
                id: detailsTarget.id,
                name: detailsTarget.name,
                isFolder: detailsTarget.type === "folder",
                mimeType: detailsTarget.mime_type ?? undefined,
                sizeBytes: detailsTarget.size_bytes ?? undefined,
                createdAt: detailsTarget.created_at,
                updatedAt: detailsTarget.updated_at,
                trashed: true,
              }}
            />
          )}
        </Dialog>
      </div>
    </>
  );
}

export default TrashPage;
