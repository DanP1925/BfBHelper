"use client";

import { useMemo } from "react";
import type { Hero, HeroId } from "../../lib/draft/types";
import { useFitGrid } from "../../lib/useFitGrid";
import { HeroCard } from "../HeroCard/HeroCard";
import styles from "./HeroPool.module.css";

const GAP = 16;
const CARD_ASPECT_RATIO = 5 / 7;
// Below this, the card art's baked-in name/class text stops being readable —
// prefer letting the pool scroll over shrinking further.
const MIN_CARD_WIDTH = 150;
// Purely aesthetic — without a cap, cards balloon to fill the row once few
// heroes remain late in the draft (as few as 1 in the last step).
const MAX_CARD_WIDTH = 260;
// However small the window, never wrap to fewer columns than this — the
// pool scrolls vertically instead once 4-wide no longer fits comfortably.
const MIN_COLUMNS = 4;

type HeroPoolProps = {
  heroes: Hero[];
  onPick: (heroId: HeroId) => void;
};

export function HeroPool({ heroes, onPick }: HeroPoolProps) {
  // Memoized: useFitGrid re-subscribes its ResizeObserver whenever this
  // array's reference changes, so a fresh literal every render would
  // re-trigger it on every render — including ones caused by its own
  // setState — producing the same infinite-loop class of bug fixed earlier.
  const columnOptions = useMemo(() => {
    const minColumns = Math.max(1, Math.min(MIN_COLUMNS, heroes.length));
    return Array.from(
      { length: heroes.length - minColumns + 1 },
      (_, i) => minColumns + i,
    );
  }, [heroes.length]);

  const { containerRef, columns, cardWidth, overflows } =
    useFitGrid<HTMLDivElement>({
      itemCount: heroes.length,
      aspectRatio: CARD_ASPECT_RATIO,
      gap: GAP,
      columnOptions,
      minCardWidth: MIN_CARD_WIDTH,
      maxCardWidth: MAX_CARD_WIDTH,
    });

  return (
    <div
      ref={containerRef}
      className={styles.scrollArea}
      style={{ overflowY: overflows ? "auto" : "hidden" }}
    >
      <div
        className={styles.grid}
        style={
          cardWidth > 0
            ? { gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)` }
            : undefined
        }
      >
        {heroes.map((hero) => (
          <HeroCard
            key={hero.id}
            hero={hero}
            variant="pool"
            onClick={() => onPick(hero.id)}
          />
        ))}
      </div>
    </div>
  );
}
