import type { PlayerId } from "../../lib/draft/types";
import styles from "./TurnBanner.module.css";

type TurnBannerProps = {
  stepNumber: number;
  totalSteps: number;
  /** null once the draft is done (no one's turn). */
  currentTurnPlayer: PlayerId | null;
  picksRemainingThisStep: number;
};

export function TurnBanner({
  stepNumber,
  totalSteps,
  currentTurnPlayer,
  picksRemainingThisStep,
}: TurnBannerProps) {
  const isDone = currentTurnPlayer === null;
  const playerLabel = currentTurnPlayer === "p1" ? "Player 1" : "Player 2";
  const heroWord = picksRemainingThisStep === 1 ? "hero" : "heroes";

  return (
    <div className={styles.banner}>
      <div className={styles.stepLabel}>
        Step {stepNumber} of {totalSteps}
      </div>
      <div
        className={styles.bannerText}
        style={{
          color: isDone
            ? "var(--color-gold)"
            : `var(--color-${currentTurnPlayer})`,
        }}
      >
        {isDone
          ? "Draft complete"
          : `${playerLabel} — pick ${picksRemainingThisStep} more ${heroWord}`}
      </div>
    </div>
  );
}
