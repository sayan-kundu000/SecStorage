import { apiClient } from "./client";
import { APIResponse, StarCreate, StarResponse, StarredListResponseData } from "../../types";

export const starsService = {
  async listStarred(cursor?: string, limit = 20): Promise<StarredListResponseData> {
    const res = await apiClient.get<APIResponse<StarredListResponseData>>("/starred", {
      params: { cursor, limit },
    });
    if (!res.data.data) return { items: [], pagination: { has_more: false } };
    return res.data.data;
  },

  async starFile(fileId: string): Promise<StarResponse> {
    const res = await apiClient.post<APIResponse<StarResponse>>(`/files/${fileId}/star`);
    if (!res.data.data) throw new Error("Empty star response");
    return res.data.data;
  },

  async unstarFile(fileId: string): Promise<void> {
    await apiClient.delete(`/files/${fileId}/star`);
  },

  async starFolder(folderId: string): Promise<StarResponse> {
    const res = await apiClient.post<APIResponse<StarResponse>>(`/folders/${folderId}/star`);
    if (!res.data.data) throw new Error("Empty star response");
    return res.data.data;
  },

  async unstarFolder(folderId: string): Promise<void> {
    await apiClient.delete(`/folders/${folderId}/star`);
  },

  async createStar(payload: StarCreate): Promise<StarResponse> {
    const res = await apiClient.post<APIResponse<StarResponse>>("/stars", payload);
    if (!res.data.data) throw new Error("Empty star response");
    return res.data.data;
  },

  async deleteStarById(starId: string): Promise<void> {
    await apiClient.delete(`/stars/${starId}`);
  },
};
