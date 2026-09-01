import { previewService } from "../../../services/api/preview.service";
import { PreviewResponse } from "../../../types";

export const previewApi = {
  async getFilePreview(fileId: string): Promise<PreviewResponse> {
    return previewService.getCurrentFilePreview(fileId);
  },

  async getVersionPreview(fileId: string, versionId: string): Promise<PreviewResponse> {
    return previewService.getVersionFilePreview(fileId, versionId);
  },
};
