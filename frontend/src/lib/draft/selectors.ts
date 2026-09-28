import type { DraftState, HeroId, PlayerId } from "./types";
import { getCurrentStepIndex, getPicksRequiredForStep, isDraftDone } from "./sequence";

/** Number of team slots each player has (fixed roster size). */
export const TEAM_SIZE = 4;

function otherPlayer(player: PlayerId): PlayerId {
  return player === "p1" ? "p2" : "p1";
}

/** Total picks made by both players combined. */
export function getTotalPicks(state: DraftState): number {
  return state.picks.p1.length + state.picks.p2.length;
}

/** 1-indexed current step (1..5), saturating at 5 once the draft is done. */
export function getCurrentStep(state: DraftState): number {
  return getCurrentStepIndex(getTotalPicks(state));
}

/** How many picks are required within the current step. */
export function getPicksRequiredThisStep(state: DraftState): number {
  return getPicksRequiredForStep(getCurrentStep(state));
}

/**
 * Whose turn it is. Turn alternates by *step* (not by individual pick, i.e.
 * not a snake draft): odd steps (1, 3, 5) belong to the initiative player,
 * even steps (2, 4) belong to the other player. Returns null once the draft
 * is complete (no one's turn).
 */
export function getCurrentTurnPlayer(state: DraftState): PlayerId | null {
  if (isDraftComplete(state)) {
    return null;
  }
  const step = getCurrentStep(state);
  return step % 2 === 1 ? state.initiative : otherPlayer(state.initiative);
}

/**
 * Remaining pickable heroes: `allHeroIds` minus every hero already picked by
 * either player. `allHeroIds` is passed in (rather than imported) so this
 * stays decoupled from wherever the hero roster data ends up living.
 */
export function getRemainingPool(
  state: DraftState,
  allHeroIds: readonly HeroId[],
): HeroId[] {
  const picked = new Set<HeroId>([...state.picks.p1, ...state.picks.p2]);
  return allHeroIds.filter((id) => !picked.has(id));
}

/**
 * A player's derived team slots: their picks in order, padded with `null`
 * placeholders up to `slotCount` (default 4).
 */
export function getTeamSlots(
  state: DraftState,
  player: PlayerId,
  slotCount: number = TEAM_SIZE,
): Array<HeroId | null> {
  const picks = state.picks[player];
  const slots: Array<HeroId | null> = [...picks];
  while (slots.length < slotCount) {
    slots.push(null);
  }
  return slots;
}

/** Whether all 8 picks have been made. */
export function isDraftComplete(state: DraftState): boolean {
  return isDraftDone(getTotalPicks(state));
}
