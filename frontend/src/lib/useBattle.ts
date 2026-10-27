"use client";

import { useCallback, useEffect, useState } from "react";
import { hpAfterLevelChange } from "./battle/levelUp";
import { battleReducer, createInitialBattleState } from "./battle/reducer";
import { getBattleWinner } from "./battle/selectors";
import type {
  ArtifactField,
  BattleState,
  CountedTokenField,
  HeroPosition,
  IceWallPosition,
  OnOffTokenField,
  StructuresState,
} from "./battle/types";
import type { Hero, HeroId, PlayerId } from "./draft/types";
import type { GoldPileSpaceId, MapSpaceId } from "../data/mapSpaces";
import { loadBattleState, saveBattleState } from "./persistence/storage";

export type UseBattleResult = {
  state: BattleState | null;
  winner: PlayerId | "draw" | null;
  setGold: (side: PlayerId, value: number) => void;
  setHeroHp: (side: PlayerId, heroId: HeroId, value: number) => void;
  setHeroLevel: (side: PlayerId, heroId: HeroId, value: number) => void;
  /** Every counted token (+1 Attack, Shield, Stone, Chill) goes through this one
   * setter, named by its stored field. Clamped in the reducer. */
  setHeroCountedToken: (
    side: PlayerId,
    heroId: HeroId,
    field: CountedTokenField,
    value: number,
  ) => void;
  /** Every on/off token (ON_OFF_TOKEN_FIELDS) goes through this one setter,
   * named by its stored field. */
  setHeroOnOffToken: (
    side: PlayerId,
    heroId: HeroId,
    field: OnOffTokenField,
    value: boolean,
  ) => void;
  /** Flips one of Runika's Artifacts (intent/17), named by its stored
   * field. `faceUp: false` is face-down. */
  setHeroArtifact: (side: PlayerId, heroId: HeroId, field: ArtifactField, faceUp: boolean) => void;
  setStructureHp: (side: PlayerId, slot: keyof StructuresState, value: number) => void;
  /** Also moves a hero into or out of the Arena (intent/14): its position
   * is just another `HeroPosition`. */
  setHeroPosition: (side: PlayerId, heroId: HeroId, spaceId: HeroPosition) => void;
  setGoldPile: (pileId: GoldPileSpaceId, value: number) => void;
  /** Places or moves Dazeem's Ice Wall (intent/16), or sends it back to its
   * holder with `null`. Clamped in the reducer. */
  setIceWall: (position: IceWallPosition | null) => void;
  /** Places or moves Boreas's Bear Trap (intent/18) onto a board space, or
   * sends it back to its holder with `null`. */
  setBearTrap: (spaceId: MapSpaceId | null) => void;
  /** Flips only the initiative holder (intent/05). Also the manual
   * correction for the round-change pass below (intent/21). */
  passInitiative: () => void;
  /** One phase forward (intent/21). Cleanup → Orders also starts the next
   * round and passes initiative. */
  advancePhase: () => void;
  /** One phase back, undoing exactly what advancePhase did: Orders → the
   * previous round's Cleanup also passes initiative back. A no-op at
   * Round 1, Orders. */
  stepPhaseBack: () => void;
};

/** A phase step, plus the initiative pass when it crosses a round
 * (intent/21): two single-purpose reducer actions triggered together, like
 * setHeroHp's defeat move. Passing always alternates (intent/05), so the
 * same flip both hands initiative on and hands it back. */
function stepPhase(prev: BattleState, type: "ADVANCE_PHASE" | "STEP_PHASE_BACK"): BattleState {
  const afterStep = battleReducer(prev, { type });
  if (afterStep === prev || afterStep.round === prev.round) return afterStep;
  return battleReducer(afterStep, { type: "PASS_INITIATIVE" });
}

function heroIdKey(heroes: Hero[]): string {
  return heroes
    .map((hero) => hero.id)
    .sort()
    .join(",");
}

/** Whether a persisted battle state's hero-id sets exactly match the
 * current draft's heroes on both sides — belt-and-suspenders: `clearDraft`
 * already wipes battle state on every new draft, so a mismatch should only
 * happen if storage was hand-edited. */
export function heroIdSetsMatch(state: BattleState, p1Heroes: Hero[], p2Heroes: Hero[]): boolean {
  const p1Match = heroIdKey(p1Heroes) === Object.keys(state.p1.heroes).sort().join(",");
  const p2Match = heroIdKey(p2Heroes) === Object.keys(state.p2.heroes).sort().join(",");
  return p1Match && p2Match;
}

/**
 * The single integration point between the pure battle reducer/selectors,
 * localStorage persistence, and React. Inactive (`state === null`)
 * whenever either heroes array is empty or `startingInitiative` is `null`.
 * Mirrors `useDraft`'s hydrate/persist effect split.
 *
 * `startingInitiative` is only read when building a fresh battle — a
 * persisted battle keeps its own stored `initiative`, so passing it
 * mid-battle and reloading never snaps it back to the coin-flip winner.
 */
export function useBattle(
  p1Heroes: Hero[],
  p2Heroes: Hero[],
  startingInitiative: PlayerId | null,
): UseBattleResult {
  const [state, setState] = useState<BattleState | null>(null);

  const p1Key = heroIdKey(p1Heroes);
  const p2Key = heroIdKey(p2Heroes);

  useEffect(() => {
    if (p1Heroes.length === 0 || p2Heroes.length === 0 || startingInitiative === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(null);
      return;
    }

    const persisted = loadBattleState();
    if (persisted !== null && heroIdSetsMatch(persisted, p1Heroes, p2Heroes)) {
      setState(persisted);
      return;
    }

    const fresh = createInitialBattleState(p1Heroes, p2Heroes, startingInitiative);
    setState(fresh);
    // Persisting happens via the effect below, which reacts to this state
    // change — not here too, which would otherwise write the same payload
    // to localStorage twice on every fresh battle start.
    // Keyed on derived hero-id-set strings, not [p1Heroes, p2Heroes] by
    // reference — callers (e.g. page.tsx) recompute those arrays fresh
    // every render, so a reference-keyed effect would thrash (re-hydrate/
    // re-persist every render instead of once per actual roster change).
    // `startingInitiative` isn't a key either: it can't change while a
    // draft is done (only a new draft changes it, and that clears battle
    // state and empties the rosters first).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p1Key, p2Key]);

  useEffect(() => {
    if (state !== null) {
      saveBattleState(state);
    }
  }, [state]);

  const setGold = useCallback((side: PlayerId, value: number) => {
    setState((prev) =>
      prev === null ? prev : battleReducer(prev, { type: "SET_GOLD", side, value }),
    );
  }, []);

  // A hero whose HP lands at exactly 0 also moves to its team's respawn
  // area in the same update (intent/04) — two independently-replaceable
  // fields, triggered together by this one user action, not a combined
  // reducer action. Raising HP back above 0 afterward does NOT reverse
  // this: respawning is always its own explicit setHeroPosition call.
  const setHeroHp = useCallback((side: PlayerId, heroId: HeroId, value: number) => {
    setState((prev) => {
      if (prev === null) return prev;
      const afterHp = battleReducer(prev, { type: "SET_HERO_HP", side, heroId, value });
      if (afterHp === prev) return prev;
      if (afterHp[side].heroes[heroId]?.hp !== 0) return afterHp;
      return battleReducer(afterHp, { type: "SET_HERO_POSITION", side, heroId, spaceId: null });
    });
  }, []);

  // A level change also moves HP by the levels actually moved, after the
  // level clamp (intent/19) — the same two-action composition as the
  // defeat move above. It dispatches the reducer's SET_HERO_HP, not
  // setHeroHp, so it never moves a hero to the respawn area.
  const setHeroLevel = useCallback((side: PlayerId, heroId: HeroId, value: number) => {
    setState((prev) => {
      if (prev === null) return prev;
      const afterLevel = battleReducer(prev, { type: "SET_HERO_LEVEL", side, heroId, value });
      if (afterLevel === prev) return prev;
      const before = prev[side].heroes[heroId];
      const levelDelta = afterLevel[side].heroes[heroId].level - before.level;
      const hp = hpAfterLevelChange(before.hp, levelDelta);
      return battleReducer(afterLevel, { type: "SET_HERO_HP", side, heroId, value: hp });
    });
  }, []);

  const setHeroCountedToken = useCallback(
    (side: PlayerId, heroId: HeroId, field: CountedTokenField, value: number) => {
      setState((prev) =>
        prev === null
          ? prev
          : battleReducer(prev, { type: "SET_HERO_COUNTED_TOKEN", side, heroId, field, value }),
      );
    },
    [],
  );

  const setHeroOnOffToken = useCallback(
    (side: PlayerId, heroId: HeroId, field: OnOffTokenField, value: boolean) => {
      setState((prev) =>
        prev === null
          ? prev
          : battleReducer(prev, { type: "SET_HERO_ON_OFF_TOKEN", side, heroId, field, value }),
      );
    },
    [],
  );

  const setHeroArtifact = useCallback(
    (side: PlayerId, heroId: HeroId, field: ArtifactField, faceUp: boolean) => {
      setState((prev) =>
        prev === null
          ? prev
          : battleReducer(prev, { type: "SET_HERO_ARTIFACT", side, heroId, field, faceUp }),
      );
    },
    [],
  );

  const setStructureHp = useCallback(
    (side: PlayerId, slot: keyof StructuresState, value: number) => {
      setState((prev) =>
        prev === null ? prev : battleReducer(prev, { type: "SET_STRUCTURE_HP", side, slot, value }),
      );
    },
    [],
  );

  const setHeroPosition = useCallback((side: PlayerId, heroId: HeroId, spaceId: HeroPosition) => {
    setState((prev) =>
      prev === null
        ? prev
        : battleReducer(prev, { type: "SET_HERO_POSITION", side, heroId, spaceId }),
    );
  }, []);

  const setGoldPile = useCallback((pileId: GoldPileSpaceId, value: number) => {
    setState((prev) =>
      prev === null ? prev : battleReducer(prev, { type: "SET_GOLD_PILE", pileId, value }),
    );
  }, []);

  const setIceWall = useCallback((position: IceWallPosition | null) => {
    setState((prev) =>
      prev === null ? prev : battleReducer(prev, { type: "SET_ICE_WALL", position }),
    );
  }, []);

  const setBearTrap = useCallback((spaceId: MapSpaceId | null) => {
    setState((prev) =>
      prev === null ? prev : battleReducer(prev, { type: "SET_BEAR_TRAP", spaceId }),
    );
  }, []);

  const passInitiative = useCallback(() => {
    setState((prev) => (prev === null ? prev : battleReducer(prev, { type: "PASS_INITIATIVE" })));
  }, []);

  const advancePhase = useCallback(() => {
    setState((prev) => (prev === null ? prev : stepPhase(prev, "ADVANCE_PHASE")));
  }, []);

  const stepPhaseBack = useCallback(() => {
    setState((prev) => (prev === null ? prev : stepPhase(prev, "STEP_PHASE_BACK")));
  }, []);

  return {
    state,
    winner: state === null ? null : getBattleWinner(state),
    setGold,
    setHeroHp,
    setHeroLevel,
    setHeroCountedToken,
    setHeroOnOffToken,
    setHeroArtifact,
    setStructureHp,
    setHeroPosition,
    setGoldPile,
    setIceWall,
    setBearTrap,
    passInitiative,
    advancePhase,
    stepPhaseBack,
  };
}
