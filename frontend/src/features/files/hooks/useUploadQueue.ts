import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadApi } from "../api/upload";
import { UploadTask } from "../types/operations";
import { validateFileForUpload } from "../utils/fileValidation";
import { normalizeFileError } from "../utils/errorNormalization";
import { QUERY_KEYS } from "../../../app/config/constants";
import { notify } from "../../../components/ui/toast";

const MAX_CONCURRENT_UPLOADS = 3;

export function useUploadQueue() {
  const [queue, setQueue] = useState<UploadTask[]>([]);
  const queryClient = useQueryClient();
  const activeCountRef = useRef<number>(0);
  const queueRef = useRef<UploadTask[]>([]);
  queueRef.current = queue;

  // Process queued items with concurrency limit
  const processQueue = useCallback(async () => {
    if (activeCountRef.current >= MAX_CONCURRENT_UPLOADS) return;

    const pendingTask = queueRef.current.find((item) => item.status === "queued");
    if (!pendingTask) return;

    activeCountRef.current += 1;
    const abortController = new AbortController();

    // Mark task uploading
    setQueue((prev) =>
      prev.map((item) =>
        item.id === pendingTask.id
          ? {
              ...item,
              status: "uploading",
              progress: 0,
              abortController,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );

    try {
      await uploadApi.executeFileUpload(
        pendingTask.file,
        pendingTask.folderId,
        (progress) => {
          setQueue((prev) =>
            prev.map((item) =>
              item.id === pendingTask.id ? { ...item, progress } : item
            )
          );
        },
        abortController.signal
      );

      // On completion
      setQueue((prev) =>
        prev.map((item) =>
          item.id === pendingTask.id
            ? {
                ...item,
                status: "completed",
                progress: 100,
                abortController: null,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );

      notify.success("Upload complete", `"${pendingTask.filename}" uploaded successfully.`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FILES.ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SEARCH.ALL });
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === pendingTask.id
              ? {
                  ...item,
                  status: "cancelled",
                  abortController: null,
                  updatedAt: new Date().toISOString(),
                }
              : item
          )
        );
        notify.info("Upload cancelled", `Upload for "${pendingTask.filename}" was cancelled.`);
      } else {
        const normalized = normalizeFileError(err);
        setQueue((prev) =>
          prev.map((item) =>
            item.id === pendingTask.id
              ? {
                  ...item,
                  status: "failed",
                  error: normalized.message,
                  abortController: null,
                  updatedAt: new Date().toISOString(),
                }
              : item
          )
        );
        notify.error("Upload failed", `"${pendingTask.filename}": ${normalized.message}`);
      }
    } finally {
      activeCountRef.current = Math.max(0, activeCountRef.current - 1);
    }
  }, [queryClient]);

  // Continuously check and trigger processQueue whenever queue changes
  useEffect(() => {
    const hasQueued = queue.some((item) => item.status === "queued");
    if (hasQueued && activeCountRef.current < MAX_CONCURRENT_UPLOADS) {
      processQueue();
    }
  }, [queue, processQueue]);

  const addFiles = useCallback((files: File[], folderId: string | null = null) => {
    const newTasks: UploadTask[] = [];

    for (const file of files) {
      const validation = validateFileForUpload(file);
      if (!validation.isValid) {
        notify.error("Invalid file", validation.error || "File validation failed.");
        continue;
      }

      const now = new Date().toISOString();
      const task: UploadTask = {
        id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        filename: file.name,
        sizeBytes: file.size,
        contentType: file.type || "application/octet-stream",
        folderId,
        status: "queued",
        progress: 0,
        createdAt: now,
        updatedAt: now,
      };

      newTasks.push(task);
    }

    if (newTasks.length > 0) {
      setQueue((prev) => [...prev, ...newTasks]);
    }
  }, []);

  const cancelUpload = useCallback((taskId: string) => {
    setQueue((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (task && task.abortController) {
        task.abortController.abort();
      }
      return prev.map((t) => (t.id === taskId ? { ...t, status: "cancelled", abortController: null } : t));
    });
  }, []);

  const retryUpload = useCallback((taskId: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === taskId
          ? {
              ...item,
              status: "queued",
              progress: 0,
              error: null,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setQueue((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((t) => t.status !== "completed" && t.status !== "cancelled"));
  }, []);

  const isUploading = queue.some((t) => t.status === "uploading" || t.status === "queued");

  return {
    queue,
    addFiles,
    cancelUpload,
    retryUpload,
    removeTask,
    clearCompleted,
    isUploading,
  };
}
