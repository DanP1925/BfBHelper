"use client";

import type { Hero } from "../../../lib/draft/types";
import { useHeightFitColumns } from "../../../lib/useHeightFitColumns";
import { HeroCard } from "../../HeroCard/HeroCard";
import styles from "./ResultsScreen.module.css";

const GAP = 12;
// The result card is now a cropped 5:4 image (see HeroCard.module.css) plus
// a fixed-height text caption below it, not a uniform 5:7 shape — so this
// is an approximation of the combined card's width/height (not the image's
// own ratio) across the min/max width range below, for useHeightFitColumns'
// sizing math. The overflow fallback absorbs the resulting small imprecision.
const CARD_ASPECT_RATIO = 0.9;
const MIN_CARD_WIDTH = 100;
const MAX_CARD_WIDTH = 180;
const COLUMN_OPTIONS = [2] as const;

type TeamResultsProps = {
  label: string;
  side: "p1" | "p2";
  picks: Hero[];
};

function TeamResults({ label, side, picks }: TeamResultsProps) {
  const { containerRef, columns, cardWidth, overflows } =
    useHeightFitColumns<HTMLDivElement>({
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
        style={{
          overflowY: overflows ? "auto" : "hidden",
          gridTemplateColumns:
            cardWidth > 0 ? `repeat(${columns}, ${cardWidth}px)` : undefined,
        }}
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
  onStartBattle: () => void;
};

export function ResultsScreen({
  p1Picks,
  p2Picks,
  onNewDraft,
  onStartBattle,
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
        <button type="button" className={styles.startBattleButton} onClick={onStartBattle}>
          Start Battle →
        </button>
      </div>
    </div>
  );
}
