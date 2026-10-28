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
  ARTIFACTS_FACE_UP,
  BIT_STARTING_HP,
  HERO_STARTING_LEVEL,
  TEAM_STARTING_GOLD,
  TOWER_STARTING_HP,
} from "./constants";
import { BATTLE_START, nextPosition, previousPosition, type RoundPosition } from "./phase";
import { createFreshGoldPiles, seedHeroPositions } from "../../data/mapSpaces";
import type { GoldPileSpaceId, MapSpaceId } from "../../data/mapSpaces";
import type {
  ArtifactField,
  BattleState,
  BattleTeamState,
  CountedTokenField,
  HeroBattleState,
  HeroPosition,
  IceWallPosition,
  OnOffTokenField,
  RespawnWindow,
  StructuresState,
} from "./types";
import { sameRespawnWindow } from "./respawn";

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
  | {
      type: "SET_HERO_ARTIFACT";
      side: PlayerId;
      heroId: HeroId;
      field: ArtifactField;
      faceUp: boolean;
    }
  | { type: "SET_STRUCTURE_HP"; side: PlayerId; slot: keyof StructuresState; value: number }
  | { type: "SET_HERO_POSITION"; side: PlayerId; heroId: HeroId; spaceId: HeroPosition }
  | {
      type: "SET_HERO_RESPAWN_WINDOW";
      side: PlayerId;
      heroId: HeroId;
      window: RespawnWindow | null;
    }
  | { type: "SET_GOLD_PILE"; pileId: GoldPileSpaceId; value: number }
  | { type: "SET_ICE_WALL"; position: IceWallPosition | null }
  | { type: "SET_BEAR_TRAP"; spaceId: MapSpaceId | null }
  | { type: "PASS_INITIATIVE" }
  | { type: "ADVANCE_PHASE" }
  | { type: "STEP_PHASE_BACK" };

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

/** Moves the round and phase together, as one position. Same state
 * reference when there's nowhere to go (`null`). */
function setRoundPosition(state: BattleState, next: RoundPosition | null): BattleState {
  if (next === null) return state;
  return { ...state, round: next.round, phase: next.phase };
}

/**
 * Pure reducer over the only stored/dispatched battle state. Every branch
 * is a clamp-and-replace on one field — no action ever reads or changes a
 * second field (no Tower-to-Bit chip damage), matching intent's
 * player-driven-only scope. The HP-from-level bump (intent/19) and the
 * level's gold (intent/22) are composed in useBattle.setHeroLevel from
 * SET_HERO_LEVEL, SET_HERO_HP and SET_GOLD, like the defeat move, not here. So is the respawn
 * window (intent/24): useBattle.setHeroHp sets it with SET_HERO_RESPAWN_WINDOW when HP
 * reaches 0, and clears it when HP goes back above 0. The round and phase
 * move together as one position, and the initiative pass when a step
 * crosses a round (intent/21) is composed in useBattle.advancePhase and
 * stepPhaseBack from the phase action and PASS_INITIATIVE, as is each team's
 * Cleanup gold (intent/25), from SET_GOLD. Returns the
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

    // Manual only (intent/17): nothing else in this reducer ever flips an
    // Artifact — not an enemy hit (HP down), Runika's defeat (HP to 0), a
    // respawn (a position change) or a passed round. No Runika check: only
    // the UI limits the controls to her (ARTIFACT_OWNER).
    case "SET_HERO_ARTIFACT":
      return setHeroField(state, action.side, action.heroId, action.field, action.faceUp);

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
      // Both null, or the same point: no change.
      if (next?.xPct === state.iceWall?.xPct && next?.yPct === state.iceWall?.yPct) return state;
      return { ...state, iceWall: next };
    }

    // Manual only (intent/18): placing, moving and removing (`null`, back to
    // its holder) are all this one action, and nothing else in this reducer
    // touches the trap — not a hero dropped on its space, Immobilize,
    // Boreas's HP to 0, a level change or a passed round. No roster check
    // and no "is Boreas on this space" check: the players apply the card.
    case "SET_BEAR_TRAP":
      if (action.spaceId === state.bearTrap) return state;
      return { ...state, bearTrap: action.spaceId };

    // Initiative always alternates (intent/05's Rules) — no "set to p1/p2"
    // form, and passing twice returns to the starting state, which is how a
    // wrong tap gets undone.
    case "PASS_INITIATIVE":
      return { ...state, initiative: otherPlayer(state.initiative) };

    // One phase at a time (intent/21). Nothing else changes on a step: no
    // gold (useBattle adds Cleanup's, intent/25), levels, tokens, Ice Wall or Bear Trap, and not initiative,
    // which useBattle passes when the round changes. STEP_PHASE_BACK at
    // Round 1, Orders is a no-op.
    case "ADVANCE_PHASE":
      return setRoundPosition(state, nextPosition(state));

    case "STEP_PHASE_BACK":
      return setRoundPosition(state, previousPosition(state));

    // Set and cleared only by useBattle.setHeroHp (intent/24). The window
    // is an object, so an equal one is a no-op by value, not reference.
    case "SET_HERO_RESPAWN_WINDOW": {
      const hero = state[action.side].heroes[action.heroId];
      if (!hero || sameRespawnWindow(hero.respawnWindow, action.window)) return state;
      return setHeroField(state, action.side, action.heroId, "respawnWindow", action.window);
    }

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
 * tokens, no Stone tokens, no Chill tokens, no Favored Enemy, and
 * Artifacts face-up (only Runika's are ever read, intent/17). */
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
    ...ARTIFACTS_FACE_UP,
    respawnWindow: null,
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
 * marker for deployment and Round 1 (rulebook). The Ice Wall and the Bear
 * Trap start in their holders, whether or not Dazeem or Boreas was
 * drafted. The battle starts at Round 1, Orders (intent/21). */
export function createInitialBattleState(
  p1Heroes: Hero[],
  p2Heroes: Hero[],
  initiative: PlayerId,
): BattleState {
  return {
    schemaVersion: 17,
    p1: createInitialTeamState(p1Heroes),
    p2: createInitialTeamState(p2Heroes),
    goldPiles: createFreshGoldPiles(),
    initiative,
    iceWall: null,
    bearTrap: null,
    ...BATTLE_START,
  };
}
