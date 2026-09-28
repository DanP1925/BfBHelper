"use client";

import { useLayoutEffect, useRef, useState } from "react";

type FitResult = {
  columns: number;
  cardWidth: number;
  /** True when even minCardWidth-sized cards don't fit the container's height — the caller should allow scrolling in this (rare) fallback case. */
  overflows: boolean;
};

type UseFitGridOptions = {
  itemCount: number;
  /** width / height of one card. */
  aspectRatio: number;
  gap: number;
  /** Restrict the search to these column counts (e.g. a team panel choosing between 1 or 2). Defaults to searching every count from 1 to itemCount. */
  columnOptions?: number[];
  /** Purely aesthetic cap so cards don't grow arbitrarily large when there's lots of room. */
  maxCardWidth?: number;
  /** Readability floor — below this, prefer scrolling over shrinking further. */
  minCardWidth?: number;
};

/**
 * Measures a container via ResizeObserver and computes the largest card
 * width (and column count) that fits `itemCount` cards of a given aspect
 * ratio inside the container's current width AND height with no overflow,
 * while never going below `minCardWidth`. Only when no configuration can
 * satisfy both constraints does it fall back to the widest minCardWidth-
 * respecting option available, which may overflow the container's height
 * (`overflows: true`), so the caller can allow scrolling in that fallback
 * case rather than shrinking text past readability.
 */
export function useFitGrid<T extends HTMLElement>({
  itemCount,
  aspectRatio,
  gap,
  columnOptions,
  maxCardWidth = Infinity,
  minCardWidth = 0,
}: UseFitGridOptions) {
  const containerRef = useRef<T | null>(null);
  const [result, setResult] = useState<FitResult>({
    columns: columnOptions?.[0] ?? 1,
    cardWidth: 0,
    overflows: false,
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || itemCount === 0) return;

    // Descending, so that when two column counts tie on cardWidth (e.g. both
    // hit maxCardWidth), the denser one (more columns, fewer rows) wins
    // instead of an arbitrary single column with wasted horizontal space.
    const candidates = (
      columnOptions ?? Array.from({ length: itemCount }, (_, i) => i + 1)
    )
      .slice()
      .sort((a, b) => b - a);

    const compute = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width <= 0 || height <= 0) return;

      let best: FitResult | null = null;
      for (const columns of candidates) {
        const rows = Math.ceil(itemCount / columns);
        const cardWidth = Math.min(
          (width - gap * (columns - 1)) / columns,
          maxCardWidth,
        );
        if (cardWidth < minCardWidth) continue;
        const cardHeight = cardWidth / aspectRatio;
        const totalHeight = cardHeight * rows + gap * (rows - 1);
        if (totalHeight <= height && (!best || cardWidth > best.cardWidth)) {
          best = { columns, cardWidth, overflows: false };
        }
      }

      if (!best) {
        // No candidate keeps every card >= minCardWidth AND fits the
        // available height — pick whichever candidate yields the widest
        // card (ignoring height) and accept vertical overflow (the caller
        // scrolls) rather than shrinking cards below readability.
        for (const columns of candidates) {
          const cardWidth = Math.min(
            (width - gap * (columns - 1)) / columns,
            maxCardWidth,
          );
          if (cardWidth <= 0) continue;
          if (!best || cardWidth > best.cardWidth) {
            best = { columns, cardWidth, overflows: true };
          }
        }
      }

      if (best) setResult(best);
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [itemCount, aspectRatio, gap, columnOptions, maxCardWidth, minCardWidth]);

  return { containerRef, ...result };
}
