"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { Hero } from "../../lib/draft/types";
import { HeroCard } from "../HeroCard/HeroCard";
import styles from "./TeamPanel.module.css";

const GAP = 10;
const CARD_ASPECT_RATIO = 5 / 7; // width / height
const MAX_CARD_WIDTH = 200;
const MIN_CARD_WIDTH = 110;
const COLUMN_OPTIONS = [1, 2] as const;

type TeamPanelProps = {
  label: string;
  /** Which side's accent border to use for the header underline. */
  side: "p1" | "p2";
  /** True when it's currently this player's turn (highlights the header border). */
  active: boolean;
  /** 4 slots: a Hero for a filled pick, null for an unfilled slot. */
  slots: Array<Hero | null>;
};

type Layout = { columns: number; cardWidth: number };

/**
 * Picks 1 or 2 columns and a card width from the *height* available to the
 * slot list alone. Unlike the hero pool, a team panel's width isn't
 * externally constrained (the pool absorbs whatever's left), so this
 * deliberately never measures width: doing so previously fed the panel's
 * own computed width (set via inline style) back into the ResizeObserver
 * that produced it, oscillating forever ("Maximum update depth exceeded").
 * Height is externally stretched by the row layout, so it's a safe,
 * one-directional input.
 */
function useHeightFitColumns(itemCount: number): {
  containerRef: RefObject<HTMLDivElement | null>;
} & Layout {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<Layout>({ columns: 1, cardWidth: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || itemCount === 0) return;

    const compute = () => {
      const height = el.clientHeight;
      if (height <= 0) return;

      let best: Layout | null = null;
      let bestMeetsMin: Layout | null = null;
      for (const columns of COLUMN_OPTIONS) {
        const rows = Math.ceil(itemCount / columns);
        const cardHeight = (height - GAP * (rows - 1)) / rows;
        const cardWidth = Math.min(
          cardHeight * CARD_ASPECT_RATIO,
          MAX_CARD_WIDTH,
        );
        if (cardWidth <= 0) continue;
        if (!best || cardWidth > best.cardWidth) {
          best = { columns, cardWidth };
        }
        if (cardWidth >= MIN_CARD_WIDTH && (!bestMeetsMin || cardWidth > bestMeetsMin.cardWidth)) {
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
  }, [itemCount]);

  return { containerRef, ...layout };
}

export function TeamPanel({ label, side, active, slots }: TeamPanelProps) {
  const { containerRef, columns, cardWidth } = useHeightFitColumns(
    slots.length,
  );

  const panelWidth =
    cardWidth > 0 ? columns * cardWidth + GAP * (columns - 1) : undefined;

  return (
    <div
      className={styles.panel}
      style={panelWidth ? { width: panelWidth } : undefined}
    >
      <div
        className={styles.header}
        style={{
          borderBottomColor: active
            ? `var(--color-${side})`
            : "var(--color-border)",
        }}
      >
        {label}
      </div>
      <div
        ref={containerRef}
        className={styles.slotList}
        style={{
          gridTemplateColumns:
            cardWidth > 0 ? `repeat(${columns}, ${cardWidth}px)` : undefined,
        }}
      >
        {slots.map((hero, index) =>
          hero ? (
            <HeroCard key={hero.id} hero={hero} variant="slot" />
          ) : (
            <div key={`empty-${index}`} className={styles.emptySlot}>
              <span className={styles.emptyLabel}>Empty</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
