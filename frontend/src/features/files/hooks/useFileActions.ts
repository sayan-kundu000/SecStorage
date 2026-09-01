import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fileActionsApi } from "../api/actions";
import { downloadApi } from "../api/download";
import { QUERY_KEYS } from "../../../app/config/constants";
import { notify } from "../../../components/ui/toast";
import { normalizeFileError } from "../utils/errorNormalization";

export function useFileActions() {
  const queryClient = useQueryClient();

  const invalidateFileQueries = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FILES.ALL });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SEARCH.ALL });
  };

  const renameMutation = useMutation({
    mutationFn: ({ id, name, isFolder }: { id: string; name: string; isFolder: boolean }) =>
      fileActionsApi.rename(id, name, isFolder),
    onSuccess: (_, variables) => {
      notify.success("Renamed successfully", `Renamed to "${variables.name.trim()}".`);
      invalidateFileQueries();
    },
    onError: (err) => {
      const normalized = normalizeFileError(err);
      notify.error("Rename failed", normalized.message);
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({
      id,
      destinationFolderId,
      isFolder,
    }: {
      id: string;
      destinationFolderId: string | null;
      isFolder: boolean;
    }) => fileActionsApi.move(id, destinationFolderId, isFolder),
    onSuccess: () => {
      notify.success("Moved successfully", "Resource location updated.");
      invalidateFileQueries();
    },
    onError: (err) => {
      const normalized = normalizeFileError(err);
      notify.error("Move failed", normalized.message);
    },
  });

  const starMutation = useMutation({
    mutationFn: ({
      id,
      isFolder,
      isStarred,
    }: {
      id: string;
      isFolder: boolean;
      isStarred: boolean;
    }) => fileActionsApi.toggleStar(id, isFolder, isStarred),
    onSuccess: (_, variables) => {
      notify.success(variables.isStarred ? "Removed from Starred" : "Added to Starred");
      invalidateFileQueries();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STARRED.ALL });
    },
    onError: (err) => {
      const normalized = normalizeFileError(err);
      notify.error("Star operation failed", normalized.message);
    },
  });

  const trashMutation = useMutation({
    mutationFn: ({ id, isFolder }: { id: string; isFolder: boolean }) =>
      fileActionsApi.trash(id, isFolder),
    onSuccess: () => {
      notify.success("Moved to Trash");
      invalidateFileQueries();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRASH.ALL });
    },
    onError: (err) => {
      const normalized = normalizeFileError(err);
      notify.error("Failed to move to trash", normalized.message);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: ({ id, isFolder }: { id: string; isFolder: boolean }) =>
      fileActionsApi.restore(id, isFolder),
    onSuccess: () => {
      notify.success("Restored successfully");
      invalidateFileQueries();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRASH.ALL });
    },
    onError: (err) => {
      const normalized = normalizeFileError(err);
      notify.error("Restore failed", normalized.message);
    },
  });

  const purgeMutation = useMutation({
    mutationFn: ({ id, isFolder }: { id: string; isFolder: boolean }) =>
      fileActionsApi.purge(id, isFolder),
    onSuccess: () => {
      notify.success("Permanently deleted");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRASH.ALL });
    },
    onError: (err) => {
      const normalized = normalizeFileError(err);
      notify.error("Permanent deletion failed", normalized.message);
    },
  });

  const shareMutation = useMutation({
    mutationFn: ({
      granteeEmail,
      permission,
      fileId,
      folderId,
    }: {
      granteeEmail: string;
      permission: "VIEWER" | "EDITOR";
      fileId?: string;
      folderId?: string;
    }) => fileActionsApi.share(granteeEmail, permission, fileId, folderId),
    onSuccess: () => {
      notify.success("Access Granted", "Share permission created successfully.");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SHARED.ALL });
    },
    onError: (err) => {
      const normalized = normalizeFileError(err);
      notify.error("Share failed", normalized.message);
    },
  });

  const downloadFile = async (fileId: string, filename?: string) => {
    try {
      await downloadApi.triggerSecureDownload(fileId, filename);
      notify.success("Download started");
    } catch (err) {
      const normalized = normalizeFileError(err);
      notify.error("Download failed", normalized.message);
    }
  };

  return {
    renameResource: renameMutation.mutateAsync,
    isRenaming: renameMutation.isPending,
    moveResource: moveMutation.mutateAsync,
    isMoving: moveMutation.isPending,
    toggleStar: starMutation.mutateAsync,
    isTogglingStar: starMutation.isPending,
    trashResource: trashMutation.mutateAsync,
    isTrashing: trashMutation.isPending,
    restoreResource: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,
    purgeResource: purgeMutation.mutateAsync,
    isPurging: purgeMutation.isPending,
    shareResource: shareMutation.mutateAsync,
    isSharing: shareMutation.isPending,
    downloadFile,
  };
}
