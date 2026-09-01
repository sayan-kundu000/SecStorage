import { useState, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "../../../../components/ui/button";

export interface ImageViewerProps {
  url: string;
  filename: string;
  onDownload?: () => void;
}

export function ImageViewer({ url, filename }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isFit, setIsFit] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setIsFit(false);
    setScale((prev) => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setIsFit(false);
    setScale((prev) => Math.max(prev - 0.25, 0.25));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setIsFit(true);
  };

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
          <ImageIcon className="w-8 h-8" />
        </div>
        <div>
          <h4 className="text-base font-semibold text-foreground">Failed to load image</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            The image could not be loaded from storage or may be corrupted.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setHasError(false);
          }}
          className="gap-2 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden bg-neutral-950/80 rounded-2xl border border-border/40 backdrop-blur-md">
      {/* Floating Image Controls Bar */}
      <div className="absolute top-4 z-20 flex items-center gap-1.5 p-1.5 rounded-xl bg-background/80 border border-border/60 shadow-xl backdrop-blur-lg">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={scale <= 0.25}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Zoom Out (-)"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>

        <span className="text-[11px] font-mono font-medium px-2 py-0.5 min-w-[3.5rem] text-center text-foreground">
          {Math.round(scale * 100)}%
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={scale >= 4}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Zoom In (+)"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>

        <div className="w-px h-4 bg-border/80 mx-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={handleRotate}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Rotate 90° Clockwise"
          aria-label="Rotate 90° Clockwise"
        >
          <RotateCw className="w-4 h-4" />
        </Button>

        <Button
          variant={isFit ? "secondary" : "ghost"}
          size="icon"
          onClick={() => {
            if (isFit) {
              setScale(1);
              setIsFit(false);
            } else {
              handleReset();
            }
          }}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title={isFit ? "Original Size (100%)" : "Fit to Screen"}
          aria-label={isFit ? "Original Size" : "Fit to Screen"}
        >
          {isFit ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Reset Zoom & Rotation"
          aria-label="Reset View"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Main Image View Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center p-8 overflow-auto"
      >
        <img
          src={url}
          alt={filename}
          onError={() => setHasError(true)}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
          }}
          className={`max-h-[78vh] max-w-full object-contain rounded-lg shadow-2xl ${
            isFit ? "h-auto w-auto" : ""
          }`}
        />
      </div>
    </div>
  );
}
