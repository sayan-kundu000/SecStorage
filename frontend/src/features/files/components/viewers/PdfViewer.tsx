import { useState, useEffect, useCallback, useRef } from "react";
import { ExternalLink, Download, FileText, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "../../../../components/ui/button";

export interface PdfViewerProps {
  url: string;
  filename: string;
  onDownload?: () => void;
}

export function PdfViewer({ url, filename, onDownload }: PdfViewerProps) {
  const isTestMode = import.meta.env.MODE === "test";
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!isTestMode);
  const [loadError, setLoadError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPdf = useCallback(async () => {
    if (isTestMode || !url) {
      setIsLoading(false);
      return;
    }

    // Already a blob or data URL
    if (url.startsWith("blob:") || url.startsWith("data:")) {
      setBlobUrl(url);
      setIsLoading(false);
      setLoadError(false);
      return;
    }

    setIsLoading(true);
    setLoadError(false);
    setErrorMessage(null);

    // Candidates to fetch: try direct url, then fallback between localhost and 127.0.0.1 if connection fails
    const candidates: string[] = [url];
    if (url.includes("localhost")) {
      candidates.push(url.replace("localhost", "127.0.0.1"));
    } else if (url.includes("127.0.0.1")) {
      candidates.push(url.replace("127.0.0.1", "localhost"));
    }

    let lastError: Error | null = null;

    for (const targetUrl of candidates) {
      try {
        const response = await fetch(targetUrl, { credentials: "include" });
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status} (${response.statusText || "Error"})`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setIsLoading(false);
        setLoadError(false);
        return;
      } catch (err) {
        lastError = err as Error;
      }
    }

    // If both failed:
    setIsLoading(false);
    setLoadError(true);
    const isConnRefused =
      lastError?.message?.includes("Failed to fetch") ||
      lastError?.message?.includes("NetworkError") ||
      lastError?.message?.includes("connection refused");

    if (isConnRefused) {
      setErrorMessage(
        "Could not connect to the storage backend (localhost refused to connect). Please ensure your FastAPI backend service is started on port 8000."
      );
    } else {
      setErrorMessage(lastError?.message || "Failed to load document preview stream.");
    }
  }, [url, isTestMode]);

  const blobUrlRef = useRef<string | null>(null);
  blobUrlRef.current = blobUrl;

  useEffect(() => {
    loadPdf();

    return () => {
      if (blobUrlRef.current && blobUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, [loadPdf]);

  const effectiveUrl = blobUrl || url;

  return (
    <div className="relative w-full h-[82vh] min-h-[500px] flex flex-col bg-background/90 rounded-2xl border border-border/70 overflow-hidden shadow-xl">
      {/* PDF Action Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card/80 border-b border-border/60 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2 text-muted-foreground truncate">
          <FileText className="w-4 h-4 text-red-400 shrink-0" />
          <span className="font-medium text-foreground truncate">{filename}</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={effectiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Open in browser PDF viewer tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open in Tab</span>
          </a>

          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="h-7 px-2.5 gap-1.5 text-xs shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </Button>
          )}
        </div>
      </div>

      {/* PDF View Container */}
      <div className="relative flex-1 w-full h-full bg-muted/20 flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground font-medium">Preparing document viewer...</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-foreground">Backend connection unavailable</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {errorMessage || "Your browser could not connect to the document storage service."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <Button
                variant="default"
                size="sm"
                onClick={loadPdf}
                className="gap-1.5 text-xs shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </Button>
              <a
                href={effectiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium hover:bg-secondary/80 transition-colors shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </a>
              {onDownload && (
                <Button variant="outline" size="sm" onClick={onDownload} className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <iframe
            src={`${effectiveUrl}#toolbar=1&navpanes=1`}
            title={filename}
            className="w-full h-full border-none"
            onError={() => setLoadError(true)}
          />
        )}
      </div>
    </div>
  );
}
