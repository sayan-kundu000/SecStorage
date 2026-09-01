import { useCallback, useMemo, useState } from "react";

export function useSelection<T extends string = string>(initialSelected: T[] = []) {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set(initialSelected));
  const [lastSelectedId, setLastSelectedId] = useState<T | null>(null);

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  const isSelected = useCallback((id: T) => selectedIds.has(id), [selectedIds]);

  const selectSingle = useCallback((id: T) => {
    setSelectedIds(new Set([id]));
    setLastSelectedId(id);
  }, []);

  const toggle = useCallback((id: T) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLastSelectedId(id);
  }, []);

  const selectAll = useCallback((ids: T[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const deselect = useCallback((id: T) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  const handleRowClick = useCallback(
    (id: T, allIds: T[], event?: React.MouseEvent) => {
      if (!event) {
        selectSingle(id);
        return;
      }

      if (event.shiftKey && lastSelectedId && allIds.length > 0) {
        const lastIdx = allIds.indexOf(lastSelectedId);
        const currentIdx = allIds.indexOf(id);

        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx);
          const end = Math.max(lastIdx, currentIdx);
          const range = allIds.slice(start, end + 1);

          setSelectedIds((prev) => {
            const next = new Set(prev);
            range.forEach((item) => next.add(item));
            return next;
          });
          return;
        }
      }

      if (event.ctrlKey || event.metaKey) {
        toggle(id);
      } else {
        selectSingle(id);
      }
    },
    [lastSelectedId, selectSingle, toggle]
  );

  return {
    selectedIds,
    selectedArray,
    selectedCount,
    hasSelection,
    isSelected,
    selectSingle,
    toggle,
    selectAll,
    deselect,
    clear,
    handleRowClick,
  };
}
