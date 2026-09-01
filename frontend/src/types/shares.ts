/**
 * User Resource Access Sharing Contracts matching backend sharing schemas.
 */

export type SharePermission = "EDITOR" | "VIEWER";

export interface ShareCreate {
  grantee_email: string;
  folder_id?: string | null;
  file_id?: string | null;
  permission: SharePermission;
}

export interface ShareUpdate {
  permission: SharePermission;
}

export interface ShareResponse {
  id: string;
  grantor_id: string;
  grantee_id: string;
  grantee_email?: string | null;
  grantee_name?: string | null;
  folder_id?: string | null;
  file_id?: string | null;
  resource_id: string;
  resource_type: "file" | "folder";
  resource_name?: string | null;
  permission: SharePermission;
  created_at: string;
  updated_at: string;
}

export interface ShareListResponse {
  shares: ShareResponse[];
}
