import type { Hero, HeroId, PlayerId } from "../draft/types";
import { otherPlayer } from "../draft/selectors";
import {
  clampGold,
  clampGoldPile,
  clampHeroCountedToken,
  clampHeroHp,
  clampHeroLevel,
  clampIceWallPct,
  clampStructureHp,
} from "./bounds";
import {
  BIT_STARTING_HP,
  HERO_STARTING_LEVEL,
  TEAM_STARTING_GOLD,
  TOWER_STARTING_HP,
} from "./constants";
import { createFreshGoldPiles, seedHeroPositions } from "../../data/mapSpaces";
import type { GoldPileSpaceId } from "../../data/mapSpaces";
import type {
  BattleState,
  BattleTeamState,
  CountedTokenField,
  HeroBattleState,
  HeroPosition,
  IceWallPosition,
  OnOffTokenField,
  StructuresState,
} from "./types";

export type BattleAction =
  | { type: "SET_GOLD"; side: PlayerId; value: number }
  | { type: "SET_HERO_HP"; side: PlayerId; heroId: HeroId; value: number }
  | { type: "SET_HERO_LEVEL"; side: PlayerId; heroId: HeroId; value: number }
  | {
      type: "SET_HERO_COUNTED_TOKEN";
      side: PlayerId;
      heroId: HeroId;
      field: CountedTokenField;
      value: number;
    }
  | {
      type: "SET_HERO_ON_OFF_TOKEN";
      side: PlayerId;
      heroId: HeroId;
      field: OnOffTokenField;
      value: boolean;
    }
  | { type: "SET_STRUCTURE_HP"; side: PlayerId; slot: keyof StructuresState; value: number }
  | { type: "SET_HERO_POSITION"; side: PlayerId; heroId: HeroId; spaceId: HeroPosition }
  | { type: "SET_GOLD_PILE"; pileId: GoldPileSpaceId; value: number }
  | { type: "SET_ICE_WALL"; position: IceWallPosition | null }
  | { type: "PASS_INITIATIVE" };

function structureCeiling(slot: keyof StructuresState): number {
  return slot === "bit" ? BIT_STARTING_HP : TOWER_STARTING_HP;
}

/** Replaces one already-clamped field on one hero. Same state reference if
 * the hero isn't on that side or the value is unchanged. */
function setHeroField<K extends keyof HeroBattleState>(
  state: BattleState,
  side: PlayerId,
  heroId: HeroId,
  field: K,
  value: HeroBattleState[K],
): BattleState {
  const team = state[side];
  const hero = team.heroes[heroId];
  if (!hero || hero[field] === value) return state;
  return {
    ...state,
    [side]: { ...team, heroes: { ...team.heroes, [heroId]: { ...hero, [field]: value } } },
  };
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

    case "SET_HERO_HP":
      return setHeroField(state, action.side, action.heroId, "hp", clampHeroHp(action.value));

    case "SET_HERO_LEVEL":
      return setHeroField(state, action.side, action.heroId, "level", clampHeroLevel(action.value));

    // Manual only (intents 06, 11-13): nothing else in this reducer ever
    // touches a counted token — not HP to 0 (either hero's defeat), not a
    // position change, not a passed round. Shield is never spent on
    // damage, reaching 3 Stone doesn't defeat the hero, Chill isn't
    // cleared at the end of an action, and one field's write never
    // changes another (Chill isn't netted against +1 Attack). No visibility
    // check: only the UI limits the hero-specific ones to their targets.
    case "SET_HERO_COUNTED_TOKEN":
      return setHeroField(
        state,
        action.side,
        action.heroId,
        action.field,
        clampHeroCountedToken(action.field, action.value),
      );

    // Manual only (intents 07-09, 15): nothing else in this reducer ever
    // touches an on/off token — not HP to 0 (either hero's defeat), not a
    // position change, not a passed round. Immobilize never blocks a move,
    // and Favored Enemy is never moved to another hero. No visibility or
    // one-holder check: only the UI limits the hero-specific ones to their
    // targets, and Favored Enemy to one hero at a time.
    case "SET_HERO_ON_OFF_TOKEN":
      return setHeroField(state, action.side, action.heroId, action.field, action.value);

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

    // Manual only (intent/16): placing, moving and removing (`null`, back to
    // its holder) are all this one action, and nothing else in this reducer
    // touches the wall — not Dazeem's HP to 0, a position change or a passed
    // round. No roster check: only the UI shows it while Dazeem is drafted.
    case "SET_ICE_WALL": {
      const next =
        action.position === null
          ? null
          : {
              xPct: clampIceWallPct(action.position.xPct),
              yPct: clampIceWallPct(action.position.yPct),
            };
      const current = state.iceWall;
      if (next === current) return state;
      if (
        next !== null &&
        current !== null &&
        next.xPct === current.xPct &&
        next.yPct === current.yPct
      ) {
        return state;
      }
      return { ...state, iceWall: next };
    }

    // Initiative always alternates (intent/05's Rules) — no "set to p1/p2"
    // form, and passing twice returns to the starting state, which is how a
    // wrong tap gets undone.
    case "PASS_INITIATIVE":
      return { ...state, initiative: otherPlayer(state.initiative) };

    default:
      return state;
  }
}

/** A fresh hero's stat block: starting HP is base HP plus starting level
 * (rulebook, "Prepare the Hero Mats" step 3). Clamped like every other
 * write path in this file — without that, a future hero whose starting HP
 * exceeds HERO_HP_CEILING would create a battle state that
 * loadBattleState's own validator would then reject as corrupt on the
 * very next reload. Every hero starts with no +1 Attack tokens,
 * unconfused, standing (not immobilized), unmarked, with no Shield
 * tokens, no Stone tokens, no Chill tokens and no Favored Enemy. */
export function createInitialHeroState(hero: Hero): HeroBattleState {
  return {
    hp: clampHeroHp(hero.baseHp + HERO_STARTING_LEVEL),
    level: HERO_STARTING_LEVEL,
    attackTokens: 0,
    confused: false,
    immobilized: false,
    deathMarked: false,
    shieldTokens: 0,
    stoneTokens: 0,
    chillTokens: 0,
    favoredEnemy: false,
  };
}

function createInitialTeamState(heroes: Hero[]): BattleTeamState {
  const heroEntries = heroes.map((hero) => [hero.id, createInitialHeroState(hero)] as const);

  return {
    gold: TEAM_STARTING_GOLD,
    heroes: Object.fromEntries(heroEntries) as Record<HeroId, HeroBattleState>,
    structures: {
      top: TOWER_STARTING_HP,
      middle: TOWER_STARTING_HP,
      bottom: TOWER_STARTING_HP,
      bit: BIT_STARTING_HP,
    },
    heroPositions: seedHeroPositions(heroEntries.map(([id]) => id)),
  };
}

/** Builds a fresh `BattleState` from each side's drafted heroes — each
 * hero's starting HP is their own `baseHp` + starting level, not a flat
 * default;
 * every hero starts in its team's respawn area, and every gold pile
 * starts full. `initiative` is the draft's coin-flip winner, who keeps the
 * marker for deployment and Round 1 (rulebook). The Ice Wall starts in its
 * holder, whether or not Dazeem was drafted. */
export function createInitialBattleState(
  p1Heroes: Hero[],
  p2Heroes: Hero[],
  initiative: PlayerId,
): BattleState {
  return {
    schemaVersion: 13,
    p1: createInitialTeamState(p1Heroes),
    p2: createInitialTeamState(p2Heroes),
    goldPiles: createFreshGoldPiles(),
    initiative,
    iceWall: null,
  };
}
