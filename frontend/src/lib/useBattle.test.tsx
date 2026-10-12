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
    const state = createInitialBattleState([HERO_A, HERO_B], [OTHER_HERO], "p1");
    expect(heroIdSetsMatch(state, [HERO_B, HERO_A], [OTHER_HERO])).toBe(true);
  });

  it("rejects a different hero-id set on either side", () => {
    const state = createInitialBattleState([HERO_A], [OTHER_HERO], "p1");
    expect(heroIdSetsMatch(state, [HERO_B], [OTHER_HERO])).toBe(false);
    expect(heroIdSetsMatch(state, [HERO_A], [HERO_B])).toBe(false);
  });
});

describe("useBattle", () => {
  it("is inactive (state === null) when either heroes array is empty", () => {
    const { result } = renderHook(() => useBattle([], [HERO_B], "p1"));
    expect(result.current.state).toBeNull();
    expect(result.current.winner).toBeNull();
  });

  it("is inactive when there's no starting initiative yet", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], null));
    expect(result.current.state).toBeNull();
  });

  it("starts a fresh battle with initiative on startingInitiative", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p2"));
    expect(result.current.state?.initiative).toBe("p2");
    expect(readRawState().initiative).toBe("p2");
  });

  it("passInitiative flips the holder and persists it", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    act(() => {
      result.current.passInitiative();
    });
    expect(result.current.state?.initiative).toBe("p2");
    expect(readRawState().initiative).toBe("p2");

    act(() => {
      result.current.passInitiative();
    });
    expect(result.current.state?.initiative).toBe("p1");
  });

  it("a persisted battle keeps its own initiative, not the coin-flip winner", () => {
    saveBattleState({ ...createInitialBattleState([HERO_A], [HERO_B], "p1"), initiative: "p2" });

    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    expect(result.current.state?.initiative).toBe("p2");
  });

  it("builds and persists a fresh state from each hero's starting HP when nothing is persisted", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    expect(result.current.state?.p1.heroes[HERO_A.id]).toEqual({
      hp: HERO_A.baseHp + 1,
      level: 1,
      attackTokens: 0,
      confused: false,
      immobilized: false,
    });
    expect(readRawState().p1.heroes[HERO_A.id].hp).toBe(HERO_A.baseHp + 1);
  });

  it("hydrates a matching persisted state verbatim instead of rebuilding fresh", () => {
    const persisted = createInitialBattleState([HERO_A], [HERO_B], "p1");
    persisted.p1.heroes[HERO_A.id] = {
      hp: 2,
      level: 3,
      attackTokens: 4,
      confused: true,
      immobilized: true,
    };
    saveBattleState(persisted);

    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    expect(result.current.state?.p1.heroes[HERO_A.id]).toEqual({
      hp: 2,
      level: 3,
      attackTokens: 4,
      confused: true,
      immobilized: true,
    });
  });

  it("rejects a persisted state whose hero-id set doesn't match, rebuilding fresh instead", () => {
    const persisted = createInitialBattleState([OTHER_HERO], [HERO_B], "p1");
    saveBattleState(persisted);

    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    expect(result.current.state?.p1.heroes[HERO_A.id]).toEqual({
      hp: HERO_A.baseHp + 1,
      level: 1,
      attackTokens: 0,
      confused: false,
      immobilized: false,
    });
  });

  it("resets to null when the heroes arrays go back to empty", () => {
    const { result, rerender } = renderHook(
      ({ p1, p2 }: { p1: Hero[]; p2: Hero[] }) => useBattle(p1, p2, "p1"),
      { initialProps: { p1: [HERO_A], p2: [HERO_B] } },
    );
    expect(result.current.state).not.toBeNull();

    rerender({ p1: [], p2: [] });
    expect(result.current.state).toBeNull();
  });

  it("setGold persists the clamped result", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    act(() => {
      result.current.setGold("p1", 7);
    });

    expect(result.current.state?.p1.gold).toBe(7);
    expect(readRawState().p1.gold).toBe(7);
  });

  it("setHeroHp persists the clamped result", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    act(() => {
      result.current.setHeroHp("p1", HERO_A.id, 99);
    });

    expect(result.current.state?.p1.heroes[HERO_A.id].hp).toBe(15);
  });

  it("setHeroAttackTokens persists the clamped result, which survives a reload", () => {
    const { result, unmount } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    act(() => {
      result.current.setHeroAttackTokens("p2", HERO_B.id, 3);
    });
    expect(result.current.state?.p2.heroes[HERO_B.id].attackTokens).toBe(3);
    expect(readRawState().p2.heroes[HERO_B.id].attackTokens).toBe(3);

    act(() => {
      result.current.setHeroAttackTokens("p2", HERO_B.id, 99);
    });
    expect(result.current.state?.p2.heroes[HERO_B.id].attackTokens).toBe(9);
    unmount();

    const { result: reloaded } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
    expect(reloaded.current.state?.p2.heroes[HERO_B.id].attackTokens).toBe(9);
  });

  it("setHeroHp to 0 keeps the hero's attack tokens", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    act(() => {
      result.current.setHeroAttackTokens("p1", HERO_A.id, 2);
      result.current.setHeroHp("p1", HERO_A.id, 0);
    });

    expect(result.current.state?.p1.heroes[HERO_A.id].attackTokens).toBe(2);
  });

  it("setHeroConfused persists the flag, which survives a reload and can be turned off", () => {
    const { result, unmount } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    act(() => {
      result.current.setHeroConfused("p2", HERO_B.id, true);
    });
    expect(result.current.state?.p2.heroes[HERO_B.id].confused).toBe(true);
    expect(result.current.state?.p1.heroes[HERO_A.id].confused).toBe(false);
    expect(readRawState().p2.heroes[HERO_B.id].confused).toBe(true);
    unmount();

    const { result: reloaded } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
    expect(reloaded.current.state?.p2.heroes[HERO_B.id].confused).toBe(true);

    act(() => {
      reloaded.current.setHeroConfused("p2", HERO_B.id, false);
    });
    expect(reloaded.current.state?.p2.heroes[HERO_B.id].confused).toBe(false);
    expect(readRawState().p2.heroes[HERO_B.id].confused).toBe(false);
  });

  it("setHeroHp to 0 and passInitiative keep the hero confused", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    act(() => {
      result.current.setHeroConfused("p1", HERO_A.id, true);
      result.current.setHeroHp("p1", HERO_A.id, 0);
      result.current.passInitiative();
    });

    expect(result.current.state?.p1.heroes[HERO_A.id].confused).toBe(true);
  });

  it("setHeroImmobilized persists the flag, which survives a reload and can be turned off", () => {
    const { result, unmount } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    act(() => {
      result.current.setHeroImmobilized("p1", HERO_A.id, true);
    });
    expect(result.current.state?.p1.heroes[HERO_A.id].immobilized).toBe(true);
    expect(result.current.state?.p1.heroes[HERO_A.id].confused).toBe(false);
    expect(result.current.state?.p2.heroes[HERO_B.id].immobilized).toBe(false);
    expect(readRawState().p1.heroes[HERO_A.id].immobilized).toBe(true);
    unmount();

    const { result: reloaded } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
    expect(reloaded.current.state?.p1.heroes[HERO_A.id].immobilized).toBe(true);

    act(() => {
      reloaded.current.setHeroImmobilized("p1", HERO_A.id, false);
    });
    expect(reloaded.current.state?.p1.heroes[HERO_A.id].immobilized).toBe(false);
    expect(readRawState().p1.heroes[HERO_A.id].immobilized).toBe(false);
  });

  it("setHeroPosition, setHeroHp to 0 and passInitiative keep the hero immobilized", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    act(() => {
      result.current.setHeroImmobilized("p1", HERO_A.id, true);
      result.current.setHeroPosition("p1", HERO_A.id, MAP_SPACE_IDS[0]);
    });
    expect(result.current.state?.p1.heroPositions[HERO_A.id]).toBe(MAP_SPACE_IDS[0]);
    expect(result.current.state?.p1.heroes[HERO_A.id].immobilized).toBe(true);

    act(() => {
      result.current.setHeroHp("p1", HERO_A.id, 0);
      result.current.passInitiative();
    });
    expect(result.current.state?.p1.heroes[HERO_A.id].immobilized).toBe(true);
  });

  it("derives winner from live state and clears it once Bit HP is raised back above 0", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

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
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
    const spaceId = MAP_SPACE_IDS[0];

    act(() => {
      result.current.setHeroPosition("p1", HERO_A.id, spaceId);
    });

    expect(result.current.state?.p1.heroPositions[HERO_A.id]).toBe(spaceId);
    expect(readRawState().p1.heroPositions[HERO_A.id]).toBe(spaceId);
  });

  it("setGoldPile persists the clamped result", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
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
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
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
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
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
