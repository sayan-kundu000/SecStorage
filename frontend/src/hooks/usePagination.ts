import { useCallback, useState } from "react";

export function usePagination(initialPage = 1, initialPageSize = 20) {
  const [page, setPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  const nextPageWithCursor = useCallback((nextCursor?: string | null) => {
    if (nextCursor) {
      setCursorHistory((prev) => (cursor ? [...prev, cursor] : prev));
      setCursor(nextCursor);
      setPage((p) => p + 1);
    }
  }, [cursor]);

  const prevPageWithCursor = useCallback(() => {
    if (cursorHistory.length > 0) {
      const prevCursor = cursorHistory[cursorHistory.length - 1];
      setCursorHistory((prev) => prev.slice(0, -1));
      setCursor(prevCursor === "" ? undefined : prevCursor);
      setPage((p) => Math.max(1, p - 1));
    } else {
      setCursor(undefined);
      setPage(1);
    }
  }, [cursorHistory]);

  const resetPagination = useCallback(() => {
    setPage(1);
    setCursor(undefined);
    setCursorHistory([]);
  }, []);

  return {
    page,
    pageSize,
    cursor,
    setPage,
    setPageSize,
    setCursor,
    nextPageWithCursor,
    prevPageWithCursor,
    resetPagination,
    canGoPrev: page > 1 || cursorHistory.length > 0,
  };
}
