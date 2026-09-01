import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  filesService,
  foldersService,
  searchService,
  starsService,
  sharesService,
} from "../services";
import { QUERY_KEYS } from "../app/config/constants";
import { notify } from "../components/ui/toast";
import { getErrorMessage } from "../utils/errors";

export interface UseDriveOptions {
  folderId?: string | null;
  sortBy?: "name" | "createdAt" | "updatedAt" | "size";
  sortOrder?: "asc" | "desc";
  filterType?: string;
  searchQuery?: string;
}

export function useDrive({
  folderId = null,
  sortBy = "name",
  sortOrder = "asc",
  filterType,
  searchQuery = "*",
}: UseDriveOptions = {}) {
  const queryClient = useQueryClient();

  // Fetch current folder metadata if inside subfolder
  const currentFolderQuery = useQuery({
    queryKey: QUERY_KEYS.FOLDERS.DETAIL(folderId || "root"),
    queryFn: () => (folderId ? foldersService.getFolder(folderId) : null),
    enabled: !!folderId,
  });

  // Fetch contents via search service
  const contentsQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.FILES.LIST(folderId || "root"),
      { sortBy, sortOrder, filterType, searchQuery },
    ],
    queryFn: () =>
      searchService.searchResources({
        q: searchQuery || "*",
        folder_id: folderId || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        mime_type: filterType && filterType !== "all" ? filterType : undefined,
        limit: 100,
      }),
  });

  // Mutations
  const createFolderMutation = useMutation({
    mutationFn: (name: string) =>
      foldersService.createFolder({ name: name.trim(), parent_id: folderId }),
    onSuccess: (data) => {
      notify.success("Folder created", `Directory "${data.name}" ready.`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SEARCH.ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FILES.ALL });
    },
    onError: (err) => {
      notify.error("Failed to create folder", getErrorMessage(err));
    },
  });

  const renameResourceMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      isFolder,
    }: {
      id: string;
      name: string;
      isFolder: boolean;
    }) => {
      if (isFolder) {
        return foldersService.updateFolder(id, { name: name.trim() });
      }
      return filesService.updateFile(id, { name: name.trim() });
    },
    onSuccess: () => {
      notify.success("Renamed successfully");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SEARCH.ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FILES.ALL });
    },
    onError: (err) => {
      notify.error("Rename failed", getErrorMessage(err));
    },
  });

  const moveResourceMutation = useMutation({
    mutationFn: async ({
      id,
      destinationFolderId,
      isFolder,
    }: {
      id: string;
      destinationFolderId: string | null;
      isFolder: boolean;
    }) => {
      if (isFolder) {
        return foldersService.updateFolder(id, { parent_id: destinationFolderId });
      }
      return filesService.updateFile(id, { folder_id: destinationFolderId });
    },
    onSuccess: () => {
      notify.success("Moved successfully", "Resource location updated.");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SEARCH.ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FILES.ALL });
    },
    onError: (err) => {
      notify.error("Move failed", getErrorMessage(err));
    },
  });

  const trashResourceMutation = useMutation({
    mutationFn: async ({ id, isFolder }: { id: string; isFolder: boolean }) => {
      if (isFolder) {
        return foldersService.trashFolder(id);
      }
      return filesService.trashFile(id);
    },
    onSuccess: () => {
      notify.success("Moved to Trash");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SEARCH.ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FILES.ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRASH.ALL });
    },
    onError: (err) => {
      notify.error("Failed to move to trash", getErrorMessage(err));
    },
  });

  const toggleStarMutation = useMutation({
    mutationFn: async ({
      id,
      isFolder,
      isStarred,
    }: {
      id: string;
      isFolder: boolean;
      isStarred: boolean;
    }) => {
      if (isStarred) {
        if (isFolder) {
          return starsService.unstarFolder(id);
        }
        return starsService.unstarFile(id);
      }
      if (isFolder) {
        return starsService.starFolder(id);
      }
      return starsService.starFile(id);
    },
    onSuccess: (_, variables) => {
      notify.success(
        variables.isStarred ? "Removed from Starred" : "Added to Starred"
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SEARCH.ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FILES.ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STARRED.ALL });
    },
    onError: (err) => {
      notify.error("Star update failed", getErrorMessage(err));
    },
  });

  const shareResourceMutation = useMutation({
    mutationFn: async ({
      granteeEmail,
      permission,
      fileId,
      folderId: targetFolderId,
    }: {
      granteeEmail: string;
      permission: "VIEWER" | "EDITOR";
      fileId?: string;
      folderId?: string;
    }) => {
      return sharesService.createShare({
        grantee_email: granteeEmail,
        permission,
        file_id: fileId,
        folder_id: targetFolderId,
      });
    },
    onSuccess: () => {
      notify.success("Access Granted", "Share permission created successfully.");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SHARED.ALL });
    },
    onError: (err) => {
      notify.error("Share failed", getErrorMessage(err));
    },
  });

  return {
    currentFolder: currentFolderQuery.data,
    isLoadingFolder: currentFolderQuery.isLoading,
    items: contentsQuery.data?.items || [],
    totalCount: contentsQuery.data?.items.length || 0,
    isLoading: contentsQuery.isLoading,
    isError: contentsQuery.isError,
    error: contentsQuery.error,
    refetch: contentsQuery.refetch,
    createFolder: createFolderMutation.mutateAsync,
    isCreatingFolder: createFolderMutation.isPending,
    renameResource: renameResourceMutation.mutateAsync,
    isRenaming: renameResourceMutation.isPending,
    moveResource: moveResourceMutation.mutateAsync,
    isMoving: moveResourceMutation.isPending,
    trashResource: trashResourceMutation.mutateAsync,
    isTrashing: trashResourceMutation.isPending,
    toggleStar: toggleStarMutation.mutateAsync,
    isTogglingStar: toggleStarMutation.isPending,
    shareResource: shareResourceMutation.mutateAsync,
    isSharing: shareResourceMutation.isPending,
  };
}
