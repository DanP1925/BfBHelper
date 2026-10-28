import { HERO_MAX_LEVEL } from "./constants";
import type { HeroId } from "../draft/types";

/** A hero's HP after their level moves by `levelDelta` (intent/19).
 * +1 HP per level gained and -1 per level lost. A defeated hero (0 HP)
 * stays at 0 either way, and a level-down never takes a living hero
 * below 1 HP: it's a correction, not damage, so it never defeats them.
 * The flat HERO_HP_CEILING is applied by the reducer's SET_HERO_HP. */
export function hpAfterLevelChange(hp: number, levelDelta: number): number {
  if (hp === 0) return 0;
  return Math.max(1, hp + levelDelta);
}

/** Ken Obi's "Become the Master" trait: each of his level-ups costs one
 * less gold (intent/22). Named like ARENA_OWNER and ICE_WALL_OWNER. */
const LEVEL_UP_DISCOUNT_OWNER: HeroId = "ken-obi";

/** Gold to raise `heroId` from `level` to `level + 1` (intent/22,
 * rulebook p. 12): the current level plus one, minus one for Ken Obi.
 * `null` at HERO_MAX_LEVEL, where there's no next level to buy. */
export function levelUpCost(heroId: HeroId, level: number): number | null {
  if (level >= HERO_MAX_LEVEL) return null;
  return heroId === LEVEL_UP_DISCOUNT_OWNER ? level : level + 1;
}

/** Gold a level change moves: the sum of each level's price, positive
 * going up (paid) and negative going down (refunded). Each level is paid
 * individually (rulebook p. 12), so 1 → 3 costs 2 + 3 = 5 (Ken Obi:
 * 1 + 2 = 3). */
export function goldForLevelChange(heroId: HeroId, fromLevel: number, toLevel: number): number {
  let gold = 0;
  for (let level = fromLevel; level < toLevel; level++) gold += levelUpCost(heroId, level) ?? 0;
  for (let level = toLevel; level < fromLevel; level++) gold -= levelUpCost(heroId, level) ?? 0;
  return gold;
}

/** Whether a team with `gold` can buy this hero's next level. False at
 * the max level. */
export function canAffordLevelUp(heroId: HeroId, gold: number, level: number): boolean {
  const cost = levelUpCost(heroId, level);
  return cost !== null && gold >= cost;
}
