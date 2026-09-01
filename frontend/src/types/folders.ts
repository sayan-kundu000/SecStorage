/**
 * Folder CRUD & Hierarchy Contracts matching backend folder schemas.
 */

export interface FolderResponse {
  id: string;
  user_id: string;
  parent_id?: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FolderListResponse {
  folders: FolderResponse[];
}

export interface FolderCreate {
  name: string;
  parent_id?: string | null;
}

export interface FolderUpdate {
  name?: string;
  parent_id?: string | null;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}
