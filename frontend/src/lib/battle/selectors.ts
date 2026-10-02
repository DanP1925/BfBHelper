import type { PlayerId } from "../draft/types";
import type { BattleState } from "./types";

/**
 * The one place battle state is read for a derived conclusion rather than
 * just displayed: `null` unless some side's Bit is at 0 HP, `"draw"` if
 * both are (only reachable via direct-entry, not normal play, but needs a
 * defined answer), otherwise the side whose Bit is *not* at 0.
 */
export function getBattleWinner(state: BattleState): PlayerId | "draw" | null {
  const p1BitDown = state.p1.structures.bit === 0;
  const p2BitDown = state.p2.structures.bit === 0;

  if (p1BitDown && p2BitDown) return "draw";
  if (p1BitDown) return "p2";
  if (p2BitDown) return "p1";
  return null;
}
