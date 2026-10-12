import type { HeroId, PlayerId } from "../draft/types";
import type { GoldPileSpaceId, MapSpaceId } from "../../data/mapSpaces";

export type StructuresState = {
  top: number;
  middle: number;
  bottom: number;
  bit: number;
};

export type HeroBattleState = {
  hp: number;
  level: number;
  /** +1 Attack tokens on this hero (intent/06). 0..HERO_ATTACK_TOKEN_CEILING,
   * changed only by hand: never cleared on defeat, respawn or a new round. */
  attackTokens: number;
  /** A Confuse token on this hero (intent/07). On/off, not a count:
   * the rules give one top-of-deck card however many are stacked.
   * Changed only by hand: never cleared on defeat, respawn or a new round. */
  confused: boolean;
  /** Immobilized (intent/08): the standee lying on its side. On/off.
   * The app shows it only, never blocks a move, and never clears it:
   * not on a move, defeat, respawn or a new round. */
  immobilized: boolean;
};

export type BattleTeamState = {
  gold: number;
  heroes: Record<HeroId, HeroBattleState>;
  structures: StructuresState;
  /** `null` = this hero is in its team's respawn area (not yet deployed,
   * or defeated and awaiting respawn) — see battle/reducer.ts's
   * SET_HERO_POSITION and useBattle.ts's setHeroHp. */
  heroPositions: Record<HeroId, MapSpaceId | null>;
};

export type BattleState = {
  schemaVersion: 6;
  p1: BattleTeamState;
  p2: BattleTeamState;
  /** The board's 3 neutral bonus-gold piles — shared state, not per-team,
   * unlike everything else on BattleState. */
  goldPiles: Record<GoldPileSpaceId, number>;
  /** Who holds the initiative marker right now (intent/05). Starts on the
   * draft's coin-flip winner and flips on every PASS_INITIATIVE. */
  initiative: PlayerId;
};
