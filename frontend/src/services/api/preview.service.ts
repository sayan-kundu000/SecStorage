import { apiClient } from "./client";
import { APIResponse, PreviewResponse } from "../../types";

export const previewService = {
  async getCurrentFilePreview(fileId: string): Promise<PreviewResponse> {
    const res = await apiClient.get<APIResponse<PreviewResponse>>(`/files/${fileId}/preview`);
    if (!res.data.data) throw new Error("Empty preview response");
    return res.data.data;
  },

  async getVersionFilePreview(fileId: string, versionId: string): Promise<PreviewResponse> {
    const res = await apiClient.get<APIResponse<PreviewResponse>>(
      `/files/${fileId}/versions/${versionId}/preview`
    );
    if (!res.data.data) throw new Error("Empty version preview response");
    return res.data.data;
  },
};
