import axios from "axios";
import { filesService } from "../../../services/api/files.service";
import { FileResponse, UploadInitiateRequest, UploadInitiateResponse } from "../../../types";

export interface DirectUploadParams {
  uploadUrl: string;
  file: File | Blob;
  contentType: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export const uploadApi = {
  async initiate(payload: UploadInitiateRequest): Promise<UploadInitiateResponse> {
    return filesService.initiateUpload(payload);
  },

  async confirm(fileId: string): Promise<FileResponse> {
    return filesService.confirmUpload(fileId);
  },

  async uploadBinary({
    uploadUrl,
    file,
    contentType,
    onProgress,
    signal,
  }: DirectUploadParams): Promise<void> {
    await axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
      },
      signal,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  },

  async executeFileUpload(
    file: File,
    folderId: string | null = null,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal
  ): Promise<FileResponse> {
    // Phase 1: Initiate backend metadata registration & get presigned upload URL
    const initiateRes = await this.initiate({
      filename: file.name,
      content_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      folder_id: folderId,
    });

    // Phase 2: Direct upload to object storage presigned URL
    await this.uploadBinary({
      uploadUrl: initiateRes.upload_url,
      file,
      contentType: file.type || "application/octet-stream",
      onProgress,
      signal,
    });

    // Phase 3: Confirm successful upload with backend
    const confirmedFile = await this.confirm(initiateRes.file_id);
    return confirmedFile;
  },
};
