import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSelection } from "../src/hooks/useSelection";

describe("useSelection Hook", () => {
  it("initializes with empty selection", () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.selectedArray).toEqual([]);
  });

  it("selects a single item", () => {
    const { result } = renderHook(() => useSelection());
    act(() => {
      result.current.selectSingle("item-1");
    });
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.isSelected("item-1")).toBe(true);
    expect(result.current.isSelected("item-2")).toBe(false);
  });

  it("toggles item selection", () => {
    const { result } = renderHook(() => useSelection());
    act(() => {
      result.current.toggle("item-1");
    });
    expect(result.current.isSelected("item-1")).toBe(true);

    act(() => {
      result.current.toggle("item-1");
    });
    expect(result.current.isSelected("item-1")).toBe(false);
  });

  it("supports selectAll and clear", () => {
    const { result } = renderHook(() => useSelection());
    act(() => {
      result.current.selectAll(["item-1", "item-2", "item-3"]);
    });
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.selectedArray).toEqual(["item-1", "item-2", "item-3"]);

    act(() => {
      result.current.clear();
    });
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.hasSelection).toBe(false);
  });

  it("handles shift-click range selection", () => {
    const allIds = ["a", "b", "c", "d", "e"];
    const { result } = renderHook(() => useSelection());

    // First click on 'b'
    act(() => {
      result.current.handleRowClick("b", allIds);
    });
    expect(result.current.selectedArray).toEqual(["b"]);

    // Shift click on 'd'
    const shiftEvent = { shiftKey: true } as React.MouseEvent;
    act(() => {
      result.current.handleRowClick("d", allIds, shiftEvent);
    });
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isSelected("b")).toBe(true);
    expect(result.current.isSelected("c")).toBe(true);
    expect(result.current.isSelected("d")).toBe(true);
  });
});
