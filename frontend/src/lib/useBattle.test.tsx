import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Hero } from "./draft/types";
import { BATTLE_STATE_STORAGE_KEY } from "./persistence/schema";
import { saveBattleState } from "./persistence/storage";
import { createInitialBattleState } from "./battle/reducer";
import { GOLD_PILE_SPACE_IDS, MAP_SPACE_IDS } from "../data/mapSpaces";
import { GOLD_PILE_STARTING_COUNT } from "./map/constants";
import { heroIdSetsMatch, useBattle } from "./useBattle";

const HERO_A: Hero = {
  id: "baldwin",
  name: "Baldwin",
  className: "Bard",
  portrait: "/heroes/baldwin.png",
  battleToken: "/heroes-tokens/baldwin.png",
  baseHp: 9,
};

const HERO_B: Hero = {
  id: "cyrus",
  name: "Cyrus",
  className: "Paladin",
  portrait: "/heroes/cyrus.png",
  battleToken: "/heroes-tokens/cyrus.png",
  baseHp: 9,
};

const OTHER_HERO: Hero = {
  id: "felix",
  name: "Felix",
  className: "Duelist",
  portrait: "/heroes/felix.png",
  battleToken: "/heroes-tokens/felix.png",
  baseHp: 9,
};

function readRawState() {
  const raw = window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY);
  if (raw === null) throw new Error("expected a persisted battle state");
  return JSON.parse(raw);
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("heroIdSetsMatch", () => {
  it("matches regardless of order", () => {
    const state = createInitialBattleState([HERO_A, HERO_B], [OTHER_HERO]);
    expect(heroIdSetsMatch(state, [HERO_B, HERO_A], [OTHER_HERO])).toBe(true);
  });

  it("rejects a different hero-id set on either side", () => {
    const state = createInitialBattleState([HERO_A], [OTHER_HERO]);
    expect(heroIdSetsMatch(state, [HERO_B], [OTHER_HERO])).toBe(false);
    expect(heroIdSetsMatch(state, [HERO_A], [HERO_B])).toBe(false);
  });
});

describe("useBattle", () => {
  it("is inactive (state === null) when either heroes array is empty", () => {
    const { result } = renderHook(() => useBattle([], [HERO_B]));
    expect(result.current.state).toBeNull();
    expect(result.current.winner).toBeNull();
  });

  it("builds and persists a fresh state from each hero's baseHp when nothing is persisted", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B]));

    expect(result.current.state?.p1.heroes[HERO_A.id]).toEqual({
      hp: HERO_A.baseHp,
      level: 1,
    });
    expect(readRawState().p1.heroes[HERO_A.id].hp).toBe(HERO_A.baseHp);
  });

  it("hydrates a matching persisted state verbatim instead of rebuilding fresh", () => {
    const persisted = createInitialBattleState([HERO_A], [HERO_B]);
    persisted.p1.heroes[HERO_A.id] = { hp: 2, level: 3 };
    saveBattleState(persisted);

    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B]));

    expect(result.current.state?.p1.heroes[HERO_A.id]).toEqual({ hp: 2, level: 3 });
  });

  it("rejects a persisted state whose hero-id set doesn't match, rebuilding fresh instead", () => {
    const persisted = createInitialBattleState([OTHER_HERO], [HERO_B]);
    saveBattleState(persisted);

    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B]));

    expect(result.current.state?.p1.heroes[HERO_A.id]).toEqual({
      hp: HERO_A.baseHp,
      level: 1,
    });
  });

  it("resets to null when the heroes arrays go back to empty", () => {
    const { result, rerender } = renderHook(
      ({ p1, p2 }: { p1: Hero[]; p2: Hero[] }) => useBattle(p1, p2),
      { initialProps: { p1: [HERO_A], p2: [HERO_B] } },
    );
    expect(result.current.state).not.toBeNull();

    rerender({ p1: [], p2: [] });
    expect(result.current.state).toBeNull();
  });

  it("setGold persists the clamped result", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B]));

    act(() => {
      result.current.setGold("p1", 7);
    });

    expect(result.current.state?.p1.gold).toBe(7);
    expect(readRawState().p1.gold).toBe(7);
  });

  it("setHeroHp persists the clamped result", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B]));

    act(() => {
      result.current.setHeroHp("p1", HERO_A.id, 99);
    });

    expect(result.current.state?.p1.heroes[HERO_A.id].hp).toBe(15);
  });

  it("derives winner from live state and clears it once Bit HP is raised back above 0", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B]));

    act(() => {
      result.current.setStructureHp("p1", "bit", 0);
    });
    expect(result.current.winner).toBe("p2");

    act(() => {
      result.current.setStructureHp("p1", "bit", 5);
    });
    expect(result.current.winner).toBeNull();
  });

  it("setHeroPosition persists the replaced result", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B]));
    const spaceId = MAP_SPACE_IDS[0];

    act(() => {
      result.current.setHeroPosition("p1", HERO_A.id, spaceId);
    });

    expect(result.current.state?.p1.heroPositions[HERO_A.id]).toBe(spaceId);
    expect(readRawState().p1.heroPositions[HERO_A.id]).toBe(spaceId);
  });

  it("setGoldPile persists the clamped result", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B]));
    const pileId = GOLD_PILE_SPACE_IDS[0];

    act(() => {
      result.current.setGoldPile(pileId, 1);
    });
    expect(result.current.state?.goldPiles[pileId]).toBe(1);

    act(() => {
      result.current.setGoldPile(pileId, 99);
    });
    expect(result.current.state?.goldPiles[pileId]).toBe(GOLD_PILE_STARTING_COUNT);
    expect(readRawState().goldPiles[pileId]).toBe(GOLD_PILE_STARTING_COUNT);
  });

  it("setHeroHp to 0 also moves the hero to its respawn area, in one update", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B]));
    const spaceId = MAP_SPACE_IDS[0];

    act(() => {
      result.current.setHeroPosition("p1", HERO_A.id, spaceId);
    });
    expect(result.current.state?.p1.heroPositions[HERO_A.id]).toBe(spaceId);

    act(() => {
      result.current.setHeroHp("p1", HERO_A.id, 0);
    });

    expect(result.current.state?.p1.heroes[HERO_A.id].hp).toBe(0);
    expect(result.current.state?.p1.heroPositions[HERO_A.id]).toBeNull();
    expect(readRawState().p1.heroPositions[HERO_A.id]).toBeNull();
  });

  it("raising HP back above 0 does not restore a prior position", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B]));
    const spaceId = MAP_SPACE_IDS[0];

    act(() => {
      result.current.setHeroPosition("p1", HERO_A.id, spaceId);
      result.current.setHeroHp("p1", HERO_A.id, 0);
    });
    expect(result.current.state?.p1.heroPositions[HERO_A.id]).toBeNull();

    act(() => {
      result.current.setHeroHp("p1", HERO_A.id, 5);
    });

    expect(result.current.state?.p1.heroes[HERO_A.id].hp).toBe(5);
    expect(result.current.state?.p1.heroPositions[HERO_A.id]).toBeNull();
  });
});
