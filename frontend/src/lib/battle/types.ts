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
  /** A Death Mark token on this hero (intent/09), placed by Kunoichi's
   * Know Your Enemy. On/off: the card only marks unmarked enemies. Only
   * the UI limits it to Kunoichi's enemies (heroSpecificTokens.ts).
   * Changed only by hand: never cleared on defeat (either hero's),
   * respawn or a new round. */
  deathMarked: boolean;
  /** Shield tokens on this hero (intent/11), given by Cyrus's Holy Aura
   * and power cards. 0..HERO_SHIELD_TOKEN_CEILING. Only the UI limits it
   * to Cyrus's team (heroSpecificTokens.ts). Changed only by hand: never
   * spent on damage, and never cleared on defeat (either hero's),
   * respawn or a new round. */
  shieldTokens: number;
  /** Stone tokens on this hero (intent/12), given by Sedusa's Stony
   * Glare and power cards. 0..HERO_STONE_TOKEN_CEILING. Only the UI
   * limits it to Sedusa's enemies (heroSpecificTokens.ts). Changed only
   * by hand: reaching 3 doesn't defeat the hero, and defeat, respawn
   * and a new round don't clear it. */
  stoneTokens: number;
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
  schemaVersion: 9;
  p1: BattleTeamState;
  p2: BattleTeamState;
  /** The board's 3 neutral bonus-gold piles — shared state, not per-team,
   * unlike everything else on BattleState. */
  goldPiles: Record<GoldPileSpaceId, number>;
  /** Who holds the initiative marker right now (intent/05). Starts on the
   * draft's coin-flip winner and flips on every PASS_INITIATIVE. */
  initiative: PlayerId;
};
