import { filesService } from "../../../services/api/files.service";
import { DownloadUrlResponse } from "../../../types";

export const downloadApi = {
  async getDownloadUrl(fileId: string): Promise<DownloadUrlResponse> {
    return filesService.getDownloadUrl(fileId);
  },

  async triggerSecureDownload(fileId: string, filename?: string): Promise<void> {
    const res = await this.getDownloadUrl(fileId);
    const downloadUrl = res.download_url;

    // Create a temporary hidden link element to trigger browser download
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    if (filename) {
      link.download = filename;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
