import { apiClient } from "./client";
import { APIResponse, ShareCreate, ShareListResponse, ShareResponse, ShareUpdate } from "../../types";

export const sharesService = {
  async createShare(payload: ShareCreate): Promise<ShareResponse> {
    const res = await apiClient.post<APIResponse<ShareResponse>>("/shares", payload);
    if (!res.data.data) throw new Error("Empty share response");
    return res.data.data;
  },

  async createFileShare(fileId: string, payload: ShareCreate): Promise<ShareResponse> {
    const res = await apiClient.post<APIResponse<ShareResponse>>(`/files/${fileId}/shares`, payload);
    if (!res.data.data) throw new Error("Empty share response");
    return res.data.data;
  },

  async createFolderShare(folderId: string, payload: ShareCreate): Promise<ShareResponse> {
    const res = await apiClient.post<APIResponse<ShareResponse>>(`/folders/${folderId}/shares`, payload);
    if (!res.data.data) throw new Error("Empty share response");
    return res.data.data;
  },

  async listSharesReceived(): Promise<ShareListResponse> {
    const res = await apiClient.get<APIResponse<ShareListResponse>>("/shares");
    if (!res.data.data) return { shares: [] };
    return res.data.data;
  },

  async listFileShares(fileId: string): Promise<ShareListResponse> {
    const res = await apiClient.get<APIResponse<ShareListResponse>>(`/files/${fileId}/shares`);
    if (!res.data.data) return { shares: [] };
    return res.data.data;
  },

  async listFolderShares(folderId: string): Promise<ShareListResponse> {
    const res = await apiClient.get<APIResponse<ShareListResponse>>(`/folders/${folderId}/shares`);
    if (!res.data.data) return { shares: [] };
    return res.data.data;
  },

  async updateShare(shareId: string, payload: ShareUpdate): Promise<ShareResponse> {
    const res = await apiClient.patch<APIResponse<ShareResponse>>(`/shares/${shareId}`, payload);
    if (!res.data.data) throw new Error("Empty share update response");
    return res.data.data;
  },

  async deleteShare(shareId: string): Promise<void> {
    await apiClient.delete(`/shares/${shareId}`);
  },
};
