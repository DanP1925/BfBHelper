import { vi } from "vitest";

/** Stubs `window.matchMedia` (absent in jsdom) so that only the
 * reduced-motion query matches, and only when `reduce` is true. Undo with
 * `vi.unstubAllGlobals()`. */
export function stubMatchMedia(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query === "(prefers-reduced-motion: reduce)",
    })),
  );
}
