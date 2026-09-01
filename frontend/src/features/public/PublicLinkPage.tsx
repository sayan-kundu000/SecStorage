import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, Lock, ShieldCheck, FileWarning, Eye } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { FileIcon } from "../../components/files/FileIcon";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { DocumentTitle } from "../../components/common/DocumentTitle";
import { publicLinksService } from "../../services";
import { formatBytes, formatDate } from "../../utils/formatters";
import { notify } from "../../components/ui/toast";
import { getErrorMessage } from "../../utils/errors";
import { PublicResourceMetadataResponse, PreviewResponse } from "../../types";

export function PublicLinkPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [unlockedData, setUnlockedData] = useState<PublicResourceMetadataResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data: initialData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["public-link", token],
    queryFn: () => (token ? publicLinksService.getPublicLinkByToken(token) : null),
    enabled: !!token,
    retry: false,
  });

  const resource = unlockedData || initialData;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password) return;

    setIsVerifying(true);
    try {
      const res = await publicLinksService.verifyPublicLinkPassword(token, { password });
      setUnlockedData(res);
      notify.success("Password verified", "Link unlocked successfully.");
    } catch (err) {
      notify.error("Invalid password", getErrorMessage(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownload = async () => {
    if (!token) return;
    try {
      const res = await publicLinksService.downloadPublicLinkFile(token, password || undefined);
      window.open(res.download_url, "_blank");
    } catch (err) {
      notify.error("Download failed", getErrorMessage(err));
    }
  };

  const handlePreview = async () => {
    if (!token) return;
    try {
      const res = await publicLinksService.previewPublicLinkFile(token, password || undefined);
      setPreviewData(res);
      setIsPreviewOpen(true);
    } catch (err) {
      notify.error("Preview failed", getErrorMessage(err));
    }
  };

  return (
    <>
      <DocumentTitle title={resource ? resource.name : "Public Share Link"} />
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6">
        <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-2">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span>SecStorage Public Link</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-lg">
            {isLoading ? (
              <div className="text-center py-12">
                <LoadingSpinner size="lg" label="Resolving secure public link..." />
              </div>
            ) : isError ? (
              <Card className="border-destructive/30 bg-card p-6 text-center space-y-4 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mx-auto">
                  <FileWarning className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold">Public Link Unavailable</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {getErrorMessage(error) || "This share link may have expired or been revoked by the owner."}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Try Again
                </Button>
              </Card>
            ) : resource?.requires_password && !unlockedData ? (
              <Card className="border-border/80 bg-card shadow-2xl">
                <CardHeader className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl font-bold">Password Protected Link</CardTitle>
                  <CardDescription className="text-xs">
                    This resource requires an access password set by the sender.
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handlePasswordSubmit}>
                  <CardContent className="space-y-4">
                    <Input
                      label="Enter Password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                    />
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button type="submit" variant="default" className="w-full" isLoading={isVerifying}>
                      Unlock Resource
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            ) : resource ? (
              <Card className="border-border/80 bg-card shadow-2xl">
                <CardHeader className="text-center space-y-3 pb-6">
                  <div className="flex justify-center">
                    <FileIcon
                      filename={resource.name}
                      mimeType={resource.mime_type}
                      isFolder={resource.type === "folder"}
                      size="xl"
                    />
                  </div>
                  <CardTitle className="text-lg sm:text-xl font-bold truncate max-w-sm mx-auto" title={resource.name}>
                    {resource.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {resource.type === "folder" ? "Shared Folder" : formatBytes(resource.size_bytes)} • Shared on{" "}
                    {formatDate(resource.created_at)}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {isPreviewOpen && previewData && (
                    <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs max-h-60 overflow-auto">
                      {previewData.preview_type === "IMAGE" && previewData.preview_url && (
                        <img src={previewData.preview_url} alt={resource.name} className="max-h-52 mx-auto rounded" />
                      )}
                      {previewData.preview_type === "TEXT" && (
                        <pre className="font-mono text-[11px] whitespace-pre-wrap">{previewData.text_content}</pre>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handlePreview} className="w-full sm:w-1/2 gap-2">
                    <Eye className="w-4 h-4" />
                    Preview
                  </Button>
                  {resource.allow_download && (
                    <Button variant="default" size="sm" onClick={handleDownload} className="w-full sm:w-1/2 gap-2 shadow-sm">
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ) : null}
          </div>
        </main>

        <footer className="text-center text-[11px] text-muted-foreground py-4 border-t border-border/40">
          Secured by SecStorage Object Architecture
        </footer>
      </div>
    </>
  );
}

export default PublicLinkPage;
