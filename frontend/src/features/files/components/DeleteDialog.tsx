import { ConfirmDialog } from "../../../components/common/ConfirmDialog";

export interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  itemCount?: number;
  isPermanent?: boolean;
  isLoading?: boolean;
  onConfirm: () => Promise<void>;
}

export function DeleteDialog({
  isOpen,
  onClose,
  targetName,
  itemCount = 1,
  isPermanent = false,
  isLoading = false,
  onConfirm,
}: DeleteDialogProps) {
  const isBulk = itemCount > 1;

  const title = isPermanent
    ? isBulk
      ? `Delete ${itemCount} items permanently?`
      : `Delete "${targetName}" permanently?`
    : isBulk
    ? `Move ${itemCount} items to Trash?`
    : `Move "${targetName}" to Trash?`;

  const description = isPermanent
    ? "This action cannot be undone. All file metadata and binary objects will be permanently removed from storage."
    : "Items moved to trash can be restored anytime or deleted permanently.";

  const confirmLabel = isPermanent ? "Delete Permanently" : "Move to Trash";

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      variant="destructive"
      isLoading={isLoading}
      onConfirm={async () => {
        await onConfirm();
        onClose();
      }}
    />
  );
}
