import "@testing-library/jest-dom/vitest";

// jsdom has no ResizeObserver. useFitGrid and useHeightFitColumns only need
// one to exist: their grids measure as 0x0 in jsdom either way.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
