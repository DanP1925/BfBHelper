import type { DragEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { mergeDropHandlers } from "./mergeDropHandlers";

function handlers() {
  return { onDragEnter: vi.fn(), onDragOver: vi.fn(), onDragLeave: vi.fn(), onDrop: vi.fn() };
}

describe("mergeDropHandlers", () => {
  it("calls both sides' handlers with the same event", () => {
    const a = handlers();
    const b = handlers();
    const merged = mergeDropHandlers(a, b);
    const event = {} as DragEvent<HTMLElement>;

    for (const name of ["onDragEnter", "onDragOver", "onDragLeave", "onDrop"] as const) {
      merged[name](event);
      expect(a[name]).toHaveBeenCalledWith(event);
      expect(b[name]).toHaveBeenCalledWith(event);
    }
  });
});
