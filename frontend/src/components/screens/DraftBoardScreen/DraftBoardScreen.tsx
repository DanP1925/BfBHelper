import { STEP_SEQUENCE } from "../../../lib/draft/sequence";
import type { Hero, HeroId, PlayerId } from "../../../lib/draft/types";
import { HeroPool } from "../../HeroPool/HeroPool";
import { TeamPanel } from "../../TeamPanel/TeamPanel";
import { TurnBanner } from "../../TurnBanner/TurnBanner";
import styles from "./DraftBoardScreen.module.css";

const TOTAL_STEPS = STEP_SEQUENCE.length;

type DraftBoardScreenProps = {
  initiative: PlayerId;
  stepNumber: number;
  currentTurnPlayer: PlayerId | null;
  picksRemainingThisStep: number;
  pool: Hero[];
  p1Slots: Array<Hero | null>;
  p2Slots: Array<Hero | null>;
  onPick: (heroId: HeroId) => void;
  onNewDraft: () => void;
};

export function DraftBoardScreen({
  initiative,
  stepNumber,
  currentTurnPlayer,
  picksRemainingThisStep,
  pool,
  p1Slots,
  p2Slots,
  onPick,
  onNewDraft,
}: DraftBoardScreenProps) {
  const initiativeLabel = initiative === "p1" ? "Player 1" : "Player 2";

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>Battle for Biternia</span>
          <span className={styles.subtitle}>Initiative: {initiativeLabel}</span>
        </div>
        <TurnBanner
          stepNumber={stepNumber}
          totalSteps={TOTAL_STEPS}
          currentTurnPlayer={currentTurnPlayer}
          picksRemainingThisStep={picksRemainingThisStep}
        />
      </div>

      <div className={styles.body}>
        <TeamPanel
          label="Player 1"
          side="p1"
          active={currentTurnPlayer === "p1"}
          slots={p1Slots}
        />
        <HeroPool heroes={pool} onPick={onPick} />
        <TeamPanel
          label="Player 2"
          side="p2"
          active={currentTurnPlayer === "p2"}
          slots={p2Slots}
        />
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.newDraftButton} onClick={onNewDraft}>
          New Draft
        </button>
      </div>
    </div>
  );
}
