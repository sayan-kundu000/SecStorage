/**
 * Soft-Delete & Trash Recovery Contracts matching backend trash schemas.
 */

import { PaginationMeta } from "./api";

export interface TrashItemResponse {
  id: string;
  name: string;
  type: "file" | "folder";
  folder_id?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  starred: boolean;
  deleted_at: string;
  created_at: string;
  updated_at: string;
}

export interface TrashListResponseData {
  items: TrashItemResponse[];
  pagination: PaginationMeta;
}

export interface RestoreResponse {
  id: string;
  name: string;
  type: "file" | "folder";
  folder_id?: string | null;
  restored: boolean;
  restored_at: string;
}
