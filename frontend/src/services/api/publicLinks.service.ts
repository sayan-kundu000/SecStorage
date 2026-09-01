import { apiClient } from "./client";
import {
  APIResponse,
  DownloadUrlResponse,
  PreviewResponse,
  PublicLinkCreate,
  PublicLinkListResponse,
  PublicLinkResponse,
  PublicLinkVerifyPasswordRequest,
  PublicResourceMetadataResponse,
} from "../../types";

export const publicLinksService = {
  async createPublicLink(payload: PublicLinkCreate): Promise<PublicLinkResponse> {
    const res = await apiClient.post<APIResponse<PublicLinkResponse>>("/public-links", payload);
    if (!res.data.data) throw new Error("Empty public link response");
    return res.data.data;
  },

  async createFilePublicLink(fileId: string, payload: PublicLinkCreate): Promise<PublicLinkResponse> {
    const res = await apiClient.post<APIResponse<PublicLinkResponse>>(
      `/files/${fileId}/public-links`,
      payload
    );
    if (!res.data.data) throw new Error("Empty public link response");
    return res.data.data;
  },

  async createFolderPublicLink(folderId: string, payload: PublicLinkCreate): Promise<PublicLinkResponse> {
    const res = await apiClient.post<APIResponse<PublicLinkResponse>>(
      `/folders/${folderId}/public-links`,
      payload
    );
    if (!res.data.data) throw new Error("Empty public link response");
    return res.data.data;
  },

  async getPublicLinkByToken(
    token: string,
    password?: string | null
  ): Promise<PublicResourceMetadataResponse> {
    const res = await apiClient.get<APIResponse<PublicResourceMetadataResponse>>(
      `/public-links/${token}`,
      { params: password ? { password } : undefined }
    );
    if (!res.data.data) throw new Error("Empty public link metadata response");
    return res.data.data;
  },

  async verifyPublicLinkPassword(
    token: string,
    payload: PublicLinkVerifyPasswordRequest
  ): Promise<PublicResourceMetadataResponse> {
    const res = await apiClient.post<APIResponse<PublicResourceMetadataResponse>>(
      `/public-links/${token}/verify`,
      payload
    );
    if (!res.data.data) throw new Error("Empty public link verification response");
    return res.data.data;
  },

  async downloadPublicLinkFile(
    token: string,
    password?: string | null
  ): Promise<DownloadUrlResponse> {
    const res = await apiClient.get<APIResponse<DownloadUrlResponse>>(
      `/public-links/${token}/download`,
      { params: password ? { password } : undefined }
    );
    if (!res.data.data) throw new Error("Empty public download response");
    return res.data.data;
  },

  async previewPublicLinkFile(
    token: string,
    password?: string | null
  ): Promise<PreviewResponse> {
    const res = await apiClient.get<APIResponse<PreviewResponse>>(
      `/public-links/${token}/preview`,
      { params: password ? { password } : undefined }
    );
    if (!res.data.data) throw new Error("Empty public preview response");
    return res.data.data;
  },

  async listFilePublicLinks(fileId: string): Promise<PublicLinkListResponse> {
    const res = await apiClient.get<APIResponse<PublicLinkListResponse>>(
      `/files/${fileId}/public-links`
    );
    if (!res.data.data) return { links: [] };
    return res.data.data;
  },

  async listFolderPublicLinks(folderId: string): Promise<PublicLinkListResponse> {
    const res = await apiClient.get<APIResponse<PublicLinkListResponse>>(
      `/folders/${folderId}/public-links`
    );
    if (!res.data.data) return { links: [] };
    return res.data.data;
  },

  async revokePublicLink(linkId: string): Promise<void> {
    await apiClient.delete(`/public-links/${linkId}`);
  },
};
