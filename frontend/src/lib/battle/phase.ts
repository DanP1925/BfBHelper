import { BATTLE_PHASES, BATTLE_STARTING_ROUND } from "./constants";
import type { BattlePhase } from "./types";

/** Where the game is in its rounds (intent/21). */
export type RoundPosition = { round: number; phase: BattlePhase };

const LAST_PHASE_INDEX = BATTLE_PHASES.length - 1;

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
