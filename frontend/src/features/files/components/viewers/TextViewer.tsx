import { useState, useMemo } from "react";
import {
  Copy,
  Check,
  WrapText,
  Table as TableIcon,
  Code as CodeIcon,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../../../../components/ui/button";

export interface TextViewerProps {
  content: string;
  filename: string;
  mimeType?: string;
  isTruncated?: boolean;
}

export function TextViewer({
  content,
  filename,
  isTruncated = false,
}: TextViewerProps) {
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("sm");

  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const isMarkdown = ext === "md" || ext === "markdown";
  const isCsv = ext === "csv";
  const isJson = ext === "json";

  const [activeTab, setActiveTab] = useState<"code" | "preview">(() =>
    isMarkdown ? "preview" : isCsv ? "preview" : "code"
  );

  const lines = useMemo(() => content.split("\n"), [content]);

  // Parse CSV if CSV preview requested
  const csvData = useMemo(() => {
    if (!isCsv || activeTab !== "preview") return null;
    try {
      const rowLines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      return rowLines.map((row) =>
        row.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""))
      );
    } catch {
      return null;
    }
  }, [content, isCsv, activeTab]);

  // Formatted JSON if requested
  const formattedJson = useMemo(() => {
    if (!isJson) return null;
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return null;
    }
  }, [content, isJson]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const fontSizeClass =
    fontSize === "sm" ? "text-xs leading-5" : fontSize === "base" ? "text-sm leading-6" : "text-base leading-7";

  return (
    <div className="relative w-full h-[82vh] min-h-[500px] flex flex-col bg-card/90 rounded-2xl border border-border/80 overflow-hidden shadow-xl backdrop-blur-sm">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-background/60 border-b border-border/70 text-xs backdrop-blur-md">
        {/* Left: View Modes (e.g. Preview vs Raw for Markdown / CSV) */}
        <div className="flex items-center gap-1.5">
          {(isMarkdown || isCsv) && (
            <div className="flex items-center p-0.5 rounded-lg border border-border bg-muted/40">
              <Button
                variant={activeTab === "preview" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("preview")}
                className="h-7 px-2.5 gap-1.5 text-xs rounded-md"
              >
                {isCsv ? <TableIcon className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{isCsv ? "Table View" : "Preview"}</span>
              </Button>
              <Button
                variant={activeTab === "code" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("code")}
                className="h-7 px-2.5 gap-1.5 text-xs rounded-md"
              >
                <CodeIcon className="w-3.5 h-3.5" />
                <span>Raw Text</span>
              </Button>
            </div>
          )}

          <span className="text-[11px] text-muted-foreground font-mono ml-1">
            {lines.length} {lines.length === 1 ? "line" : "lines"} • {content.length.toLocaleString()} chars
          </span>
        </div>

        {/* Right: Display options & Copy */}
        <div className="flex items-center gap-2">
          {/* Line wrap toggle */}
          <Button
            variant={wrapLines ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setWrapLines((prev) => !prev)}
            className="h-7 px-2 gap-1.5 text-xs"
            title="Toggle Line Wrapping"
          >
            <WrapText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Wrap</span>
          </Button>

          {/* Font Size Selector */}
          <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40 text-[11px]">
            {(["sm", "base", "lg"] as const).map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`px-2 py-0.5 rounded-md font-mono transition-colors ${
                  fontSize === size
                    ? "bg-background text-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {size === "sm" ? "A" : size === "base" ? "A+" : "A++"}
              </button>
            ))}
          </div>

          {/* Copy Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2.5 gap-1.5 text-xs"
            title="Copy file text to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </Button>
        </div>
      </div>

      {/* Truncation warning if applicable */}
      {isTruncated && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>File is very large and was truncated for preview performance. Download to inspect all contents.</span>
        </div>
      )}

      {/* Main Content Pane */}
      <div className="flex-1 overflow-auto bg-neutral-950/40 p-4 font-mono">
        {/* CSV Table Preview Mode */}
        {isCsv && activeTab === "preview" && csvData ? (
          <div className="overflow-auto border border-border/80 rounded-xl bg-card">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <tbody>
                {csvData.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={
                      rIdx === 0
                        ? "bg-muted/70 font-semibold border-b border-border text-foreground"
                        : "border-b border-border/40 hover:bg-muted/30 text-foreground/90"
                    }
                  >
                    <td className="p-2 w-12 text-center text-muted-foreground bg-muted/30 border-r border-border/40 font-mono text-[10px]">
                      {rIdx + 1}
                    </td>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2 border-r border-border/30 last:border-r-0 truncate max-w-xs">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isMarkdown && activeTab === "preview" ? (
          /* Rendered Markdown Preview */
          <div className="prose prose-invert max-w-4xl mx-auto p-6 bg-card/60 rounded-xl border border-border/60 font-sans text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        ) : (
          /* Code / Raw Text View with Line Numbers */
          <div className={`flex w-full ${fontSizeClass}`}>
            {/* Gutter (Line Numbers) */}
            <div className="select-none pr-4 text-right text-muted-foreground/40 font-mono text-[11px] border-r border-border/40 shrink-0">
              {lines.map((_, idx) => (
                <div key={idx} className="leading-inherit">
                  {idx + 1}
                </div>
              ))}
            </div>

            {/* Code Content */}
            <div className={`pl-4 flex-1 font-mono ${wrapLines ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"}`}>
              <pre className="font-mono bg-transparent p-0 m-0 border-0 text-foreground/90">
                {formattedJson || content || "(Empty file)"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
