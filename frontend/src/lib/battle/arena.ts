import type { HeroId, PlayerId } from "../draft/types";
import { otherPlayer } from "../draft/selectors";
import { ARENA_POSITION } from "../map/constants";
import type { HeroDragPayload } from "../map/dragPayload";
import type { BattleState } from "./types";

/** The hero whose level-4 power card opens the Arena (intent/14). */
export const ARENA_OWNER: HeroId = "felix";

/** The power card's level. Equal to HERO_MAX_LEVEL today, but kept apart:
 * it's a card fact, not the level cap. */
export const ARENA_UNLOCK_LEVEL = 4;

const SIDES: readonly PlayerId[] = ["p1", "p2"];

/** The side Felix was drafted on, or `null` if he wasn't. Read from the
 * battle state, which is built from the draft, so it agrees with the
 * rosters. */
export function arenaOwnerSide(state: BattleState): PlayerId | null {
  return SIDES.find((side) => ARENA_OWNER in state[side].heroes) ?? null;
}

/** Every hero whose position is the Arena, with their side, P1 first. */
export function arenaOccupants(state: BattleState): HeroDragPayload[] {
  return SIDES.flatMap((side) =>
    (Object.keys(state[side].heroPositions) as HeroId[])
      .filter((heroId) => state[side].heroPositions[heroId] === ARENA_POSITION)
      .map((heroId) => ({ side, heroId })),
  );
}

/** Whether the Map shows the Arena (intent/14, decided 2026-10-17): while
 * anyone is in it, whatever Felix's level or state, so it never hides a
 * hero; otherwise while Felix is drafted, at level 4 and not defeated (not
 * at 0 HP and not in his respawn area). */
export function isArenaShown(state: BattleState): boolean {
  const occupied = SIDES.some((side) =>
    Object.values(state[side].heroPositions).includes(ARENA_POSITION),
  );
  if (occupied) return true;

  const side = arenaOwnerSide(state);
  if (side === null) return false;
  const felix = state[side].heroes[ARENA_OWNER];
  return (
    felix.level >= ARENA_UNLOCK_LEVEL &&
    felix.hp > 0 &&
    state[side].heroPositions[ARENA_OWNER] !== null
  );
}

/** Whether dropping `hero` into the Arena should take effect (intent/14:
 * only Felix and one enemy). Felix's allies are always refused, and so is
 * a second enemy; the enemy already inside doesn't count against itself.
 * It doesn't check HP, level or where the hero comes from, and nothing
 * stops a hero leaving: the players enforce the rest. */
export function canEnterArena(state: BattleState, hero: HeroDragPayload): boolean {
  const ownerSide = arenaOwnerSide(state);
  if (ownerSide === null) return false;
  if (hero.side === ownerSide) return hero.heroId === ARENA_OWNER;

  const enemySide = otherPlayer(ownerSide);
  return arenaOccupants(state).every(
    (occupant) => occupant.side !== enemySide || occupant.heroId === hero.heroId,
  );
}
