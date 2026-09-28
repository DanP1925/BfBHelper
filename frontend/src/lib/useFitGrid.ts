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
  /** Force a single column count instead of searching for the best fit (e.g. a team panel's fixed single column). */
  fixedColumns?: number;
  /** Purely aesthetic cap so cards don't grow arbitrarily large when there's lots of room. */
  maxCardWidth?: number;
  /** Readability floor — below this, prefer scrolling over shrinking further. */
  minCardWidth?: number;
};

/**
 * Measures a container via ResizeObserver and computes the largest card
 * width (and column count, unless fixed) that fits `itemCount` cards of a
 * given aspect ratio inside the container's current width AND height with
 * no overflow, while never going below `minCardWidth`. Only when no
 * configuration can satisfy both constraints does it fall back to
 * minCardWidth-sized cards that may overflow the container's height
 * (`overflows: true`), so the caller can allow scrolling in that fallback
 * case rather than shrinking text past readability.
 */
export function useFitGrid<T extends HTMLElement>({
  itemCount,
  aspectRatio,
  gap,
  fixedColumns,
  maxCardWidth = Infinity,
  minCardWidth = 0,
}: UseFitGridOptions) {
  const containerRef = useRef<T | null>(null);
  const [result, setResult] = useState<FitResult>({
    columns: fixedColumns ?? 1,
    cardWidth: 0,
    overflows: false,
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || itemCount === 0) return;

    const compute = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width <= 0 || height <= 0) return;

      const columnCandidates = fixedColumns
        ? [fixedColumns]
        : Array.from({ length: itemCount }, (_, i) => i + 1);

      let best: FitResult | null = null;
      for (const columns of columnCandidates) {
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
        // No configuration keeps every card >= minCardWidth AND fits the
        // available height — use as many minCardWidth-sized columns as the
        // width allows and accept vertical overflow (the caller scrolls)
        // rather than shrinking cards below readability.
        const columns = fixedColumns
          ? fixedColumns
          : Math.max(
              1,
              Math.min(
                itemCount,
                Math.floor((width + gap) / (Math.max(minCardWidth, 1) + gap)),
              ),
            );
        const cardWidth = Math.min(
          (width - gap * (columns - 1)) / columns,
          maxCardWidth,
        );
        best = { columns, cardWidth: Math.max(cardWidth, 0), overflows: true };
      }

      setResult(best);
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [itemCount, aspectRatio, gap, fixedColumns, maxCardWidth, minCardWidth]);

  return { containerRef, ...result };
}
