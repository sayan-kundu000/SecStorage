import * as React from "react";
import { cn } from "../../lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
      {...props}
    />
  );
}

export function FileListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/40 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="w-48 h-4 rounded" />
              <Skeleton className="w-24 h-3 rounded" />
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-8">
            <Skeleton className="w-16 h-3 rounded" />
            <Skeleton className="w-24 h-3 rounded" />
            <Skeleton className="w-8 h-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FileGridSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col rounded-xl border border-border/50 bg-card/40 p-4 space-y-3 animate-pulse"
        >
          <Skeleton className="w-full aspect-[4/3] rounded-lg" />
          <div className="space-y-1.5 pt-1">
            <Skeleton className="w-3/4 h-4 rounded" />
            <Skeleton className="w-1/2 h-3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="w-40 h-7 rounded-lg" />
          <Skeleton className="w-64 h-4 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-24 h-9 rounded-md" />
          <Skeleton className="w-28 h-9 rounded-md" />
        </div>
      </div>
      <FileListSkeleton rows={6} />
    </div>
  );
}
