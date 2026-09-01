import { Folder, File, Star, Share2, Calendar, HardDrive, User, Tag } from "lucide-react";
import { TargetResource } from "../types/actions";
import { formatBytes, formatDate } from "../../../utils/formatters";

export interface FileDetailsProps {
  resource: TargetResource;
}

export function FileDetails({ resource }: FileDetailsProps) {
  const isFolder = resource.isFolder;

  return (
    <div className="space-y-6 text-xs text-foreground">
      <div className="flex items-center gap-3 pb-4 border-b border-border/80">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          {isFolder ? <Folder className="w-5 h-5" /> : <File className="w-5 h-5" />}
        </div>
        <div className="truncate min-w-0">
          <h4 className="font-semibold text-sm text-foreground truncate">{resource.name}</h4>
          <p className="text-[11px] text-muted-foreground">{isFolder ? "Folder" : resource.mimeType || "File"}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h5 className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">General Info</h5>

        <div className="flex items-start gap-3">
          <HardDrive className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-muted-foreground">Size</p>
            <p className="font-medium">{isFolder ? "Folder" : formatBytes(resource.sizeBytes || 0)}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Tag className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-muted-foreground">Type</p>
            <p className="font-medium break-all">{isFolder ? "Directory" : resource.mimeType || "Binary"}</p>
          </div>
        </div>

        {resource.createdAt && (
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(resource.createdAt)}</p>
            </div>
          </div>
        )}

        {resource.updatedAt && (
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-muted-foreground">Modified</p>
              <p className="font-medium">{formatDate(resource.updatedAt)}</p>
            </div>
          </div>
        )}

        {resource.ownerId && (
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-muted-foreground">Owner ID</p>
              <p className="font-mono text-[11px] text-muted-foreground truncate max-w-[180px]">{resource.ownerId}</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 pt-4 border-t border-border/80">
        <h5 className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Status</h5>

        <div className="flex items-center gap-2">
          <Star className={`w-4 h-4 ${resource.isStarred ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
          <span className="font-medium">{resource.isStarred ? "Starred Favorite" : "Not Starred"}</span>
        </div>

        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">Private (Owner Only)</span>
        </div>
      </div>
    </div>
  );
}
