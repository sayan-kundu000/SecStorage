/**
 * Search, Filter & Sort Contracts matching backend search schemas.
 */

import { PaginationMeta } from "./api";

export type ResourceType = "file" | "folder" | "all";
export type SortField = "name" | "createdAt" | "updatedAt" | "size";
export type SortOrder = "asc" | "desc";

export interface SearchQueryParams {
  q: string;
  type?: ResourceType;
  mime_type?: string;
  mimeType?: string;
  extension?: string;
  min_size?: number;
  minSize?: number;
  max_size?: number;
  maxSize?: number;
  created_after?: string;
  createdAfter?: string;
  created_before?: string;
  createdBefore?: string;
  updated_after?: string;
  updatedAfter?: string;
  updated_before?: string;
  updatedBefore?: string;
  folder_id?: string;
  folderId?: string;
  starred?: boolean;
  sort_by?: SortField;
  sortBy?: SortField;
  sort_order?: SortOrder;
  sortOrder?: SortOrder;
  cursor?: string;
  limit?: number;
}

export interface SearchResultItem {
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
  deleted_at?: string | null;
}

export interface SearchResponseData {
  items: SearchResultItem[];
  pagination: PaginationMeta;
}
