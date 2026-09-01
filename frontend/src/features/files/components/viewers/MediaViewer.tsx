import { useRef, useState } from "react";
import {
  Music,
  Gauge,
  Download,
} from "lucide-react";
import { Button } from "../../../../components/ui/button";

export interface MediaViewerProps {
  url: string;
  filename: string;
  type: "AUDIO" | "VIDEO";
  onDownload?: () => void;
}

export function MediaViewer({ url, filename, type, onDownload }: MediaViewerProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = rate;
    }
  };

  const isVideo = type === "VIDEO";

  return (
    <div className="relative w-full h-[80vh] min-h-[480px] flex flex-col items-center justify-center bg-neutral-950/90 rounded-2xl border border-border/50 overflow-hidden shadow-2xl p-6 select-none backdrop-blur-md">
      {/* Floating Speed Bar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-background/80 border border-border/60 shadow-lg backdrop-blur-md text-xs">
        <Gauge className="w-3.5 h-3.5 text-muted-foreground ml-2" />
        <span className="text-[11px] text-muted-foreground font-medium mr-1">Speed:</span>
        {[0.5, 1, 1.25, 1.5, 2].map((speed) => (
          <button
            key={speed}
            onClick={() => handleSpeedChange(speed)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors ${
              playbackRate === speed
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>

      {isVideo ? (
        /* Video Container */
        <div className="relative w-full h-full flex items-center justify-center max-h-[70vh]">
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            controls
            src={url}
            className="w-auto h-auto max-h-full max-w-full rounded-xl shadow-2xl bg-black"
          >
            Your browser does not support video playback.
          </video>
        </div>
      ) : (
        /* Audio Player Card */
        <div className="w-full max-w-lg p-8 rounded-2xl bg-card border border-border/80 shadow-2xl flex flex-col items-center text-center space-y-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-500/20 to-primary/20 border border-purple-500/30 flex items-center justify-center text-primary shadow-inner">
            <Music className="w-12 h-12" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-foreground truncate max-w-sm">{filename}</h3>
            <p className="text-xs text-muted-foreground mt-1">Audio Recording / Track</p>
          </div>

          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            controls
            src={url}
            className="w-full mt-2"
          >
            Your browser does not support audio playback.
          </audio>

          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="gap-2 text-xs shadow-sm mt-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Audio</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
