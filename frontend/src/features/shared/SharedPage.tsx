import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, RefreshCw, Folder, FileText, Download, Eye, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { DocumentTitle } from "../../components/common/DocumentTitle";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { FileListSkeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Dialog } from "../../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { sharesService, filesService } from "../../services";
import { QUERY_KEYS, ROUTES } from "../../app/config/constants";
import { formatRelativeTime } from "../../utils/formatters";
import { notify } from "../../components/ui/toast";
import { getErrorMessage } from "../../utils/errors";
import { useFilePreview } from "../files/hooks/useFilePreview";
import { PreviewModal } from "../files/components/PreviewModal";
import { FileDetails } from "../files/components/FileDetails";
import { FileResponse, ShareResponse } from "../../types";

export function SharedPage() {
  const navigate = useNavigate();
  const [detailsTarget, setDetailsTarget] = useState<ShareResponse | null>(null);
  const [previewFile, setPreviewFile] = useState<FileResponse | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.SHARED.RECEIVED,
    queryFn: () => sharesService.listSharesReceived(),
  });

  const { preview, isLoading: isPreviewLoading, loadPreview, clearPreview } = useFilePreview({
    fileId: previewFile?.id,
    isOpen: !!previewFile,
  });

  const shares = data?.shares || [];

  const handlePreviewShare = async (share: ShareResponse) => {
    if (share.file_id) {
      try {
        const fileRes = await filesService.getFile(share.file_id);
        setPreviewFile(fileRes);
      } catch (err) {
        notify.error("Preview failed", getErrorMessage(err));
      }
    }
  };

  const handleDownloadShare = async (share: ShareResponse) => {
    if (share.file_id) {
      try {
        const res = await filesService.getDownloadUrl(share.file_id);
        window.open(res.download_url, "_blank");
      } catch (err) {
        notify.error("Download error", getErrorMessage(err));
      }
    }
  };

  return (
    <>
      <DocumentTitle title="Shared With Me" />
      <div className="space-y-6 text-left">
        <PageHeader
          title="Shared With Me"
          description="Files and directories shared with your account by team collaborators"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-8 gap-1.5 text-xs shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
          }
        />

        {isLoading ? (
          <FileListSkeleton rows={6} />
        ) : isError ? (
          <ErrorState error={error} title="Failed to load shared items" onRetry={() => refetch()} />
        ) : shares.length === 0 ? (
          <EmptyState
            icon={<Users className="w-10 h-10 text-purple-400/60" />}
            title="Nothing shared yet"
            description="When team members share files or folders with your email address, they will appear here."
            actionLabel="My Files"
            onAction={() => navigate(ROUTES.FILES)}
          />
        ) : (
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">Resource</TableHead>
                  <TableHead className="font-semibold">Permission</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Shared On</TableHead>
                  <TableHead className="w-32 text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shares.map((share) => (
                  <TableRow key={share.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {share.resource_type === "folder" ? (
                          <Folder className="w-5 h-5 text-amber-400 shrink-0" />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-xs sm:max-w-md">
                            {share.resource_name ||
                              (share.resource_type === "folder" ? "Shared Folder" : "Shared File")}
                          </p>
                          {share.grantee_email && (
                            <p className="text-[10px] text-muted-foreground">
                              Shared with {share.grantee_email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={share.permission === "EDITOR" ? "default" : "secondary"}>
                        {share.permission}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {formatRelativeTime(share.created_at)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {share.resource_type === "folder" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              share.folder_id && navigate(ROUTES.FOLDER_DETAIL(share.folder_id))
                            }
                            className="h-8 text-xs font-medium"
                          >
                            Open
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePreviewShare(share)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Preview"
                              aria-label="Preview shared file"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadShare(share)}
                              className="h-8 w-8 text-muted-foreground hover:text-emerald-400"
                              title="Download"
                              aria-label="Download shared file"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDetailsTarget(share)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Details"
                          aria-label="View details"
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Preview Modal */}
        <PreviewModal
          isOpen={!!previewFile}
          onClose={() => {
            setPreviewFile(null);
            clearPreview();
          }}
          file={previewFile}
          preview={preview}
          isLoading={isPreviewLoading}
          onDownload={() => previewFile && filesService.getDownloadUrl(previewFile.id).then((res) => window.open(res.download_url, "_blank"))}
          onRetry={() => previewFile && loadPreview(previewFile.id)}
        />

        {/* File Details Dialog */}
        <Dialog
          isOpen={!!detailsTarget}
          onClose={() => setDetailsTarget(null)}
          title="File Details"
        >
          {detailsTarget && (
            <FileDetails
              resource={{
                id: detailsTarget.id,
                name: detailsTarget.resource_name || "Shared Item",
                isFolder: detailsTarget.resource_type === "folder",
                createdAt: detailsTarget.created_at,
                updatedAt: detailsTarget.updated_at,
              }}
            />
          )}
        </Dialog>
      </div>
    </>
  );
}

export default SharedPage;
