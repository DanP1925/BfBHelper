import type { Hero, HeroId, PlayerId } from "../draft/types";
import { clampGold, clampGoldPile, clampHeroHp, clampHeroLevel, clampStructureHp } from "./bounds";
import {
  BIT_STARTING_HP,
  HERO_STARTING_LEVEL,
  TEAM_STARTING_GOLD,
  TOWER_STARTING_HP,
} from "./constants";
import { createFreshGoldPiles, seedHeroPositions } from "../../data/mapSpaces";
import type { GoldPileSpaceId, MapSpaceId } from "../../data/mapSpaces";
import type { BattleState, BattleTeamState, StructuresState } from "./types";

export type BattleAction =
  | { type: "SET_GOLD"; side: PlayerId; value: number }
  | { type: "SET_HERO_HP"; side: PlayerId; heroId: HeroId; value: number }
  | { type: "SET_HERO_LEVEL"; side: PlayerId; heroId: HeroId; value: number }
  | { type: "SET_STRUCTURE_HP"; side: PlayerId; slot: keyof StructuresState; value: number }
  | { type: "SET_HERO_POSITION"; side: PlayerId; heroId: HeroId; spaceId: MapSpaceId | null }
  | { type: "SET_GOLD_PILE"; pileId: GoldPileSpaceId; value: number };

function structureCeiling(slot: keyof StructuresState): number {
  return slot === "bit" ? BIT_STARTING_HP : TOWER_STARTING_HP;
}

/**
 * Pure reducer over the only stored/dispatched battle state. Every branch
 * is a clamp-and-replace on one field — no mutator ever reads or changes a
 * second field (no gold-on-level-up, no HP-from-level, no Tower-to-Bit
 * chip damage), matching intent's player-driven-only scope. Returns the
 * same state reference (no-op) whenever the clamped value already matches
 * the current one, or the targeted hero id doesn't exist on that side —
 * mirrors draftReducer's no-op convention.
 */
export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case "SET_GOLD": {
      const team = state[action.side];
      const nextGold = clampGold(action.value);
      if (nextGold === team.gold) return state;
      return { ...state, [action.side]: { ...team, gold: nextGold } };
    }

    case "SET_HERO_HP": {
      const team = state[action.side];
      const hero = team.heroes[action.heroId];
      if (!hero) return state;
      const nextHp = clampHeroHp(action.value);
      if (nextHp === hero.hp) return state;
      return {
        ...state,
        [action.side]: {
          ...team,
          heroes: { ...team.heroes, [action.heroId]: { ...hero, hp: nextHp } },
        },
      };
    }

    case "SET_HERO_LEVEL": {
      const team = state[action.side];
      const hero = team.heroes[action.heroId];
      if (!hero) return state;
      const nextLevel = clampHeroLevel(action.value);
      if (nextLevel === hero.level) return state;
      return {
        ...state,
        [action.side]: {
          ...team,
          heroes: { ...team.heroes, [action.heroId]: { ...hero, level: nextLevel } },
        },
      };
    }

    case "SET_STRUCTURE_HP": {
      const team = state[action.side];
      const nextHp = clampStructureHp(action.value, structureCeiling(action.slot));
      if (nextHp === team.structures[action.slot]) return state;
      return {
        ...state,
        [action.side]: {
          ...team,
          structures: { ...team.structures, [action.slot]: nextHp },
        },
      };
    }

    case "SET_HERO_POSITION": {
      const team = state[action.side];
      if (!team.heroes[action.heroId]) return state;
      if (team.heroPositions[action.heroId] === action.spaceId) return state;
      return {
        ...state,
        [action.side]: {
          ...team,
          heroPositions: { ...team.heroPositions, [action.heroId]: action.spaceId },
        },
      };
    }

    case "SET_GOLD_PILE": {
      const nextValue = clampGoldPile(action.value);
      if (nextValue === state.goldPiles[action.pileId]) return state;
      return { ...state, goldPiles: { ...state.goldPiles, [action.pileId]: nextValue } };
    }

    default:
      return state;
  }
}

function createInitialTeamState(heroes: Hero[]): BattleTeamState {
  // Clamped through clampHeroHp like every other write path in this file,
  // even though every current hero's baseHp is already under the ceiling
  // — without this, a future hero with baseHp > HERO_HP_CEILING would
  // create a battle state that loadBattleState's own validator would then
  // reject as corrupt on the very next reload.
  const heroEntries = heroes.map(
    (hero) => [hero.id, { hp: clampHeroHp(hero.baseHp), level: HERO_STARTING_LEVEL }] as const,
  );

  return {
    gold: TEAM_STARTING_GOLD,
    heroes: Object.fromEntries(heroEntries) as Record<HeroId, { hp: number; level: number }>,
    structures: {
      top: TOWER_STARTING_HP,
      middle: TOWER_STARTING_HP,
      bottom: TOWER_STARTING_HP,
      bit: BIT_STARTING_HP,
    },
    heroPositions: seedHeroPositions(heroEntries.map(([id]) => id)) as Record<
      HeroId,
      MapSpaceId | null
    >,
  };
}

/** Builds a fresh `BattleState` from each side's drafted heroes — each
 * hero's starting HP comes from their own `baseHp`, not a flat default;
 * every hero starts in its team's respawn area, and every gold pile
 * starts full. */
export function createInitialBattleState(p1Heroes: Hero[], p2Heroes: Hero[]): BattleState {
  return {
    schemaVersion: 2,
    p1: createInitialTeamState(p1Heroes),
    p2: createInitialTeamState(p2Heroes),
    goldPiles: createFreshGoldPiles(),
  };
}
