import type { HeroId } from "../draft/types";

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
};

export type BattleState = {
  schemaVersion: 1;
  p1: BattleTeamState;
  p2: BattleTeamState;
};
