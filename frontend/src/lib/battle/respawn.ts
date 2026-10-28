import type { BattleTeamState, RespawnWindow } from "./types";

/** Each player's starting basic action deck (rulebook p. 6). */
const BASIC_DECK_SIZE = 12;
/** Cards held after every Cleanup draw (rulebook p. 12). Also the fastest
 * draw: discard the whole hand, draw 8. */
const HAND_SIZE = 8;

/** Cards to be drawn before a hero's card that has just gone onto the
 * discard pile (intent/24): every card outside the hand (12 basic plus one
 * power card per level), minus the one on each living hero, which is
 * discarded after it. A defeated hero's levels still count: its power
 * cards are still in the deck. */
export function cardsAhead(team: BattleTeamState): number {
  const levels = Object.values(team.heroes).reduce((sum, hero) => sum + hero.level, 0);
  return BASIC_DECK_SIZE + levels - HAND_SIZE - livingHeroes(team);
}

function livingHeroes(team: BattleTeamState): number {
  return Object.values(team.heroes).filter((hero) => hero.hp > 0).length;
}

/** The respawn window for a hero of `team` defeated in `round`
 * (intent/24). `team` is read after the defeat, so the hero is already at
 * 0 HP. The hero's card is the one after `cardsAhead`, and the defeat
 * round's own Cleanup is the first draw: at the fastest each Cleanup draws
 * HAND_SIZE cards, at the slowest one per living hero. With no hero left
 * standing the slowest draw is 0, so `to` is `null`. No phase is read: a
 * defeat entered after a Cleanup's draws comes out one round early, which
 * an estimate accepts. */
export function respawnWindow(team: BattleTeamState, round: number): RespawnWindow {
  const card = cardsAhead(team) + 1;
  const living = livingHeroes(team);
  return {
    from: round + Math.ceil(card / HAND_SIZE) - 1,
    to: living === 0 ? null : round + Math.ceil(card / living) - 1,
  };
}

/** A window's label (intent/24): "Round 4–6", "Round 4" when both ends
 * match, or "Round 4+" when `to` is `null`. `short` gives "R4–6", "R4"
 * and "R4+", for the Map's team panel row (decided on the canvas). */
export function formatRespawnWindow(window: RespawnWindow, short = false): string {
  const prefix = short ? "R" : "Round ";
  if (window.to === null) return `${prefix}${window.from}+`;
  if (window.to === window.from) return `${prefix}${window.from}`;
  return `${prefix}${window.from}–${window.to}`;
}

/** Whether two windows are the same: both `null`, or the same ends. */
export function sameRespawnWindow(a: RespawnWindow | null, b: RespawnWindow | null): boolean {
  if (a === null || b === null) return a === b;
  return a.from === b.from && a.to === b.to;
}
