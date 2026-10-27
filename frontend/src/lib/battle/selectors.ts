import type { HeroId, PlayerId } from "../draft/types";
import { HERO_STARTING_LEVEL } from "./constants";
import type { BattleState, BattleTeamState } from "./types";

/** The side `heroId` was drafted on, or `null` if neither side has them.
 * The draft never picks a hero twice, so it's at most one side. */
export function heroSide(state: BattleState, heroId: HeroId): PlayerId | null {
  if (heroId in state.p1.heroes) return "p1";
  if (heroId in state.p2.heroes) return "p2";
  return null;
}

/** A team's level (intent/20): the level-ups its heroes have taken, 0 to
 * 12 (4 heroes, each from level 1 to 4). Defeated heroes count, since a
 * hero keeps their level. Each level is already clamped, so no clamp. */
export function teamLevel(team: BattleTeamState): number {
  return Object.values(team.heroes).reduce(
    (sum, hero) => sum + (hero.level - HERO_STARTING_LEVEL),
    0,
  );
}

/**
 * Who won, read from battle state rather than just displayed: `null`
 * unless some side's Bit is at 0 HP, `"draw"` if both are (only reachable
 * via direct-entry, not normal play, but needs a defined answer),
 * otherwise the side whose Bit is *not* at 0.
 */
export function getBattleWinner(state: BattleState): PlayerId | "draw" | null {
  const p1BitDown = state.p1.structures.bit === 0;
  const p2BitDown = state.p2.structures.bit === 0;

  if (p1BitDown && p2BitDown) return "draw";
  if (p1BitDown) return "p2";
  if (p2BitDown) return "p1";
  return null;
}
