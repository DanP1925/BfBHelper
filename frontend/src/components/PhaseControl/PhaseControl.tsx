"use client";

import { BATTLE_PHASES } from "../../lib/battle/constants";
import { nextPosition, previousPosition, type RoundPosition } from "../../lib/battle/phase";
import type { BattlePhase } from "../../lib/battle/types";
import styles from "./PhaseControl.module.css";

type PhaseControlProps = {
  round: number;
  phase: BattlePhase;
  onAdvance: () => void;
  onStepBack: () => void;
};

const PHASE_LABELS: Record<BattlePhase, string> = {
  orders: "Orders",
  movement: "Movement",
  action: "Action",
  cleanup: "Cleanup",
};

function positionLabel(pos: RoundPosition): string {
  return `Round ${pos.round}, ${PHASE_LABELS[pos.phase]}`;
}

/** All four phases in a row with the current one highlighted, between a
 * back and a forward arrow (intent/21). Only the arrows step, so a click
 * can never jump across a round. Their labels name where they go, and say
 * when a step passes initiative, since crossing a round does that.
 * Stateless: re-renders from `round` and `phase`. */
export function PhaseControl({ round, phase, onAdvance, onStepBack }: PhaseControlProps) {
  const current = { round, phase };
  const next = nextPosition(current);
  const previous = previousPosition(current);

  const forwardLabel =
    `Forward to ${positionLabel(next)}` + (next.round !== round ? " (passes initiative)" : "");
  const backLabel =
    previous === null
      ? "Already at Round 1, Orders"
      : `Back to ${positionLabel(previous)}` +
        (previous.round !== round ? " (passes initiative back)" : "");

  return (
    <div className={styles.control} role="group" aria-label="Phase">
      <button
        type="button"
        className={styles.arrow}
        aria-label={backLabel}
        title={backLabel}
        disabled={previous === null}
        onClick={onStepBack}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 3.5 5.5 8l4.5 4.5" />
        </svg>
      </button>
      <ol className={styles.phases}>
        {BATTLE_PHASES.map((p) => (
          <li
            key={p}
            className={p === phase ? `${styles.phase} ${styles.current}` : styles.phase}
            aria-current={p === phase ? "step" : undefined}
          >
            {PHASE_LABELS[p]}
          </li>
        ))}
      </ol>
      <button
        type="button"
        className={styles.arrow}
        aria-label={forwardLabel}
        title={forwardLabel}
        onClick={onAdvance}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3.5 10.5 8 6 12.5" />
        </svg>
      </button>
    </div>
  );
}
