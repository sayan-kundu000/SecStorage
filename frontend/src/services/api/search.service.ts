import { apiClient } from "./client";
import { APIResponse, SearchQueryParams, SearchResponseData } from "../../types";

export const searchService = {
  async searchResources(params: SearchQueryParams, signal?: AbortSignal): Promise<SearchResponseData> {
    const res = await apiClient.get<APIResponse<SearchResponseData>>("/search", {
      params,
      signal,
    });
    if (!res.data.data) throw new Error("Empty search response");
    return res.data.data;
  },
};
