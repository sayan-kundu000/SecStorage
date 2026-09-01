import { useState, useCallback, useEffect } from "react";
import { previewApi } from "../api/preview";
import { PreviewResponse } from "../../../types";
import { normalizeFileError } from "../utils/errorNormalization";

export interface UseFilePreviewOptions {
  fileId?: string | null;
  versionId?: string | null;
  isOpen?: boolean;
}

export function useFilePreview({ fileId, versionId, isOpen }: UseFilePreviewOptions = {}) {
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async (targetFileId: string, targetVersionId?: string | null) => {
    setIsLoading(true);
    setError(null);
    try {
      let result: PreviewResponse;
      if (targetVersionId) {
        result = await previewApi.getVersionPreview(targetFileId, targetVersionId);
      } else {
        result = await previewApi.getFilePreview(targetFileId);
      }
      setPreview(result);
    } catch (err: unknown) {
      const normalized = normalizeFileError(err);
      setError(normalized.message);
      setPreview({
        file_id: targetFileId,
        preview_type: "UNSUPPORTED",
        mime_type: "application/octet-stream",
        is_truncated: false,
        message: normalized.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearPreview = useCallback(() => {
    setPreview((prev) => {
      // If preview_url is a blob URL, revoke it to avoid memory leaks
      if (prev?.preview_url && prev.preview_url.startsWith("blob:")) {
        URL.revokeObjectURL(prev.preview_url);
      }
      return null;
    });
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && fileId) {
      loadPreview(fileId, versionId);
    } else {
      clearPreview();
    }

    return () => {
      clearPreview();
    };
  }, [isOpen, fileId, versionId, loadPreview, clearPreview]);

  return {
    preview,
    isLoading,
    error,
    loadPreview,
    clearPreview,
  };
}
