"use client";

import type { Hero } from "../../../lib/draft/types";
import { useHeightFitColumns } from "../../../lib/useHeightFitColumns";
import { HeroCard } from "../../HeroCard/HeroCard";
import styles from "./ResultsScreen.module.css";

const GAP = 12;
const CARD_ASPECT_RATIO = 5 / 7;
const MIN_CARD_WIDTH = 100;
const MAX_CARD_WIDTH = 180;
const COLUMN_OPTIONS = [2] as const;

type TeamResultsProps = {
  label: string;
  side: "p1" | "p2";
  picks: Hero[];
};

function TeamResults({ label, side, picks }: TeamResultsProps) {
  const { containerRef, columns, cardWidth } = useHeightFitColumns<HTMLDivElement>({
    itemCount: picks.length,
    aspectRatio: CARD_ASPECT_RATIO,
    gap: GAP,
    columnOptions: COLUMN_OPTIONS,
    minCardWidth: MIN_CARD_WIDTH,
    maxCardWidth: MAX_CARD_WIDTH,
  });

  return (
    <div className={styles.team}>
      <div
        className={styles.teamHeader}
        style={{ borderBottomColor: `var(--color-${side})` }}
      >
        {label}
      </div>
      <div
        ref={containerRef}
        className={styles.grid}
        style={
          cardWidth > 0
            ? { gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)` }
            : undefined
        }
      >
        {picks.map((hero) => (
          <HeroCard key={hero.id} hero={hero} variant="result" />
        ))}
      </div>
    </div>
  );
}

type ResultsScreenProps = {
  p1Picks: Hero[];
  p2Picks: Hero[];
  onNewDraft: () => void;
};

export function ResultsScreen({
  p1Picks,
  p2Picks,
  onNewDraft,
}: ResultsScreenProps) {
  return (
    <div className={styles.screen}>
      <div className={styles.scrollArea}>
        <div className={styles.titleBlock}>
          <div className={styles.eyebrow}>Battle for Biternia</div>
          <div className={styles.title}>Draft Complete</div>
        </div>

        <div className={styles.teams}>
          <TeamResults label="Player 1" side="p1" picks={p1Picks} />
          <TeamResults label="Player 2" side="p2" picks={p2Picks} />
        </div>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.newDraftLink} onClick={onNewDraft}>
          ← New Draft
        </button>
      </div>
    </div>
  );
}
