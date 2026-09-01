/**
 * File Historical Versioning Contracts matching backend version schemas.
 */

export interface FileVersionResponse {
  id: string;
  file_id: string;
  version_number: number;
  size_bytes: number;
  mime_type?: string | null;
  original_filename?: string | null;
  checksum?: string | null;
  created_by?: string | null;
  created_at: string;
  is_current: boolean;
}

export interface FileVersionListResponse {
  versions: FileVersionResponse[];
  total: number;
  current_version_number: number;
}

export interface VersionRestoreResponse {
  message: string;
  new_version: FileVersionResponse;
}
