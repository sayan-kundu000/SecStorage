import { apiClient } from "./client";
import {
  APIResponse,
  DownloadUrlResponse,
  FileVersionListResponse,
  FileVersionResponse,
  VersionRestoreResponse,
} from "../../types";

export const versionsService = {
  async listFileVersions(fileId: string, limit = 50, offset = 0): Promise<FileVersionListResponse> {
    const res = await apiClient.get<APIResponse<FileVersionListResponse>>(
      `/files/${fileId}/versions`,
      { params: { limit, offset } }
    );
    if (!res.data.data) return { versions: [], total: 0, current_version_number: 1 };
    return res.data.data;
  },

  async getVersionDetails(fileId: string, versionId: string): Promise<FileVersionResponse> {
    const res = await apiClient.get<APIResponse<FileVersionResponse>>(
      `/files/${fileId}/versions/${versionId}`
    );
    if (!res.data.data) throw new Error("Empty version details response");
    return res.data.data;
  },

  async downloadFileVersion(fileId: string, versionId: string): Promise<DownloadUrlResponse> {
    const res = await apiClient.get<APIResponse<DownloadUrlResponse>>(
      `/files/${fileId}/versions/${versionId}/download`
    );
    if (!res.data.data) throw new Error("Empty version download URL response");
    return res.data.data;
  },

  async restoreFileVersion(fileId: string, versionId: string): Promise<VersionRestoreResponse> {
    const res = await apiClient.post<APIResponse<VersionRestoreResponse>>(
      `/files/${fileId}/versions/${versionId}/restore`
    );
    if (!res.data.data) throw new Error("Empty version restore response");
    return res.data.data;
  },
};
