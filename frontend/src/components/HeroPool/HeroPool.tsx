"use client";

import type { Hero, HeroId } from "../../lib/draft/types";
import { useFitGrid } from "../../lib/useFitGrid";
import { HeroCard } from "../HeroCard/HeroCard";
import styles from "./HeroPool.module.css";

const GAP = 16;
const CARD_ASPECT_RATIO = 5 / 7;
// Below this, the card art's baked-in name/class text stops being readable —
// prefer letting the pool scroll over shrinking further.
const MIN_CARD_WIDTH = 150;

type HeroPoolProps = {
  heroes: Hero[];
  onPick: (heroId: HeroId) => void;
};

export function HeroPool({ heroes, onPick }: HeroPoolProps) {
  const { containerRef, columns, cardWidth, overflows } =
    useFitGrid<HTMLDivElement>({
      itemCount: heroes.length,
      aspectRatio: CARD_ASPECT_RATIO,
      gap: GAP,
      minCardWidth: MIN_CARD_WIDTH,
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
