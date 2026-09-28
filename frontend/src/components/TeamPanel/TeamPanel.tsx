"use client";

import type { Hero } from "../../lib/draft/types";
import { useFitGrid } from "../../lib/useFitGrid";
import { HeroCard } from "../HeroCard/HeroCard";
import styles from "./TeamPanel.module.css";

const GAP = 10;
const CARD_ASPECT_RATIO = 5 / 7;
const MAX_CARD_WIDTH = 200;
const MIN_CARD_WIDTH = 110;

type TeamPanelProps = {
  label: string;
  /** Which side's accent border to use for the header underline. */
  side: "p1" | "p2";
  /** True when it's currently this player's turn (highlights the header border). */
  active: boolean;
  /** 4 slots: a Hero for a filled pick, null for an unfilled slot. */
  slots: Array<Hero | null>;
};

export function TeamPanel({ label, side, active, slots }: TeamPanelProps) {
  const { containerRef, cardWidth, overflows } = useFitGrid<HTMLDivElement>({
    itemCount: slots.length,
    aspectRatio: CARD_ASPECT_RATIO,
    gap: GAP,
    fixedColumns: 1,
    maxCardWidth: MAX_CARD_WIDTH,
    minCardWidth: MIN_CARD_WIDTH,
  });

  return (
    <div
      className={styles.panel}
      style={cardWidth > 0 ? { width: cardWidth } : undefined}
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
        style={{ overflowY: overflows ? "auto" : "hidden" }}
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
