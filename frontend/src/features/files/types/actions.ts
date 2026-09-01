export type FileActionType =
  | "open"
  | "preview"
  | "download"
  | "rename"
  | "move"
  | "star"
  | "unstar"
  | "share"
  | "details"
  | "trash"
  | "restore"
  | "purge";

export interface TargetResource {
  id: string;
  name: string;
  isFolder: boolean;
  sizeBytes?: number;
  mimeType?: string;
  folderId?: string | null;
  isStarred?: boolean;
  trashed?: boolean;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActionAvailabilityMatrix {
  open: boolean;
  preview: boolean;
  download: boolean;
  rename: boolean;
  move: boolean;
  star: boolean;
  share: boolean;
  details: boolean;
  trash: boolean;
  restore: boolean;
  purge: boolean;
}

export function getActionAvailability(resource: TargetResource): ActionAvailabilityMatrix {
  const isTrashed = !!resource.trashed;
  const isFolder = resource.isFolder;

  if (isTrashed) {
    return {
      open: false,
      preview: false,
      download: false,
      rename: false,
      move: false,
      star: false,
      share: false,
      details: true,
      trash: false,
      restore: true,
      purge: true,
    };
  }

  return {
    open: isFolder,
    preview: !isFolder,
    download: !isFolder,
    rename: true,
    move: true,
    star: true,
    share: true,
    details: true,
    trash: true,
    restore: false,
    purge: false,
  };
}
