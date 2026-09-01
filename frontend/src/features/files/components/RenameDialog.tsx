import { useState, useEffect } from "react";
import { Dialog } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

export interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  isFolder: boolean;
  isLoading?: boolean;
  onRename: (newName: string) => Promise<void>;
}

export function RenameDialog({
  isOpen,
  onClose,
  targetName,
  isFolder,
  isLoading = false,
  onRename,
}: RenameDialogProps) {
  const [name, setName] = useState(targetName);

  useEffect(() => {
    setName(targetName);
  }, [targetName, isOpen]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== targetName) {
      await onRename(trimmed);
      onClose();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Rename ${isFolder ? "Folder" : "File"}`}
      description={`Enter a new name for "${targetName}"`}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={!name.trim() || name.trim() === targetName}
            isLoading={isLoading}
            onClick={handleSubmit}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="py-2">
        <Input
          label="New Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim() && name.trim() !== targetName) {
              handleSubmit();
            }
          }}
        />
      </div>
    </Dialog>
  );
}
