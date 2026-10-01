"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { pickBestColumnLayout } from "./gridFit";

type Layout = {
  columns: number;
  cardWidth: number;
  /** True when no candidate reaches minCardWidth within the available height — the caller should allow scrolling to reveal full-size (minCardWidth) cards instead of shrinking past readability. */
  overflows: boolean;
};

type UseHeightFitColumnsOptions = {
  itemCount: number;
  /** width / height of one card. */
  aspectRatio: number;
  gap: number;
  /** Candidate column counts to choose between (e.g. [1, 2], or a fixed [2]). */
  columnOptions: readonly number[];
  /** Readability floor — prefer the widest candidate that still meets it. */
  minCardWidth?: number;
  /** Purely aesthetic cap so cards don't grow arbitrarily large when there's lots of room. */
  maxCardWidth?: number;
};

/**
 * Picks a column count (from `columnOptions`) and a card width purely from
 * the *height* available to the observed container — deliberately never
 * measuring width. A caller that also sets the observed container's own
 * width from this hook's output (as a team panel or a results card grid
 * does, via its column-track sizing) would otherwise create a
 * self-referential ResizeObserver feedback loop: the measured "available
 * width" would really just be reading back the previous output.
 *
 * When no candidate's height-derived width reaches `minCardWidth`, falls
 * back to `minCardWidth` directly (`overflows: true`) rather than
 * shrinking cards past readability — the container is expected to scroll
 * in that case, since the resulting layout may be taller than available.
 */
export function useHeightFitColumns<T extends HTMLElement>({
  itemCount,
  aspectRatio,
  gap,
  columnOptions,
  minCardWidth = 0,
  maxCardWidth = Infinity,
}: UseHeightFitColumnsOptions) {
  const containerRef = useRef<T | null>(null);
  const [layout, setLayout] = useState<Layout>({
    columns: columnOptions[0] ?? 1,
    cardWidth: 0,
    overflows: false,
  });

  // Kept current via the effect just below (not assigned during render —
  // React disallows writing a ref outside an effect/event handler), so the
  // mount-only observer effect can always call the latest version without
  // itself depending on itemCount/aspectRatio/etc.
  const computeRef = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    computeRef.current = () => {
      const el = containerRef.current;
      if (!el || itemCount === 0) return;

      const height = el.clientHeight;
      if (height <= 0) return;

      const fitting = pickBestColumnLayout(
        columnOptions,
        (columns) => {
          const rows = Math.ceil(itemCount / columns);
          const cardHeight = (height - gap * (rows - 1)) / rows;
          return Math.min(cardHeight * aspectRatio, maxCardWidth);
        },
        minCardWidth,
      );

      if (fitting?.meetsMin) {
        setLayout({ ...fitting.layout, overflows: false });
        return;
      }

      // Nothing reaches minCardWidth within the available height — use
      // minCardWidth directly (ignoring height) so the caller can scroll
      // to reveal full-size cards, instead of silently shrinking past
      // readability.
      const relaxed = pickBestColumnLayout(
        columnOptions,
        () => Math.min(minCardWidth, maxCardWidth),
        minCardWidth,
      );
      if (relaxed) {
        setLayout({ ...relaxed.layout, overflows: true });
      }
    };
  });

  // Mount-only: the observer's identity shouldn't depend on itemCount/etc,
  // just on the container existing (see doc comment above).
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    computeRef.current();
    const observer = new ResizeObserver(() => computeRef.current());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Recompute (without touching the observer) whenever the logical inputs
  // change — e.g. itemCount changing as picks are made/cleared.
  useLayoutEffect(() => {
    computeRef.current();
  }, [itemCount, aspectRatio, gap, columnOptions, minCardWidth, maxCardWidth]);

  return { containerRef, ...layout };
}
