import { apiClient } from "./client";
import { APIResponse, RestoreResponse, TrashListResponseData } from "../../types";

export const trashService = {
  async listTrash(
    cursor?: string,
    limit = 20,
    sortBy: "deletedAt" | "name" | "size" = "deletedAt",
    sortOrder: "asc" | "desc" = "desc"
  ): Promise<TrashListResponseData> {
    const res = await apiClient.get<APIResponse<TrashListResponseData>>("/trash", {
      params: { cursor, limit, sortBy, sortOrder },
    });
    if (!res.data.data) return { items: [], pagination: { has_more: false } };
    return res.data.data;
  },

  async restoreFile(fileId: string): Promise<RestoreResponse> {
    const res = await apiClient.post<APIResponse<RestoreResponse>>(`/trash/files/${fileId}/restore`);
    if (!res.data.data) throw new Error("Empty restore response");
    return res.data.data;
  },

  async restoreFolder(folderId: string): Promise<RestoreResponse> {
    const res = await apiClient.post<APIResponse<RestoreResponse>>(`/trash/folders/${folderId}/restore`);
    if (!res.data.data) throw new Error("Empty restore response");
    return res.data.data;
  },

  async restoreResource(resourceId: string): Promise<RestoreResponse> {
    const res = await apiClient.post<APIResponse<RestoreResponse>>(`/trash/${resourceId}/restore`);
    if (!res.data.data) throw new Error("Empty restore response");
    return res.data.data;
  },

  async purgeFile(fileId: string): Promise<void> {
    await apiClient.delete(`/trash/files/${fileId}`);
  },

  async purgeFolder(folderId: string): Promise<void> {
    await apiClient.delete(`/trash/folders/${folderId}`);
  },

  async purgeResource(resourceId: string): Promise<void> {
    await apiClient.delete(`/trash/${resourceId}`);
  },
};
