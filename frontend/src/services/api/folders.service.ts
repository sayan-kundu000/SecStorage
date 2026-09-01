import { apiClient } from "./client";
import { APIResponse, FolderCreate, FolderResponse, FolderUpdate } from "../../types";

export const foldersService = {
  async createFolder(payload: FolderCreate): Promise<FolderResponse> {
    const res = await apiClient.post<APIResponse<FolderResponse>>("/folders", payload);
    if (!res.data.data) throw new Error("Empty folder creation response");
    return res.data.data;
  },

  async getFolder(folderId: string): Promise<FolderResponse> {
    const res = await apiClient.get<APIResponse<FolderResponse>>(`/folders/${folderId}`);
    if (!res.data.data) throw new Error("Empty folder metadata response");
    return res.data.data;
  },

  async updateFolder(folderId: string, payload: FolderUpdate): Promise<FolderResponse> {
    const res = await apiClient.patch<APIResponse<FolderResponse>>(`/folders/${folderId}`, payload);
    if (!res.data.data) throw new Error("Empty folder update response");
    return res.data.data;
  },

  async trashFolder(folderId: string): Promise<void> {
    await apiClient.post(`/folders/${folderId}/trash`);
  },
};
