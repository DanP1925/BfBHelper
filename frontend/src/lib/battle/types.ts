import type { HeroId } from "../draft/types";
import type { GoldPileSpaceId, MapSpaceId } from "../../data/mapSpaces";

export type StructuresState = {
  top: number;
  middle: number;
  bottom: number;
  bit: number;
};

export type BattleTeamState = {
  gold: number;
  heroes: Record<HeroId, { hp: number; level: number }>;
  structures: StructuresState;
  /** `null` = this hero is in its team's respawn area (not yet deployed,
   * or defeated and awaiting respawn) — see battle/reducer.ts's
   * SET_HERO_POSITION and useBattle.ts's setHeroHp. */
  heroPositions: Record<HeroId, MapSpaceId | null>;
};

export type BattleState = {
  schemaVersion: 2;
  p1: BattleTeamState;
  p2: BattleTeamState;
  /** The board's 3 neutral bonus-gold piles — shared state, not per-team,
   * unlike everything else on BattleState. */
  goldPiles: Record<GoldPileSpaceId, number>;
};
