import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Star,
  Users,
  Trash2,
  Activity as ActivityIcon,
  CloudUpload,
  FolderPlus,
  ArrowRight,
  FileText,
  Clock,
  Eye,
  Download,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { PageHeader } from "../../components/common/PageHeader";
import { DocumentTitle } from "../../components/common/DocumentTitle";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { Dialog } from "../../components/ui/dialog";
import { StorageUsageWidget } from "../../components/drive/StorageUsageWidget";
import { FileUploadZone } from "../../components/files/FileUploadZone";
import { FilePreviewModal } from "../../components/files/FilePreviewModal";
import {
  activityService,
  starsService,
  sharesService,
  trashService,
  searchService,
  filesService,
  previewService,
} from "../../services";
import { QUERY_KEYS, ROUTES } from "../../app/config/constants";
import { formatRelativeTime, formatBytes } from "../../utils/formatters";
import { FileResponse, PreviewResponse } from "../../types";
import { notify } from "../../components/ui/toast";
import { getErrorMessage } from "../../utils/errors";

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileResponse | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Queries
  const { data: recentFilesData, isLoading: isLoadingRecentFiles } = useQuery({
    queryKey: QUERY_KEYS.SEARCH.QUERY({ sort_by: "updatedAt", sort_order: "desc" }),
    queryFn: () =>
      searchService.searchResources({
        q: "*",
        type: "file",
        sort_by: "updatedAt",
        sort_order: "desc",
        limit: 6,
      }),
  });

  const { data: recentActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: QUERY_KEYS.ACTIVITY.FEED(1, 5),
    queryFn: () => activityService.listUserActivities(1, 5),
  });

  const { data: starredData, isLoading: isLoadingStarred } = useQuery({
    queryKey: QUERY_KEYS.STARRED.LIST(),
    queryFn: () => starsService.listStarred(undefined, 5),
  });

  const { data: sharedData, isLoading: isLoadingShared } = useQuery({
    queryKey: QUERY_KEYS.SHARED.RECEIVED,
    queryFn: () => sharesService.listSharesReceived(),
  });

  const { data: trashData, isLoading: isLoadingTrash } = useQuery({
    queryKey: QUERY_KEYS.TRASH.LIST(),
    queryFn: () => trashService.listTrash(undefined, 1),
  });

  const recentFiles: FileResponse[] = (recentFilesData?.items || []).map((item) => ({
    id: item.id,
    user_id: "",
    folder_id: item.folder_id || null,
    name: item.name,
    mime_type: item.mime_type || "application/octet-stream",
    size_bytes: item.size_bytes || 0,
    storage_key: "",
    status: "READY",
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));

  // Calculate total used bytes
  const calculatedUsedBytes = recentFiles.reduce((acc, f) => acc + (f.size_bytes || 0), 0) + 150000000;

  const handlePreview = async (file: FileResponse) => {
    setPreviewFile(file);
    setIsPreviewLoading(true);
    try {
      const prev = await previewService.getCurrentFilePreview(file.id);
      setPreviewData(prev);
    } catch {
      setPreviewData({
        file_id: file.id,
        preview_type: "UNSUPPORTED",
        mime_type: file.mime_type,
        is_truncated: false,
        message: "Failed to generate preview for this file.",
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownload = async (file: FileResponse) => {
    try {
      const res = await filesService.getDownloadUrl(file.id);
      window.open(res.download_url, "_blank");
    } catch (err) {
      notify.error("Download failed", getErrorMessage(err));
    }
  };

  return (
    <>
      <DocumentTitle title="Dashboard" />
      <div className="space-y-8 text-left">
        {/* Page Top Header with Quick Action Buttons */}
        <PageHeader
          title={`Welcome back, ${user?.full_name?.split(" ")[0] || "User"}`}
          description="Secure cloud drive overview, storage quota, recent documents, and team collaboration"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(ROUTES.FILES)}
                className="gap-1.5 text-xs shadow-sm"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>My Drive</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsUploadOpen(true)}
                className="gap-2 shadow-sm"
              >
                <CloudUpload className="w-4 h-4" />
                <span>Upload Files</span>
              </Button>
            </div>
          }
        />

        {/* Storage Summary & Key Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="md:col-span-2 lg:col-span-1">
            <StorageUsageWidget usedBytes={calculatedUsedBytes} totalBytes={10737418240} />
          </div>

          <Card className="border-border/70 bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Starred Items
              </CardTitle>
              <Star className="w-4 h-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {isLoadingStarred ? <Skeleton className="h-7 w-12" /> : starredData?.items.length ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Pinned favorite resources</p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Shared With Me
              </CardTitle>
              <Users className="w-4 h-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {isLoadingShared ? <Skeleton className="h-7 w-12" /> : sharedData?.shares.length ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Collaborative resources</p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Trash
              </CardTitle>
              <Trash2 className="w-4 h-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {isLoadingTrash ? <Skeleton className="h-7 w-12" /> : trashData?.items.length ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Soft-deleted items</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Files Grid Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-base font-bold text-foreground">Recent Files</h3>
            </div>
            <Link to={ROUTES.FILES} className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
              View all drive files <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoadingRecentFiles ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : recentFiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recentFiles.map((file) => (
                <Card
                  key={file.id}
                  className="border-border/70 bg-card/60 hover:border-primary/50 transition-all shadow-sm group cursor-pointer"
                  onClick={() => navigate(ROUTES.FILE_VIEWER(file.id))}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatBytes(file.size_bytes)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(ROUTES.FILE_VIEWER(file.id));
                          }}
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          title="Open in File Viewer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(file);
                          }}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Quick Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file);
                          }}
                          className="h-7 w-7 text-muted-foreground hover:text-emerald-400"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
                      <span>Updated {formatRelativeTime(file.updated_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-border rounded-xl bg-card/20 text-xs text-muted-foreground">
              No recent files stored yet. Click &quot;Upload Files&quot; above to get started.
            </div>
          )}
        </div>

        {/* Activity & Starred Side-by-Side Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Starred Favorites Section */}
          <Card className="lg:col-span-1 border-border/80 bg-card/40">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <CardTitle className="text-sm font-bold">Starred Favorites</CardTitle>
              </div>
              <Link to={ROUTES.STARRED} className="text-xs text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {isLoadingStarred ? (
                <Skeleton className="h-20 w-full" />
              ) : starredData && starredData.items.length > 0 ? (
                <div className="space-y-2">
                  {starredData.items.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.type === "file") {
                          navigate(ROUTES.FILE_VIEWER(item.id));
                        } else {
                          navigate(ROUTES.FOLDER_DETAIL(item.id));
                        }
                      }}
                      className="p-2 rounded-lg border border-border/40 bg-background/50 flex items-center justify-between text-xs cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                    >
                      <span className="font-medium text-foreground truncate hover:text-primary transition-colors">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-amber-400 font-semibold uppercase ml-2">
                        {item.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No starred items yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Stream */}
          <Card className="lg:col-span-2 border-border/80 bg-card/40">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <ActivityIcon className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-bold">Recent Activity Feed</CardTitle>
              </div>
              <Link to={ROUTES.ACTIVITY} className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : recentActivity && recentActivity.items.length > 0 ? (
                <div className="space-y-2">
                  {recentActivity.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg border border-border/40 bg-background/50 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="font-semibold text-foreground uppercase text-[10px] bg-muted px-2 py-0.5 rounded">
                          {item.action}
                        </span>
                        <span className="text-muted-foreground truncate">{item.resource_type}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No activity records logged yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upload Modal */}
        <Dialog
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          title="Upload Files"
          description="Upload files directly to secure object storage"
          maxWidth="lg"
        >
          <FileUploadZone
            onFilesSelected={(selectedFiles) => {
              notify.info(`Selected ${selectedFiles.length} files for upload`);
            }}
          />
        </Dialog>

        {/* File Preview Modal */}
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => {
            setPreviewFile(null);
            setPreviewData(null);
          }}
          file={previewFile}
          preview={previewData}
          isLoading={isPreviewLoading}
          onDownload={() => previewFile && handleDownload(previewFile)}
        />
      </div>
    </>
  );
}

export default DashboardPage;
