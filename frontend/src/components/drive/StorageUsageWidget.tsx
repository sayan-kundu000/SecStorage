import { HardDrive, ShieldCheck } from "lucide-react";
import { formatBytes } from "../../utils/formatters";

export interface StorageUsageWidgetProps {
  usedBytes?: number;
  totalBytes?: number;
  className?: string;
}

export function StorageUsageWidget({
  usedBytes = 3500000000, // 3.5 GB sample/default
  totalBytes = 10737418240, // 10 GB limit
  className = "",
}: StorageUsageWidgetProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((usedBytes / totalBytes) * 100)));

  return (
    <div className={`p-4 rounded-xl border border-border/80 bg-card/60 shadow-sm space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground leading-none">Storage Space</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">Encrypted Object Bucket</p>
          </div>
        </div>
        <span className="text-xs font-bold text-foreground">{percentage}%</span>
      </div>

      {/* Storage Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            percentage > 90
              ? "bg-destructive"
              : percentage > 75
              ? "bg-amber-500"
              : "bg-primary"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
        <span>{formatBytes(usedBytes)} used</span>
        <span>{formatBytes(totalBytes)} total</span>
      </div>

      <div className="flex items-center gap-1.5 pt-1 text-[10px] text-emerald-500 font-medium">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Argon2id & Presigned Upload Protection</span>
      </div>
    </div>
  );
}
