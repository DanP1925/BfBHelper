"use client";

import { useCallback, useEffect, useState } from "react";
import { battleReducer, createInitialBattleState } from "./battle/reducer";
import { getBattleWinner } from "./battle/selectors";
import type { BattleState, StructuresState } from "./battle/types";
import type { Hero, HeroId, PlayerId } from "./draft/types";
import type { GoldPileSpaceId, MapSpaceId } from "../data/mapSpaces";
import { loadBattleState, saveBattleState } from "./persistence/storage";

export type UseBattleResult = {
  state: BattleState | null;
  winner: PlayerId | "draw" | null;
  setGold: (side: PlayerId, value: number) => void;
  setHeroHp: (side: PlayerId, heroId: HeroId, value: number) => void;
  setHeroLevel: (side: PlayerId, heroId: HeroId, value: number) => void;
  setStructureHp: (side: PlayerId, slot: keyof StructuresState, value: number) => void;
  setHeroPosition: (side: PlayerId, heroId: HeroId, spaceId: MapSpaceId | null) => void;
  setGoldPile: (pileId: GoldPileSpaceId, value: number) => void;
};

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
 * whenever either heroes array is empty. Mirrors `useDraft`'s hydrate/
 * persist effect split.
 */
export function useBattle(p1Heroes: Hero[], p2Heroes: Hero[]): UseBattleResult {
  const [state, setState] = useState<BattleState | null>(null);

  const p1Key = heroIdKey(p1Heroes);
  const p2Key = heroIdKey(p2Heroes);

  useEffect(() => {
    if (p1Heroes.length === 0 || p2Heroes.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(null);
      return;
    }

    const persisted = loadBattleState();
    if (persisted !== null && heroIdSetsMatch(persisted, p1Heroes, p2Heroes)) {
      setState(persisted);
      return;
    }

    const fresh = createInitialBattleState(p1Heroes, p2Heroes);
    setState(fresh);
    // Persisting happens via the effect below, which reacts to this state
    // change — not here too, which would otherwise write the same payload
    // to localStorage twice on every fresh battle start.
    // Keyed on derived hero-id-set strings, not [p1Heroes, p2Heroes] by
    // reference — callers (e.g. page.tsx) recompute those arrays fresh
    // every render, so a reference-keyed effect would thrash (re-hydrate/
    // re-persist every render instead of once per actual roster change).
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

  const setHeroLevel = useCallback((side: PlayerId, heroId: HeroId, value: number) => {
    setState((prev) =>
      prev === null ? prev : battleReducer(prev, { type: "SET_HERO_LEVEL", side, heroId, value }),
    );
  }, []);

  const setStructureHp = useCallback(
    (side: PlayerId, slot: keyof StructuresState, value: number) => {
      setState((prev) =>
        prev === null
          ? prev
          : battleReducer(prev, { type: "SET_STRUCTURE_HP", side, slot, value }),
      );
    },
    [],
  );

  const setHeroPosition = useCallback(
    (side: PlayerId, heroId: HeroId, spaceId: MapSpaceId | null) => {
      setState((prev) =>
        prev === null
          ? prev
          : battleReducer(prev, { type: "SET_HERO_POSITION", side, heroId, spaceId }),
      );
    },
    [],
  );

  const setGoldPile = useCallback((pileId: GoldPileSpaceId, value: number) => {
    setState((prev) =>
      prev === null ? prev : battleReducer(prev, { type: "SET_GOLD_PILE", pileId, value }),
    );
  }, []);

  return {
    state,
    winner: state === null ? null : getBattleWinner(state),
    setGold,
    setHeroHp,
    setHeroLevel,
    setStructureHp,
    setHeroPosition,
    setGoldPile,
  };
}
