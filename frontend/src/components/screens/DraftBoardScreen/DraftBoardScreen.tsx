import { useState } from "react";
import {
  countRemainingByRole,
  filterPoolByRole,
  type RoleFilterValue,
} from "../../../lib/draft/roles";
import { STEP_SEQUENCE } from "../../../lib/draft/sequence";
import type { Hero, HeroId, HeroRole, PlayerId } from "../../../lib/draft/types";
import { HeroPool } from "../../HeroPool/HeroPool";
import { RoleFilter } from "../../RoleFilter/RoleFilter";
import { TeamPanel } from "../../TeamPanel/TeamPanel";
import { TurnBanner } from "../../TurnBanner/TurnBanner";
import styles from "./DraftBoardScreen.module.css";
import { useDraftPickAnimation } from "./useDraftPickAnimation";

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
  /** Called once the draft is done and the last hero has appeared in its
   * slot (intent/10), so the page can move on to the versus finale. */
  onFinalPickLanded?: () => void;
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
  onFinalPickLanded,
}: DraftBoardScreenProps) {
  const initiativeLabel = initiative === "p1" ? "Player 1" : "Player 2";
  const { rootRef, beforePick } = useDraftPickAnimation({
    pool,
    currentTurnPlayer,
    onFinalPickLanded,
  });

  // The role filter (intent/23): the role chosen, and the step it was
  // chosen in. A step is one player's turn, so the choice lapses back to
  // All when the turn passes, without a reset. Keyed on the step rather
  // than the player: steps 1, 3 and 5 are all the initiative player's.
  const [roleChoice, setRoleChoice] = useState<{ step: number; role: HeroRole } | null>(null);
  const roleCounts = countRemainingByRole(pool);
  const activeRole: RoleFilterValue =
    currentTurnPlayer !== null && roleChoice?.step === stepNumber && roleCounts[roleChoice.role] > 0
      ? roleChoice.role
      : "all";

  function handleRoleSelect(role: RoleFilterValue) {
    setRoleChoice(role === "all" ? null : { step: stepNumber, role });
  }

  function handlePick(heroId: HeroId) {
    beforePick(heroId);
    onPick(heroId);
  }

  function handleNewDraft() {
    // A new draft restarts at step 1 on this same mounted board, where a
    // step-1 choice from the old draft would otherwise still match.
    setRoleChoice(null);
    onNewDraft();
  }

  return (
    <div ref={rootRef} className={styles.screen} data-theme="jrpg">
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
        <TeamPanel label="Player 1" side="p1" active={currentTurnPlayer === "p1"} slots={p1Slots} />
        <div className={styles.poolColumn}>
          <RoleFilter active={activeRole} counts={roleCounts} onSelect={handleRoleSelect} />
          <HeroPool heroes={filterPoolByRole(pool, activeRole)} onPick={handlePick} />
        </div>
        <TeamPanel label="Player 2" side="p2" active={currentTurnPlayer === "p2"} slots={p2Slots} />
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.newDraftButton} onClick={handleNewDraft}>
          New Draft
        </button>
      </div>
    </div>
  );
}
