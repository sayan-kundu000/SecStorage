/**
 * Favorite Stars Contracts matching backend star schemas.
 */

import { PaginationMeta } from "./api";

export interface StarCreate {
  folder_id?: string | null;
  file_id?: string | null;
}

export interface StarResponse {
  id: string;
  user_id: string;
  folder_id?: string | null;
  file_id?: string | null;
  resource_id: string;
  resource_type: "file" | "folder";
  starred: boolean;
  created_at: string;
}

export interface StarredItemResponse {
  id: string;
  name: string;
  type: "file" | "folder";
  folder_id?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  starred: boolean;
  trashed: boolean;
  created_at: string;
  updated_at: string;
  starred_at: string;
}

export interface StarredListResponseData {
  items: StarredItemResponse[];
  pagination: PaginationMeta;
}
