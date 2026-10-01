export type ColumnLayout = { columns: number; cardWidth: number };

export type ColumnLayoutResult = {
  layout: ColumnLayout;
  /** False when no candidate reached `minCardWidth` — `layout` is the widest available anyway, not a width that meets the floor. */
  meetsMin: boolean;
};

/**
 * Scans `columnOptions`, scoring each via `cardWidthFor(columns)` (which
 * should return `null` for an infeasible candidate), and returns the
 * widest candidate that's >= `minCardWidth`. If none reach it, returns the
 * widest candidate overall instead (`meetsMin: false`), so the caller can
 * decide how to signal that (e.g. allow scrolling rather than shrinking
 * text below readability). Returns `null` only if every candidate was
 * infeasible.
 *
 * Shared by `useFitGrid` and `useHeightFitColumns`, which differ only in
 * what `cardWidthFor` measures (both width and height vs. height alone) —
 * keeping the candidate-scanning/best-tracking logic itself in one place
 * means a fix here (e.g. the min-width fallback below) applies to both.
 */
export function pickBestColumnLayout(
  columnOptions: readonly number[],
  cardWidthFor: (columns: number) => number | null,
  minCardWidth: number,
): ColumnLayoutResult | null {
  let best: ColumnLayout | null = null;
  let bestMeetsMin: ColumnLayout | null = null;

  for (const columns of columnOptions) {
    const cardWidth = cardWidthFor(columns);
    if (cardWidth === null || cardWidth <= 0) continue;

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

  if (bestMeetsMin) return { layout: bestMeetsMin, meetsMin: true };
  if (best) return { layout: best, meetsMin: false };
  return null;
}
