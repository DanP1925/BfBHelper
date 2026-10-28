import { BATTLE_PHASES, BATTLE_STARTING_ROUND, CLEANUP_GOLD } from "./constants";
import type { BattlePhase } from "./types";

/** Where the game is in its rounds (intent/21). */
export type RoundPosition = { round: number; phase: BattlePhase };

/** Where every battle starts: Round 1, Orders. Deployment is setup, not a
 * phase (intent/21). Old saves upgrade to it too. */
export const BATTLE_START: RoundPosition = {
  round: BATTLE_STARTING_ROUND,
  phase: BATTLE_PHASES[0],
};

const LAST_PHASE_INDEX = BATTLE_PHASES.length - 1;

/** Whether a step from `from` to `to` crosses a round, which passes
 * initiative (intent/21). The one place that rule lives: useBattle passes
 * on it, and PhaseControl announces it. */
export function crossesRound(from: RoundPosition, to: RoundPosition): boolean {
  return from.round !== to.round;
}

/** The gold each team gains or gives back on a step from `from` to `to`
 * (intent/25): +2 entering Cleanup from Action, −2 stepping back from
 * Cleanup to Action, else 0. Stepping back from Orders into the previous
 * round's Cleanup pays nothing: the gold was paid on the way in. */
export function cleanupGoldChange(from: RoundPosition, to: RoundPosition): number {
  if (from.round !== to.round) return 0;
  if (from.phase === "action" && to.phase === "cleanup") return CLEANUP_GOLD;
  if (from.phase === "cleanup" && to.phase === "action") return -CLEANUP_GOLD;
  return 0;
}

/** The next phase (intent/21): Cleanup moves on to the next round's
 * Orders. */
export function nextPosition({ round, phase }: RoundPosition): RoundPosition {
  const index = BATTLE_PHASES.indexOf(phase);
  if (index === LAST_PHASE_INDEX) return { round: round + 1, phase: BATTLE_PHASES[0] };
  return { round, phase: BATTLE_PHASES[index + 1] };
}

/** The previous phase, or `null` at Round 1, Orders: the battle can't step
 * back past its start (intent/21). Orders moves back to the previous
 * round's Cleanup. */
export function previousPosition({ round, phase }: RoundPosition): RoundPosition | null {
  const index = BATTLE_PHASES.indexOf(phase);
  if (index > 0) return { round, phase: BATTLE_PHASES[index - 1] };
  if (round <= BATTLE_STARTING_ROUND) return null;
  return { round: round - 1, phase: BATTLE_PHASES[LAST_PHASE_INDEX] };
}
