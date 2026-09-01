import { useEffect } from "react";

export interface KeyboardShortcutsHandlers {
  onEnter?: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  onSelectAll?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onEnter,
  onDelete,
  onEscape,
  onSelectAll,
  enabled = true,
}: KeyboardShortcutsHandlers) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger global shortcuts if user is typing in an input, textarea, or contentEditable element
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Escape") {
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
      } else if (e.key === "Enter") {
        if (onEnter) {
          e.preventDefault();
          onEnter();
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        // Backspace only triggers if target is not typing field
        if (onDelete && e.key === "Delete") {
          e.preventDefault();
          onDelete();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        if (onSelectAll) {
          e.preventDefault();
          onSelectAll();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onEnter, onDelete, onEscape, onSelectAll, enabled]);
}
