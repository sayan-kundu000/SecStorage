import { apiClient } from "./client";
import { ActivityListResponse, APIResponse } from "../../types";

export const activityService = {
  async listUserActivities(page = 1, pageSize = 50): Promise<ActivityListResponse> {
    const res = await apiClient.get<APIResponse<ActivityListResponse>>("/activities", {
      params: { page, page_size: pageSize },
    });
    if (!res.data.data) return { items: [], total: 0, page, page_size: pageSize };
    return res.data.data;
  },

  async listFileActivities(fileId: string, page = 1, pageSize = 50): Promise<ActivityListResponse> {
    const res = await apiClient.get<APIResponse<ActivityListResponse>>(`/files/${fileId}/activity`, {
      params: { page, page_size: pageSize },
    });
    if (!res.data.data) return { items: [], total: 0, page, page_size: pageSize };
    return res.data.data;
  },

  async listFolderActivities(folderId: string, page = 1, pageSize = 50): Promise<ActivityListResponse> {
    const res = await apiClient.get<APIResponse<ActivityListResponse>>(`/folders/${folderId}/activity`, {
      params: { page, page_size: pageSize },
    });
    if (!res.data.data) return { items: [], total: 0, page, page_size: pageSize };
    return res.data.data;
  },

  async listAuditLogs(page = 1, pageSize = 50): Promise<ActivityListResponse> {
    const res = await apiClient.get<APIResponse<ActivityListResponse>>("/audit", {
      params: { page, page_size: pageSize },
    });
    if (!res.data.data) return { items: [], total: 0, page, page_size: pageSize };
    return res.data.data;
  },
};
