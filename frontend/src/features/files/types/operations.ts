export type UploadStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface UploadTask {
  id: string;
  file: File;
  filename: string;
  sizeBytes: number;
  contentType: string;
  folderId: string | null;
  status: UploadStatus;
  progress: number;
  abortController?: AbortController | null;
  error?: string | null;
  fileId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OperationType =
  | "upload"
  | "download"
  | "rename"
  | "move"
  | "trash"
  | "restore"
  | "delete"
  | "star"
  | "unstar"
  | "share";

export type OperationStatus = "pending" | "in_progress" | "completed" | "failed";

export interface FileOperation {
  id: string;
  type: OperationType;
  itemId: string;
  itemName: string;
  status: OperationStatus;
  progress?: number | null;
  error?: string | null;
  timestamp: string;
}

export interface DownloadTask {
  fileId: string;
  filename: string;
  status: "pending" | "downloading" | "completed" | "failed";
  error?: string | null;
}
