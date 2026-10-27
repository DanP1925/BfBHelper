"use client";

import { BATTLE_PHASES } from "../../lib/battle/constants";
import {
  crossesRound,
  nextPosition,
  previousPosition,
  type RoundPosition,
} from "../../lib/battle/phase";
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

/** An arrow's chevron; `d` is its one path. */
function Chevron({ d }: { d: string }) {
  return (
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
      <path d={d} />
    </svg>
  );
}

/** The round and phase, in the middle of both battle screens' shared top bar
 * (intent/21): a read-only round pill, then all four phases in a row with
 * the current one highlighted, between a back and a forward arrow. Only the
 * arrows step, so the round only changes through them and a click can never
 * jump across a round. Their labels name where they go, and say when a step
 * passes initiative. Stateless: re-renders from `round` and `phase`. */
export function PhaseControl({ round, phase, onAdvance, onStepBack }: PhaseControlProps) {
  const current = { round, phase };
  const next = nextPosition(current);
  const previous = previousPosition(current);

  const forwardLabel =
    `Forward to ${positionLabel(next)}` +
    (crossesRound(current, next) ? " (passes initiative)" : "");
  // `previous` is null only at the battle's start.
  const backLabel =
    previous === null
      ? `Already at ${positionLabel(current)}`
      : `Back to ${positionLabel(previous)}` +
        (crossesRound(current, previous) ? " (passes initiative back)" : "");

  return (
    <div className={styles.group}>
      <div className={`${styles.pill} ${styles.round}`} aria-live="polite">
        <span className={styles.roundLabel}>Round</span>
        <span className={styles.roundValue}>{round}</span>
      </div>
      <div className={`${styles.pill} ${styles.phaseControl}`} role="group" aria-label="Phase">
        <button
          type="button"
          className={styles.arrow}
          aria-label={backLabel}
          title={backLabel}
          disabled={previous === null}
          onClick={onStepBack}
        >
          <Chevron d="M10 3.5 5.5 8l4.5 4.5" />
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
          <Chevron d="M6 3.5 10.5 8 6 12.5" />
        </button>
      </div>
    </div>
  );
}
