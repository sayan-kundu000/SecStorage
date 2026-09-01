import {
  filesService,
  foldersService,
  starsService,
  trashService,
  sharesService,
} from "../../../services";
import { FileResponse, FolderResponse } from "../../../types";

export const fileActionsApi = {
  async rename(id: string, newName: string, isFolder: boolean): Promise<FileResponse | FolderResponse> {
    if (isFolder) {
      return foldersService.updateFolder(id, { name: newName.trim() });
    }
    return filesService.updateFile(id, { name: newName.trim() });
  },

  async move(
    id: string,
    destinationFolderId: string | null,
    isFolder: boolean
  ): Promise<FileResponse | FolderResponse> {
    if (isFolder) {
      return foldersService.updateFolder(id, { parent_id: destinationFolderId });
    }
    return filesService.updateFile(id, { folder_id: destinationFolderId });
  },

  async toggleStar(id: string, isFolder: boolean, currentlyStarred: boolean): Promise<void> {
    if (currentlyStarred) {
      if (isFolder) {
        await starsService.unstarFolder(id);
      } else {
        await starsService.unstarFile(id);
      }
    } else {
      if (isFolder) {
        await starsService.starFolder(id);
      } else {
        await starsService.starFile(id);
      }
    }
  },

  async trash(id: string, isFolder: boolean): Promise<void> {
    if (isFolder) {
      await foldersService.trashFolder(id);
    } else {
      await filesService.trashFile(id);
    }
  },

  async restore(id: string, isFolder: boolean): Promise<void> {
    if (isFolder) {
      await trashService.restoreFolder(id);
    } else {
      await trashService.restoreFile(id);
    }
  },

  async purge(id: string, isFolder: boolean): Promise<void> {
    if (isFolder) {
      await trashService.purgeFolder(id);
    } else {
      await trashService.purgeFile(id);
    }
  },

  async share(
    granteeEmail: string,
    permission: "VIEWER" | "EDITOR",
    fileId?: string,
    folderId?: string
  ): Promise<unknown> {
    return sharesService.createShare({
      grantee_email: granteeEmail,
      permission,
      file_id: fileId,
      folder_id: folderId,
    });
  },
};
