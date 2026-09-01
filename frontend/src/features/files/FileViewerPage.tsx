import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Star,
  Share2,
  Info,
  Maximize,
  Minimize,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { filesService, previewService, starsService, searchService, sharesService } from "../../services";
import { QUERY_KEYS, ROUTES } from "../../app/config/constants";
import { formatBytes, formatRelativeTime } from "../../utils/formatters";
import { Button } from "../../components/ui/button";
import { notify } from "../../components/ui/toast";
import { DocumentTitle } from "../../components/common/DocumentTitle";
import {
  ImageViewer,
  PdfViewer,
  TextViewer,
  MediaViewer,
  UnsupportedViewer,
} from "./components/viewers";
import { RenameDialog, DeleteDialog } from "./index";
import { ShareDialog } from "../../components/files/ShareDialog";


export function FileViewerPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);

  // 1. Fetch File Metadata
  const {
    data: file,
    isLoading: isLoadingFile,
    isError: isFileError,
    error: fileError,
    refetch: refetchFile,
  } = useQuery({
    queryKey: QUERY_KEYS.FILES.DETAIL(fileId || ""),
    queryFn: () => (fileId ? filesService.getFile(fileId) : null),
    enabled: !!fileId,
  });

  // 2. Fetch File Preview Payload
  const {
    data: preview,
    isLoading: isLoadingPreview,
    isError: isPreviewError,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: QUERY_KEYS.FILES.PREVIEW(fileId || ""),
    queryFn: () => (fileId ? previewService.getCurrentFilePreview(fileId) : null),
    enabled: !!fileId,
  });

  // 3. Fetch Sibling Files in Same Folder for Next/Prev Navigation
  const parentFolderId = file?.folder_id || null;
  const { data: siblingsData } = useQuery({
    queryKey: [...QUERY_KEYS.FILES.LIST(parentFolderId || "root"), { limit: 100 }],
    queryFn: () =>
      searchService.searchResources({
        q: "*",
        folder_id: parentFolderId || undefined,
        type: "file",
        limit: 100,
      }),
    enabled: !!file,
  });

  const siblingFiles = siblingsData?.items || [];
  const currentIndex = siblingFiles.findIndex((item) => item.id === fileId);
  const prevFile = currentIndex > 0 ? siblingFiles[currentIndex - 1] : null;
  const nextFile =
    currentIndex >= 0 && currentIndex < siblingFiles.length - 1
      ? siblingFiles[currentIndex + 1]
      : null;

  // Actions: Download
  const handleDownload = async () => {
    if (!file) return;
    try {
      notify.info("Preparing download...");
      const res = await filesService.getDownloadUrl(file.id);
      const link = document.createElement("a");
      link.href = res.download_url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify.success("Download started", `Downloading "${file.name}"`);
    } catch {
      notify.error("Download failed", "Unable to generate download URL");
    }
  };

  // Actions: Star Mutation
  const starMutation = useMutation({
    mutationFn: async () => {
      if (!file) return;
      return starsService.starFile(file.id);
    },
    onSuccess: () => {
      notify.success("Starred file");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STARRED.ALL });
    },
    onError: () => {
      notify.error("Star failed");
    },
  });

  // Fullscreen Handler
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Keyboard Shortcuts (ArrowLeft, ArrowRight, Escape, F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === "ArrowLeft" && prevFile) {
        navigate(ROUTES.FILE_VIEWER(prevFile.id));
      } else if (e.key === "ArrowRight" && nextFile) {
        navigate(ROUTES.FILE_VIEWER(nextFile.id));
      } else if (e.key === "Escape") {
        if (isFullscreen) {
          document.exitFullscreen?.().catch(() => {});
        } else {
          navigate(parentFolderId ? ROUTES.FOLDER_DETAIL(parentFolderId) : ROUTES.FILES);
        }
      } else if (e.key.toLowerCase() === "i") {
        setShowInfo((prev) => !prev);
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevFile, nextFile, parentFolderId, isFullscreen, navigate, toggleFullscreen]);

  if (isLoadingFile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Opening File Viewer...
        </p>
      </div>
    );
  }

  if (isFileError || !file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Unable to load file</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {(fileError as Error)?.message || "The requested file does not exist or access was denied."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchFile()}
            className="gap-2 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate(ROUTES.FILES)}
            className="gap-2 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Files</span>
          </Button>
        </div>
      </div>
    );
  }

  const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
  const previewType = (preview?.preview_type || "").toUpperCase();

  return (
    <>
      <DocumentTitle title={`${file.name} — SecStorage Viewer`} />

      <div className="flex flex-col h-[calc(100vh-5.5rem)] -mx-4 -my-4 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 overflow-hidden bg-background">
        {/* Top Header Navigation Bar */}
        <header className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border/80 z-30 shrink-0 select-none shadow-sm backdrop-blur-md">
          {/* Left: Back & Breadcrumb / File Title */}
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                navigate(parentFolderId ? ROUTES.FOLDER_DETAIL(parentFolderId) : ROUTES.FILES)
              }
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              title="Back to Files (Esc)"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2 truncate">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                .{ext}
              </span>
              <h2 className="text-sm font-semibold text-foreground truncate max-w-xs sm:max-w-md md:max-w-lg">
                {file.name}
              </h2>
            </div>
          </div>

          {/* Center: Previous / Next Navigation Arrows */}
          <div className="hidden sm:flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/60">
            <Button
              variant="ghost"
              size="icon"
              disabled={!prevFile}
              onClick={() => prevFile && navigate(ROUTES.FILE_VIEWER(prevFile.id))}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title={prevFile ? `Previous: ${prevFile.name} (Left Arrow)` : "No previous file"}
              aria-label="Previous file"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {siblingFiles.length > 0 && (
              <span className="text-[11px] font-mono text-muted-foreground px-2">
                {currentIndex + 1} / {siblingFiles.length}
              </span>
            )}

            <Button
              variant="ghost"
              size="icon"
              disabled={!nextFile}
              onClick={() => nextFile && navigate(ROUTES.FILE_VIEWER(nextFile.id))}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title={nextFile ? `Next: ${nextFile.name} (Right Arrow)` : "No next file"}
              aria-label="Next file"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Right: Actions Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 gap-1.5 text-xs shadow-sm"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Download</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => starMutation.mutate()}
              className="h-8 w-8 text-muted-foreground hover:text-amber-400"
              title="Star / Favorite"
              aria-label="Star"
            >
              <Star className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsShareOpen(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Share File"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsRenameOpen(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Rename File"
              aria-label="Rename"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Toggle Fullscreen (F)"
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>

            <Button
              variant={showInfo ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setShowInfo((prev) => !prev)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Toggle File Details (I)"
              aria-label="File Details"
            >
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Main Viewing Stage & Details Drawer */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Viewer Stage Area */}
          <main className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/10 relative">
            {isLoadingPreview ? (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground font-medium">Preparing format rendering...</p>
              </div>
            ) : isPreviewError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-muted-foreground opacity-60" />
                <p className="text-sm font-semibold text-foreground">Could not generate preview</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchPreview()}
                  className="gap-2 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </Button>
              </div>
            ) : previewType === "IMAGE" && preview?.preview_url ? (
              <ImageViewer url={preview.preview_url} filename={file.name} onDownload={handleDownload} />
            ) : previewType === "PDF" && preview?.preview_url ? (
              <PdfViewer url={preview.preview_url} filename={file.name} onDownload={handleDownload} />
            ) : previewType === "TEXT" && preview ? (
              <TextViewer
                content={preview.text_content || ""}
                filename={file.name}
                mimeType={file.mime_type}
                isTruncated={preview.is_truncated}
              />
            ) : previewType === "VIDEO" && preview?.preview_url ? (
              <MediaViewer
                url={preview.preview_url}
                filename={file.name}
                type="VIDEO"
                onDownload={handleDownload}
              />
            ) : previewType === "AUDIO" && preview?.preview_url ? (
              <MediaViewer
                url={preview.preview_url}
                filename={file.name}
                type="AUDIO"
                onDownload={handleDownload}
              />
            ) : (
              <UnsupportedViewer
                filename={file.name}
                mimeType={file.mime_type}
                sizeBytes={file.size_bytes}
                message={preview?.message || undefined}
                onDownload={handleDownload}
              />
            )}
          </main>

          {/* Right Collapsible Info Panel */}
          {showInfo && (
            <aside className="w-80 border-l border-border/80 bg-card p-5 overflow-y-auto shrink-0 flex flex-col justify-between shadow-2xl z-20 animate-in slide-in-from-right duration-200">
              <div className="space-y-5">
                {/* Panel Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border/70">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    File Properties
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowInfo(false)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    aria-label="Close details panel"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Primary Attributes */}
                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px] mb-1">File Name</span>
                    <span className="font-semibold text-foreground break-all">{file.name}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] mb-1">Size</span>
                    <span className="font-mono text-foreground font-medium">
                      {formatBytes(file.size_bytes)} ({file.size_bytes.toLocaleString()} bytes)
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] mb-1">Content Type</span>
                    <span className="font-mono text-foreground font-medium bg-muted/60 px-2 py-0.5 rounded text-[11px]">
                      {file.mime_type}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] mb-1">Storage Status</span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{file.status || "READY"}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] mb-1">Uploaded Date</span>
                    <div className="flex items-center gap-1.5 text-foreground">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{new Date(file.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] mb-1">Last Modified</span>
                    <span className="text-foreground">{formatRelativeTime(file.updated_at || file.created_at)}</span>
                  </div>

                  {file.checksum && (
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-1">Checksum (SHA-256)</span>
                      <span className="font-mono text-[10px] text-muted-foreground break-all bg-muted/40 p-1.5 rounded block">
                        {file.checksum}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-muted-foreground block text-[11px] mb-1">Object ID</span>
                    <span className="font-mono text-[10px] text-muted-foreground break-all">
                      {file.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Danger Zone Bottom Action */}
              <div className="pt-4 border-t border-border/70 mt-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTrashOpen(true)}
                  className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive gap-2 text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Move to Trash</span>
                </Button>
              </div>
            </aside>
          )}
        </div>

        {/* Rename Dialog */}
        <RenameDialog
          isOpen={isRenameOpen}
          onClose={() => setIsRenameOpen(false)}
          targetName={file.name}
          isFolder={false}
          isLoading={false}
          onRename={async (newName) => {
            await filesService.updateFile(file.id, { name: newName });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FILES.DETAIL(file.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FILES.ALL });
            setIsRenameOpen(false);
          }}
        />

        {/* Share Dialog */}
        <ShareDialog
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          targetId={file.id}
          targetName={file.name}
          isFolder={false}
          isLoading={false}
          onShare={async (email: string, permission: "VIEWER" | "EDITOR") => {
            await sharesService.createShare({
              grantee_email: email,
              permission,
              file_id: file.id,
            });
            setIsShareOpen(false);
          }}
        />

        {/* Delete Dialog */}
        <DeleteDialog
          isOpen={isTrashOpen}
          onClose={() => setIsTrashOpen(false)}
          targetName={file.name}
          isLoading={false}
          onConfirm={async () => {
            await filesService.trashFile(file.id);
            notify.success("Moved to trash", `"${file.name}" was moved to trash.`);
            setIsTrashOpen(false);
            navigate(parentFolderId ? ROUTES.FOLDER_DETAIL(parentFolderId) : ROUTES.FILES);
          }}
        />
      </div>
    </>
  );
}

export default FileViewerPage;
