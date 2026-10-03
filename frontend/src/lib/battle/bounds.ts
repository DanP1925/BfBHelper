import { HERO_HP_CEILING, HERO_MAX_LEVEL, HERO_STARTING_LEVEL } from "./constants";
import { GOLD_PILE_STARTING_COUNT } from "../map/constants";

/**
 * Shared floor/ceiling clamp every mutator and every direct-entry field
 * funnels through. `NaN` (a stray failed parse) falls back to `min` rather
 * than propagating into stored state — `Infinity`/`-Infinity` need no
 * special case, since the ordinary min/max comparisons already cap them.
 */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Gold: floor 0, no ceiling. */
export function clampGold(value: number): number {
  return clamp(value, 0, Infinity);
}

/** Hero HP: floor 0, flat ceiling of 15 for every hero. */
export function clampHeroHp(value: number): number {
  return clamp(value, 0, HERO_HP_CEILING);
}

/** Hero level: floor 1, ceiling HERO_MAX_LEVEL (4). */
export function clampHeroLevel(value: number): number {
  return clamp(value, HERO_STARTING_LEVEL, HERO_MAX_LEVEL);
}

/** Structure HP: floor 0, ceiling is that structure's own starting HP
 * (11 for a Tower, 16 for the Bit) — passed in by the caller rather than
 * hardcoded, since Tower and Bit have different ceilings. */
export function clampStructureHp(value: number, ceiling: number): number {
  return clamp(value, 0, ceiling);
}

/** Gold pile: floor 0, ceiling GOLD_PILE_STARTING_COUNT (3) — both the
 * starting value and the ceiling for each of the board's 3 neutral piles. */
export function clampGoldPile(value: number): number {
  return clamp(value, 0, GOLD_PILE_STARTING_COUNT);
}
