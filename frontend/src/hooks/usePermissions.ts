import { useMemo } from "react";
import { useAuth } from "./useAuth";

export interface ResourcePermissionCheck {
  user_id?: string;
  created_by?: string;
  permission?: "EDITOR" | "VIEWER" | string;
}

export function usePermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    const isAdmin = !!user?.is_admin;
    const currentUserId = user?.id;

    const isOwner = (resource?: ResourcePermissionCheck): boolean => {
      if (!currentUserId || !resource) return false;
      return resource.user_id === currentUserId || resource.created_by === currentUserId;
    };

    const isEditor = (resource?: ResourcePermissionCheck): boolean => {
      if (!resource) return false;
      return isOwner(resource) || resource.permission === "EDITOR";
    };

    const isViewer = (resource?: ResourcePermissionCheck): boolean => {
      if (!resource) return false;
      return isOwner(resource) || resource.permission === "EDITOR" || resource.permission === "VIEWER";
    };

    return {
      isAdmin,
      isOwner,
      isEditor,
      isViewer,
      canRead: (resource?: ResourcePermissionCheck): boolean => {
        if (isAdmin) return true;
        if (!resource) return true;
        return isViewer(resource);
      },
      canEdit: (resource?: ResourcePermissionCheck): boolean => {
        if (isAdmin) return true;
        if (!resource) return true;
        return isEditor(resource);
      },
      canDelete: (resource?: ResourcePermissionCheck): boolean => {
        if (isAdmin) return true;
        if (!resource) return true;
        return isOwner(resource);
      },
      canShare: (resource?: ResourcePermissionCheck): boolean => {
        if (isAdmin) return true;
        if (!resource) return true;
        return isOwner(resource);
      },
      canDownload: (resource?: ResourcePermissionCheck): boolean => {
        if (isAdmin) return true;
        if (!resource) return true;
        return isViewer(resource);
      },
      canRestore: (resource?: ResourcePermissionCheck): boolean => {
        if (isAdmin) return true;
        if (!resource) return true;
        return isOwner(resource);
      },
      canViewAudit: isAdmin,
    };
  }, [user]);
}
