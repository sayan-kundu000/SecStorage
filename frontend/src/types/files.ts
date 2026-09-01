/**
 * File Metadata & Direct Binary Storage Contracts matching backend file schemas.
 */

export interface FileResponse {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  status: "PENDING" | "READY" | "FAILED" | string;
  checksum?: string | null;
  uploaded_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileListResponse {
  files: FileResponse[];
  total_count: number;
}

export interface UploadInitiateRequest {
  filename: string;
  content_type?: string;
  size_bytes: number;
  folder_id?: string | null;
  checksum?: string | null;
}

export interface UploadInitiateResponse {
  file_id: string;
  upload_url: string;
  expires_at: string;
  storage_key: string;
}

export interface UploadConfirmRequest {
  file_id: string;
}

export interface DownloadUrlResponse {
  file_id: string;
  download_url: string;
  expires_at: string;
}

export interface FileCreate {
  name: string;
  folder_id?: string | null;
  mime_type?: string;
  size_bytes?: number;
}

export interface FileUpdate {
  name?: string;
  folder_id?: string | null;
}
