import type { HeroId, PlayerId } from "../draft/types";
import type { BattleState } from "./types";

/** The side `heroId` was drafted on, or `null` if neither side has them.
 * The draft never picks a hero twice, so it's at most one side. */
export function heroSide(state: BattleState, heroId: HeroId): PlayerId | null {
  if (heroId in state.p1.heroes) return "p1";
  if (heroId in state.p2.heroes) return "p2";
  return null;
}

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
