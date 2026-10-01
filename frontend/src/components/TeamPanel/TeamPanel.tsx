"use client";

import type { Hero } from "../../lib/draft/types";
import { useHeightFitColumns } from "../../lib/useHeightFitColumns";
import { HeroCard } from "../HeroCard/HeroCard";
import styles from "./TeamPanel.module.css";

const GAP = 10;
// The slot card is a cropped 5:4 image (see HeroCard.module.css) plus a
// fixed-height text caption below it, not a uniform 5:7 shape — so this
// is an approximation of the combined card's width/height across the
// min/max width range below, matching ResultsScreen's same approximation
// (kept in sync with TeamPanel.module.css's .emptySlot aspect-ratio).
const CARD_ASPECT_RATIO = 0.9;
// Lower than before (was 200): at the new, wider 0.9 aspect ratio, panels
// otherwise grow noticeably wider than the old 5:7 full-card cap did,
// squeezing the hero pool's available width more than intended.
const MAX_CARD_WIDTH = 150;
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

export function TeamPanel({ label, side, active, slots }: TeamPanelProps) {
  const { containerRef, columns, cardWidth, overflows } = useHeightFitColumns<HTMLDivElement>({
    itemCount: slots.length,
    aspectRatio: CARD_ASPECT_RATIO,
    gap: GAP,
    columnOptions: COLUMN_OPTIONS,
    minCardWidth: MIN_CARD_WIDTH,
    maxCardWidth: MAX_CARD_WIDTH,
  });

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
          overflowY: overflows ? "auto" : "hidden",
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
