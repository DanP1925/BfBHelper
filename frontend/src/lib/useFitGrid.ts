"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { pickBestColumnLayout } from "./gridFit";

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
 * respecting option available (ignoring height), which may overflow the
 * container's height (`overflows: true`), so the caller can allow
 * scrolling in that fallback case rather than shrinking text past
 * readability. Only drops below `minCardWidth` if truly nothing else fits.
 *
 * The `ResizeObserver` itself is created once per container and never
 * torn down just because `itemCount` (etc.) changed — e.g. HeroPool's
 * `itemCount` changes on every single pick, which previously re-subscribed
 * the observer on every pick for no behavioral benefit. A separate,
 * dependency-driven effect just re-runs the same (ref-stable) compute
 * function instead.
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

  // Kept current via the effect just below (not assigned during render —
  // React disallows writing a ref outside an effect/event handler), so the
  // mount-only observer effect can always call the latest version without
  // itself depending on itemCount/aspectRatio/etc.
  const computeRef = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    computeRef.current = () => {
      const el = containerRef.current;
      if (!el || itemCount === 0) return;

      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width <= 0 || height <= 0) return;

      // Descending, so that when two column counts tie on cardWidth (e.g.
      // both hit maxCardWidth), the denser one (more columns, fewer rows)
      // wins instead of an arbitrary single column with wasted width.
      const candidates = (
        columnOptions ?? Array.from({ length: itemCount }, (_, i) => i + 1)
      )
        .slice()
        .sort((a, b) => b - a);

      const cardWidthForColumns = (columns: number) =>
        Math.min((width - gap * (columns - 1)) / columns, maxCardWidth);

      const fitting = pickBestColumnLayout(
        candidates,
        (columns) => {
          const cardWidth = cardWidthForColumns(columns);
          if (cardWidth <= 0) return null;
          const rows = Math.ceil(itemCount / columns);
          const cardHeight = cardWidth / aspectRatio;
          const totalHeight = cardHeight * rows + gap * (rows - 1);
          return totalHeight <= height ? cardWidth : null;
        },
        minCardWidth,
      );

      if (fitting?.meetsMin) {
        setResult({ ...fitting.layout, overflows: false });
        return;
      }

      // No height-fitting candidate reaches minCardWidth — ignore height
      // and pick the widest minCardWidth-respecting candidate instead
      // (falling back further, below minCardWidth, only if nothing else
      // is feasible).
      const relaxed = pickBestColumnLayout(
        candidates,
        (columns) => cardWidthForColumns(columns),
        minCardWidth,
      );
      if (relaxed) {
        setResult({ ...relaxed.layout, overflows: true });
      }
    };
  });

  // Mount-only: the observer's identity shouldn't depend on itemCount/etc
  // (see doc comment above), just on the container existing.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    computeRef.current();
    const observer = new ResizeObserver(() => computeRef.current());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Recompute (without touching the observer) whenever the logical inputs
  // change — e.g. itemCount shrinking as picks are made.
  useLayoutEffect(() => {
    computeRef.current();
  }, [itemCount, aspectRatio, gap, columnOptions, maxCardWidth, minCardWidth]);

  return { containerRef, ...result };
}
