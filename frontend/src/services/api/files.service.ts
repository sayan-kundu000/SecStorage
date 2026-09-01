import axios from "axios";
import { apiClient } from "./client";
import {
  APIResponse,
  DownloadUrlResponse,
  FileResponse,
  FileUpdate,
  UploadInitiateRequest,
  UploadInitiateResponse,
} from "../../types";

export const filesService = {
  async initiateUpload(payload: UploadInitiateRequest): Promise<UploadInitiateResponse> {
    const res = await apiClient.post<APIResponse<UploadInitiateResponse>>(
      "/files/upload/initiate",
      payload
    );
    if (!res.data.data) throw new Error("Empty upload initiation response");
    return res.data.data;
  },

  async confirmUpload(fileId: string): Promise<FileResponse> {
    const res = await apiClient.post<APIResponse<FileResponse>>(
      `/files/${fileId}/upload/confirm`,
      { file_id: fileId }
    );
    if (!res.data.data) throw new Error("Empty upload confirmation response");
    return res.data.data;
  },

  async uploadBinaryToPresignedUrl(
    uploadUrl: string,
    file: File | Blob,
    contentType = "application/octet-stream",
    onProgress?: (percent: number) => void
  ): Promise<void> {
    await axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": contentType,
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  },

  async getDownloadUrl(fileId: string): Promise<DownloadUrlResponse> {
    const res = await apiClient.get<APIResponse<DownloadUrlResponse>>(
      `/files/${fileId}/download-url`
    );
    if (!res.data.data) throw new Error("Empty download URL response");
    return res.data.data;
  },

  async getFile(fileId: string): Promise<FileResponse> {
    const res = await apiClient.get<APIResponse<FileResponse>>(`/files/${fileId}`);
    if (!res.data.data) throw new Error("Empty file metadata response");
    return res.data.data;
  },

  async updateFile(fileId: string, payload: FileUpdate): Promise<FileResponse> {
    const res = await apiClient.patch<APIResponse<FileResponse>>(`/files/${fileId}`, payload);
    if (!res.data.data) throw new Error("Empty file update response");
    return res.data.data;
  },

  async trashFile(fileId: string): Promise<void> {
    await apiClient.post(`/files/${fileId}/trash`);
  },
};
