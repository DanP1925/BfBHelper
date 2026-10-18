import type { HeroId, PlayerId } from "../draft/types";
import type { GoldPileSpaceId, MapSpaceId } from "../../data/mapSpaces";
import type { ARENA_POSITION } from "../map/constants";
import type { ARTIFACT_FIELDS, ON_OFF_TOKEN_FIELDS } from "./constants";

/** Where a hero is (intents 04 and 14): a board space, the Arena
 * (intent/14, off the board's spaces), or `null` for its team's respawn
 * area (not yet deployed, or defeated and awaiting respawn) — see
 * battle/reducer.ts's SET_HERO_POSITION and useBattle.ts's setHeroHp. */
export type HeroPosition = MapSpaceId | typeof ARENA_POSITION | null;

export type StructuresState = {
  top: number;
  middle: number;
  bottom: number;
  bit: number;
};

export type HeroBattleState = {
  hp: number;
  level: number;
  /** +1 Attack tokens on this hero (intent/06).
   * 0..HERO_COUNTED_TOKEN_CEILINGS.attackTokens, changed only by hand:
   * never cleared on defeat, respawn or a new round. */
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
   * and power cards. 0..HERO_COUNTED_TOKEN_CEILINGS.shieldTokens. Only the
   * UI limits it to Cyrus's team (heroSpecificTokens.ts). Changed only by
   * hand: never spent on damage, and never cleared on defeat (either
   * hero's), respawn or a new round. */
  shieldTokens: number;
  /** Stone tokens on this hero (intent/12), given by Sedusa's Stony
   * Glare and power cards. 0..HERO_COUNTED_TOKEN_CEILINGS.stoneTokens.
   * Only the UI limits it to Sedusa's enemies (heroSpecificTokens.ts).
   * Changed only by hand: reaching 3 doesn't defeat the hero, and
   * defeat, respawn and a new round don't clear it. */
  stoneTokens: number;
  /** Chill tokens on this hero (intent/13), given by Dazeem's Winter's
   * Chill and power cards: each is -1 to all of the hero's attacks.
   * 0..HERO_COUNTED_TOKEN_CEILINGS.chillTokens. Only the UI limits it to
   * Dazeem's enemies (heroSpecificTokens.ts). Changed only by hand:
   * never cleared at the end of an action, on defeat, respawn or a new
   * round, and never netted against attackTokens. */
  chillTokens: number;
  /** The Favored Enemy token on this hero (intent/15), placed by Boreas at
   * the start of the game. On/off. Only the UI limits it to Boreas's
   * enemies (heroSpecificTokens.ts) and to one hero at a time
   * (BATTLE_TOKENS' oneHolder). Changed only by hand: never cleared on
   * defeat (either hero's), respawn or a new round. */
  favoredEnemy: boolean;
  /** Runika's Artifacts (intent/17): `true` is face-up, `false`
   * face-down. Every hero has them, all face-up, so the shape stays one;
   * only Runika's card and Map line read them (ARTIFACT_OWNER). Changed
   * only by hand: never flipped on a hit, Rest, respawn or defeat. */
  battleFistFaceUp: boolean;
  autoDeflectorFaceUp: boolean;
  shieldAmuletFaceUp: boolean;
};

/** A per-hero counted token's stored field (intents 06, 11, 12, 13). Each
 * one's ceiling is in HERO_COUNTED_TOKEN_CEILINGS, and they share one
 * reducer action (SET_HERO_COUNTED_TOKEN) and one useBattle setter. */
export type CountedTokenField = keyof Pick<
  HeroBattleState,
  "attackTokens" | "shieldTokens" | "stoneTokens" | "chillTokens"
>;

/** A per-hero on/off token's stored field (intents 07-09, 15), read from
 * ON_OFF_TOKEN_FIELDS so the list can't miss one. They share one reducer
 * action (SET_HERO_ON_OFF_TOKEN) and one useBattle setter. */
export type OnOffTokenField = (typeof ON_OFF_TOKEN_FIELDS)[number];

/** One of Runika's Artifacts' stored fields (intent/17), read from
 * ARTIFACT_FIELDS. They share one reducer action (SET_HERO_ARTIFACT) and
 * one useBattle setter. */
export type ArtifactField = (typeof ARTIFACT_FIELDS)[number];

export type BattleTeamState = {
  gold: number;
  heroes: Record<HeroId, HeroBattleState>;
  structures: StructuresState;
  /** Each hero's `HeroPosition`. */
  heroPositions: Record<HeroId, HeroPosition>;
};

/** Where Dazeem's Ice Wall sits on the board art (intent/16), in the same
 * 0-100 percentages as MapSpaceDef's xPct/yPct. Free placement: it isn't
 * tied to a path or to the spaces it separates. */
export type IceWallPosition = { xPct: number; yPct: number };

export type BattleState = {
  schemaVersion: 14;
  p1: BattleTeamState;
  p2: BattleTeamState;
  /** The board's 3 neutral bonus-gold piles — shared state, not per-team,
   * unlike everything else on BattleState. */
  goldPiles: Record<GoldPileSpaceId, number>;
  /** Who holds the initiative marker right now (intent/05). Starts on the
   * draft's coin-flip winner and flips on every PASS_INITIATIVE. */
  initiative: PlayerId;
  /** Dazeem's Ice Wall (intent/16): `null` while it's in its holder.
   * Changed only by hand: never cleared on Dazeem's defeat, a level
   * change or a new round. */
  iceWall: IceWallPosition | null;
};
