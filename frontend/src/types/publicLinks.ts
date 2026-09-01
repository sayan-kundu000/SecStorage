/**
 * Public Link Sharing Contracts matching backend public_links schemas.
 */

export interface PublicLinkCreate {
  folder_id?: string | null;
  file_id?: string | null;
  password?: string | null;
  expires_at?: string | null;
  allow_download?: boolean;
  permission?: "VIEWER" | string;
}

export interface PublicLinkResponse {
  id: string;
  created_by: string;
  folder_id?: string | null;
  file_id?: string | null;
  resource_id: string;
  resource_type: "file" | "folder";
  resource_name?: string | null;
  token?: string | null;
  url?: string | null;
  has_password: boolean;
  expires_at?: string | null;
  allow_download: boolean;
  permission: string;
  is_active: boolean;
  created_at: string;
}

export interface PublicLinkListResponse {
  links: PublicLinkResponse[];
}

export interface PublicLinkVerifyPasswordRequest {
  password: string;
}

export interface PublicResourceMetadataResponse {
  id: string;
  name: string;
  type: "file" | "folder";
  mime_type?: string | null;
  size_bytes?: number | null;
  folder_id?: string | null;
  created_at: string;
  updated_at: string;
  has_password: boolean;
  requires_password: boolean;
  allow_download: boolean;
  permission: string;
  download_url?: string | null;
}
