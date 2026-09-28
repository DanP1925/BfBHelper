"use client";

import { useLayoutEffect, useRef, useState } from "react";

type Layout = { columns: number; cardWidth: number };

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
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || itemCount === 0) return;

    const compute = () => {
      const height = el.clientHeight;
      if (height <= 0) return;

      let best: Layout | null = null;
      let bestMeetsMin: Layout | null = null;
      for (const columns of columnOptions) {
        const rows = Math.ceil(itemCount / columns);
        const cardHeight = (height - gap * (rows - 1)) / rows;
        const cardWidth = Math.min(cardHeight * aspectRatio, maxCardWidth);
        if (cardWidth <= 0) continue;
        if (!best || cardWidth > best.cardWidth) {
          best = { columns, cardWidth };
        }
        if (
          cardWidth >= minCardWidth &&
          (!bestMeetsMin || cardWidth > bestMeetsMin.cardWidth)
        ) {
          bestMeetsMin = { columns, cardWidth };
        }
      }

      const next = bestMeetsMin ?? best;
      if (next) setLayout(next);
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [itemCount, aspectRatio, gap, columnOptions, minCardWidth, maxCardWidth]);

  return { containerRef, ...layout };
}
