import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Hero } from "./draft/types";
import { BATTLE_STATE_STORAGE_KEY } from "./persistence/schema";
import { saveBattleState } from "./persistence/storage";
import { createInitialBattleState } from "./battle/reducer";
import { ARTIFACT_FIELDS, ON_OFF_TOKEN_FIELDS } from "./battle/constants";
import { GOLD_PILE_SPACE_IDS, MAP_SPACE_IDS } from "../data/mapSpaces";
import { ARENA_POSITION, GOLD_PILE_STARTING_COUNT } from "./map/constants";
import { heroIdSetsMatch, useBattle } from "./useBattle";
import { COUNTED_TOKENS } from "../test/countedTokens";
import { NO_TOKENS } from "../test/heroState";

const HERO_A: Hero = {
  id: "baldwin",
  name: "Baldwin",
  className: "Bard",
  portrait: "/heroes/baldwin.png",
  battleToken: "/heroes-tokens/baldwin.png",
  baseHp: 9,
  role: "support",
};

const HERO_B: Hero = {
  id: "cyrus",
  name: "Cyrus",
  className: "Paladin",
  portrait: "/heroes/cyrus.png",
  battleToken: "/heroes-tokens/cyrus.png",
  baseHp: 9,
  role: "support",
};

const OTHER_HERO: Hero = {
  id: "felix",
  name: "Felix",
  className: "Duelist",
  portrait: "/heroes/felix.png",
  battleToken: "/heroes-tokens/felix.png",
  baseHp: 9,
  role: "damage",
};

const KEN_OBI: Hero = {
  id: "ken-obi",
  name: "Ken Obi",
  className: "Apprentice",
  portrait: "/heroes/ken-obi.png",
  battleToken: "/heroes-tokens/ken-obi.png",
  baseHp: 9,
  role: "utility",
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

  describe("advancePhase / stepPhaseBack (intent/21)", () => {
    function steps(result: { current: ReturnType<typeof useBattle> }, n: number) {
      for (let i = 0; i < n; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
    }

    it("steps through a round without touching initiative", () => {
      const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

      steps(result, 3);
      expect(result.current.state).toMatchObject({
        round: 1,
        phase: "cleanup",
        initiative: "p1",
      });
    });

    it("Cleanup → Orders starts the next round and passes initiative, and persists it", () => {
      const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

      steps(result, 4);
      expect(result.current.state).toMatchObject({ round: 2, phase: "orders", initiative: "p2" });
      expect(readRawState()).toMatchObject({ round: 2, phase: "orders", initiative: "p2" });
    });

    it("stepping back across a round takes it off and passes initiative back", () => {
      const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
      steps(result, 4);

      act(() => {
        result.current.stepPhaseBack();
      });
      expect(result.current.state).toMatchObject({
        round: 1,
        phase: "cleanup",
        initiative: "p1",
      });

      act(() => {
        result.current.stepPhaseBack();
      });
      expect(result.current.state).toMatchObject({ round: 1, phase: "action", initiative: "p1" });
    });

    it("a step back at Round 1, Orders keeps the same state", () => {
      const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
      const before = result.current.state;

      act(() => {
        result.current.stepPhaseBack();
      });
      expect(result.current.state).toBe(before);
    });

    it("passInitiative leaves the round and phase alone", () => {
      const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
      steps(result, 2);

      act(() => {
        result.current.passInitiative();
      });
      expect(result.current.state).toMatchObject({ round: 1, phase: "action", initiative: "p2" });
    });
  });

  describe("advancePhase / stepPhaseBack (intent/25)", () => {
    function steps(result: { current: ReturnType<typeof useBattle> }, n: number) {
      for (let i = 0; i < n; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
    }

    function gold(result: { current: ReturnType<typeof useBattle> }) {
      return [result.current.state?.p1.gold, result.current.state?.p2.gold];
    }

    it("Action → Cleanup gives both teams 2 gold, and persists it", () => {
      const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

      steps(result, 2);
      expect(gold(result)).toEqual([0, 0]);

      steps(result, 1);
      expect(result.current.state?.phase).toBe("cleanup");
      expect(gold(result)).toEqual([2, 2]);
      expect(readRawState()).toMatchObject({ p1: { gold: 2 }, p2: { gold: 2 } });
    });

    it("Cleanup → Action takes the 2 back, never below 0", () => {
      const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
      steps(result, 3);
      act(() => {
        result.current.setGold("p1", 1);
      });

      act(() => {
        result.current.stepPhaseBack();
      });
      expect(result.current.state?.phase).toBe("action");
      expect(gold(result)).toEqual([0, 0]);

      // Nothing remembers the shortfall: stepping forward again pays the full 2.
      steps(result, 1);
      expect(gold(result)).toEqual([2, 2]);
    });

    it("crossing a round in either direction leaves gold alone", () => {
      const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
      steps(result, 4);
      expect(result.current.state).toMatchObject({ round: 2, phase: "orders" });
      expect(gold(result)).toEqual([2, 2]);

      act(() => {
        result.current.stepPhaseBack();
      });
      expect(result.current.state).toMatchObject({ round: 1, phase: "cleanup" });
      expect(gold(result)).toEqual([2, 2]);
    });

    it("a level-up refunded by a level-down, then a step back, restores the gold from before Cleanup", () => {
      const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
      steps(result, 2);
      act(() => {
        result.current.setGold("p1", 1);
        result.current.setGold("p2", 4);
      });

      steps(result, 1);
      expect(gold(result)).toEqual([3, 6]);

      act(() => {
        result.current.setHeroLevel("p1", HERO_A.id, 2);
      });
      expect(gold(result)).toEqual([1, 6]);

      act(() => {
        result.current.setHeroLevel("p1", HERO_A.id, 1);
      });
      act(() => {
        result.current.stepPhaseBack();
      });
      expect(gold(result)).toEqual([1, 4]);
    });
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
      ...NO_TOKENS,
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
      deathMarked: true,
      shieldTokens: 5,
      stoneTokens: 2,
      chillTokens: 4,
      favoredEnemy: true,
      battleFistFaceUp: false,
      autoDeflectorFaceUp: true,
      shieldAmuletFaceUp: false,
    };
    saveBattleState(persisted);

    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    expect(result.current.state?.p1.heroes[HERO_A.id]).toEqual({
      hp: 2,
      level: 3,
      attackTokens: 4,
      confused: true,
      immobilized: true,
      deathMarked: true,
      shieldTokens: 5,
      stoneTokens: 2,
      chillTokens: 4,
      favoredEnemy: true,
      battleFistFaceUp: false,
      autoDeflectorFaceUp: true,
      shieldAmuletFaceUp: false,
    });
  });

  it("rejects a persisted state whose hero-id set doesn't match, rebuilding fresh instead", () => {
    const persisted = createInitialBattleState([OTHER_HERO], [HERO_B], "p1");
    saveBattleState(persisted);

    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    expect(result.current.state?.p1.heroes[HERO_A.id]).toEqual({
      hp: HERO_A.baseHp + 1,
      level: 1,
      ...NO_TOKENS,
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

  it.each(COUNTED_TOKENS)(
    "setHeroCountedToken ($field) persists the clamped count, which survives a reload and steps back down",
    ({ field, ceiling }) => {
      const { result, unmount } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

      act(() => {
        result.current.setHeroCountedToken("p2", HERO_B.id, field, 99);
      });
      expect(result.current.state?.p2.heroes[HERO_B.id][field]).toBe(ceiling);
      expect(result.current.state?.p1.heroes[HERO_A.id][field]).toBe(0);
      expect(readRawState().p2.heroes[HERO_B.id][field]).toBe(ceiling);
      unmount();

      const { result: reloaded } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
      expect(reloaded.current.state?.p2.heroes[HERO_B.id][field]).toBe(ceiling);

      act(() => {
        reloaded.current.setHeroCountedToken("p2", HERO_B.id, field, ceiling - 1);
      });
      expect(reloaded.current.state?.p2.heroes[HERO_B.id][field]).toBe(ceiling - 1);
      expect(readRawState().p2.heroes[HERO_B.id][field]).toBe(ceiling - 1);
    },
  );

  it("setHeroHp to 0 keeps the hero's attack tokens", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    act(() => {
      result.current.setHeroCountedToken("p1", HERO_A.id, "attackTokens", 2);
      result.current.setHeroHp("p1", HERO_A.id, 0);
    });

    expect(result.current.state?.p1.heroes[HERO_A.id].attackTokens).toBe(2);
  });

  describe.each(ON_OFF_TOKEN_FIELDS.map((field) => ({ field })))(
    "setHeroOnOffToken ($field)",
    ({ field }) => {
      it("persists the flag, which survives a reload and can be turned off", () => {
        const { result, unmount } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

        act(() => {
          result.current.setHeroOnOffToken("p2", HERO_B.id, field, true);
        });
        expect(result.current.state?.p2.heroes[HERO_B.id][field]).toBe(true);
        expect(result.current.state?.p1.heroes[HERO_A.id][field]).toBe(false);
        expect(readRawState().p2.heroes[HERO_B.id][field]).toBe(true);
        unmount();

        const { result: reloaded } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
        expect(reloaded.current.state?.p2.heroes[HERO_B.id][field]).toBe(true);

        act(() => {
          reloaded.current.setHeroOnOffToken("p2", HERO_B.id, field, false);
        });
        expect(reloaded.current.state?.p2.heroes[HERO_B.id][field]).toBe(false);
        expect(readRawState().p2.heroes[HERO_B.id][field]).toBe(false);
      });

      it("setHeroPosition, setHeroHp to 0 (with its move to respawn) and passInitiative keep it", () => {
        const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

        act(() => {
          result.current.setHeroOnOffToken("p2", HERO_B.id, field, true);
          result.current.setHeroPosition("p2", HERO_B.id, MAP_SPACE_IDS[0]);
        });
        expect(result.current.state?.p2.heroPositions[HERO_B.id]).toBe(MAP_SPACE_IDS[0]);
        act(() => {
          result.current.setHeroHp("p2", HERO_B.id, 0);
          result.current.passInitiative();
        });
        expect(result.current.state?.p2.heroPositions[HERO_B.id]).toBeNull();
        expect(result.current.state?.p2.heroes[HERO_B.id][field]).toBe(true);
      });
    },
  );

  describe.each(ARTIFACT_FIELDS.map((field) => ({ field })))(
    "setHeroArtifact ($field)",
    ({ field }) => {
      it("persists a face-down flip, which survives a reload and can be flipped back up", () => {
        const { result, unmount } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

        act(() => {
          result.current.setHeroArtifact("p2", HERO_B.id, field, false);
        });
        expect(result.current.state?.p2.heroes[HERO_B.id][field]).toBe(false);
        expect(result.current.state?.p1.heroes[HERO_A.id][field]).toBe(true);
        expect(readRawState().p2.heroes[HERO_B.id][field]).toBe(false);
        unmount();

        const { result: reloaded } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
        expect(reloaded.current.state?.p2.heroes[HERO_B.id][field]).toBe(false);

        act(() => {
          reloaded.current.setHeroArtifact("p2", HERO_B.id, field, true);
        });
        expect(reloaded.current.state?.p2.heroes[HERO_B.id][field]).toBe(true);
        expect(readRawState().p2.heroes[HERO_B.id][field]).toBe(true);
      });
    },
  );

  it("setHeroHp to 0 (with its move to respawn) and passInitiative keep the shields", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    act(() => {
      result.current.setHeroCountedToken("p1", HERO_A.id, "shieldTokens", 2);
      result.current.setHeroPosition("p1", HERO_A.id, MAP_SPACE_IDS[0]);
    });
    act(() => {
      result.current.setHeroHp("p1", HERO_A.id, 0);
      result.current.passInitiative();
    });
    expect(result.current.state?.p1.heroPositions[HERO_A.id]).toBeNull();
    expect(result.current.state?.p1.heroes[HERO_A.id].shieldTokens).toBe(2);
  });

  it("reaching 3 Stone doesn't defeat the hero; setHeroHp to 0 and passInitiative keep the Stone", () => {
    const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

    act(() => {
      result.current.setHeroPosition("p2", HERO_B.id, MAP_SPACE_IDS[0]);
      result.current.setHeroCountedToken("p2", HERO_B.id, "stoneTokens", 3);
    });
    expect(result.current.state?.p2.heroes[HERO_B.id].hp).toBe(HERO_B.baseHp + 1);
    expect(result.current.state?.p2.heroPositions[HERO_B.id]).toBe(MAP_SPACE_IDS[0]);

    act(() => {
      result.current.setHeroHp("p2", HERO_B.id, 0);
      result.current.passInitiative();
    });
    expect(result.current.state?.p2.heroPositions[HERO_B.id]).toBeNull();
    expect(result.current.state?.p2.heroes[HERO_B.id].stoneTokens).toBe(3);
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

  describe("setIceWall (intent/16)", () => {
    it("persists the placed wall, which survives a reload and goes back to its holder", () => {
      const { result, unmount } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

      act(() => {
        result.current.setIceWall({ xPct: 48.6, yPct: 121 });
      });
      expect(result.current.state?.iceWall).toEqual({ xPct: 48.6, yPct: 100 });
      expect(readRawState().iceWall).toEqual({ xPct: 48.6, yPct: 100 });
      unmount();

      const { result: reloaded } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
      expect(reloaded.current.state?.iceWall).toEqual({ xPct: 48.6, yPct: 100 });

      act(() => {
        reloaded.current.setIceWall(null);
      });
      expect(reloaded.current.state?.iceWall).toBeNull();
      expect(readRawState().iceWall).toBeNull();
    });

    it("setHeroHp to 0 (with its move to respawn) and passInitiative leave it on the board", () => {
      const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

      act(() => {
        result.current.setIceWall({ xPct: 30, yPct: 40 });
        result.current.setHeroPosition("p1", HERO_A.id, MAP_SPACE_IDS[0]);
      });
      act(() => {
        result.current.setHeroHp("p1", HERO_A.id, 0);
        result.current.passInitiative();
      });
      expect(result.current.state?.iceWall).toEqual({ xPct: 30, yPct: 40 });
    });

    it("a battle for a different draft starts with the wall in its holder", () => {
      const { result, unmount } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
      act(() => {
        result.current.setIceWall({ xPct: 30, yPct: 40 });
      });
      unmount();

      const { result: next } = renderHook(() => useBattle([HERO_B], [HERO_A], "p1"));
      expect(next.current.state?.iceWall).toBeNull();
    });
  });

  describe("setBearTrap (intent/18)", () => {
    it("persists the placed trap, which survives a reload and goes back to its holder", () => {
      const { result, unmount } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

      act(() => {
        result.current.setBearTrap(MAP_SPACE_IDS[0]);
      });
      expect(result.current.state?.bearTrap).toBe(MAP_SPACE_IDS[0]);
      expect(readRawState().bearTrap).toBe(MAP_SPACE_IDS[0]);
      unmount();

      const { result: reloaded } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
      expect(reloaded.current.state?.bearTrap).toBe(MAP_SPACE_IDS[0]);

      act(() => {
        reloaded.current.setBearTrap(null);
      });
      expect(reloaded.current.state?.bearTrap).toBeNull();
      expect(readRawState().bearTrap).toBeNull();
    });

    it("a hero dropped on its space, setHeroHp to 0 and passInitiative leave it on the board", () => {
      const { result } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));

      act(() => {
        result.current.setBearTrap(MAP_SPACE_IDS[0]);
        result.current.setHeroPosition("p2", HERO_B.id, MAP_SPACE_IDS[0]);
      });
      act(() => {
        result.current.setHeroHp("p1", HERO_A.id, 0);
        result.current.passInitiative();
      });
      expect(result.current.state?.bearTrap).toBe(MAP_SPACE_IDS[0]);
    });

    it("a battle for a different draft starts with the trap in its holder", () => {
      const { result, unmount } = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
      act(() => {
        result.current.setBearTrap(MAP_SPACE_IDS[0]);
      });
      unmount();

      const { result: next } = renderHook(() => useBattle([HERO_B], [HERO_A], "p1"));
      expect(next.current.state?.bearTrap).toBeNull();
    });
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

  describe("setHeroLevel (intent/19)", () => {
    // HERO_A starts at level 1 with baseHp + 1 = 10 HP. Enough gold for
    // every level-up (intent/22), so only HP is under test here.
    function renderLevels() {
      const hook = renderHook(() => useBattle([HERO_A], [HERO_B], "p1"));
      act(() => {
        hook.result.current.setGold("p1", 20);
      });
      return hook;
    }

    it("a level-up adds 1 HP and a level-down takes it back off", () => {
      const { result } = renderLevels();

      act(() => {
        result.current.setHeroLevel("p1", HERO_A.id, 2);
      });
      expect(result.current.state?.p1.heroes[HERO_A.id]).toMatchObject({ level: 2, hp: 11 });
      expect(readRawState().p1.heroes[HERO_A.id]).toMatchObject({ level: 2, hp: 11 });

      act(() => {
        result.current.setHeroLevel("p1", HERO_A.id, 1);
      });
      expect(result.current.state?.p1.heroes[HERO_A.id]).toMatchObject({ level: 1, hp: 10 });
    });

    it("a typed jump moves HP by the levels actually moved, after the clamp", () => {
      const { result } = renderLevels();

      act(() => {
        result.current.setHeroLevel("p1", HERO_A.id, 3);
      });
      expect(result.current.state?.p1.heroes[HERO_A.id]).toMatchObject({ level: 3, hp: 12 });

      act(() => {
        result.current.setHeroLevel("p1", HERO_A.id, 9);
      });
      expect(result.current.state?.p1.heroes[HERO_A.id]).toMatchObject({ level: 4, hp: 13 });
    });

    it("a level-up at 15 HP stays at the ceiling", () => {
      const { result } = renderLevels();

      act(() => {
        result.current.setHeroHp("p1", HERO_A.id, 15);
        result.current.setHeroLevel("p1", HERO_A.id, 2);
      });
      expect(result.current.state?.p1.heroes[HERO_A.id]).toMatchObject({ level: 2, hp: 15 });
    });

    it("a no-op level write returns the same state", () => {
      const { result } = renderLevels();
      const before = result.current.state;

      act(() => {
        result.current.setHeroLevel("p1", HERO_A.id, 1);
        result.current.setHeroLevel("p1", HERO_A.id, 0);
        result.current.setHeroLevel("p1", OTHER_HERO.id, 2);
      });
      expect(result.current.state).toBe(before);
    });

    it("a defeated hero stays at 0 HP in its respawn area", () => {
      const { result } = renderLevels();

      act(() => {
        result.current.setHeroPosition("p1", HERO_A.id, MAP_SPACE_IDS[0]);
        result.current.setHeroHp("p1", HERO_A.id, 0);
        result.current.setHeroLevel("p1", HERO_A.id, 2);
      });
      expect(result.current.state?.p1.heroes[HERO_A.id]).toMatchObject({ level: 2, hp: 0 });
      expect(result.current.state?.p1.heroPositions[HERO_A.id]).toBeNull();

      act(() => {
        result.current.setHeroLevel("p1", HERO_A.id, 1);
      });
      expect(result.current.state?.p1.heroes[HERO_A.id]).toMatchObject({ level: 1, hp: 0 });
    });

    it("a level-down at 1 HP leaves the hero alive on its space", () => {
      const { result } = renderLevels();
      const spaceId = MAP_SPACE_IDS[0];

      act(() => {
        result.current.setHeroLevel("p1", HERO_A.id, 2);
        result.current.setHeroPosition("p1", HERO_A.id, spaceId);
        result.current.setHeroHp("p1", HERO_A.id, 1);
        result.current.setHeroLevel("p1", HERO_A.id, 1);
      });
      expect(result.current.state?.p1.heroes[HERO_A.id]).toMatchObject({ level: 1, hp: 1 });
      expect(result.current.state?.p1.heroPositions[HERO_A.id]).toBe(spaceId);
    });
  });

  describe("setHeroLevel (intent/22)", () => {
    // HERO_A (Baldwin) pays level + 1; KEN_OBI pays one less.
    function renderGold(gold: number) {
      const hook = renderHook(() => useBattle([HERO_A, KEN_OBI], [HERO_B], "p1"));
      act(() => {
        hook.result.current.setGold("p1", gold);
      });
      return hook;
    }

    it("a level-up pays its price and a level-down refunds it", () => {
      const { result } = renderGold(5);

      act(() => {
        result.current.setHeroLevel("p1", HERO_A.id, 2);
      });
      expect(result.current.state?.p1.gold).toBe(3);
      expect(readRawState().p1.gold).toBe(3);

      act(() => {
        result.current.setHeroLevel("p1", HERO_A.id, 3);
      });
      expect(result.current.state?.p1.gold).toBe(0);
      expect(result.current.state?.p1.heroes[HERO_A.id].level).toBe(3);

      act(() => {
        result.current.setHeroLevel("p1", HERO_A.id, 2);
      });
      expect(result.current.state?.p1.gold).toBe(3);
      expect(result.current.state?.p1.heroes[HERO_A.id]).toMatchObject({ level: 2, hp: 11 });
    });

    it("an unaffordable level-up changes nothing and saves nothing", () => {
      const { result } = renderGold(1);
      const before = result.current.state;
      const savedBefore = window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY);

      act(() => {
        result.current.setHeroLevel("p1", HERO_A.id, 2);
      });
      expect(result.current.state).toBe(before);
      expect(window.localStorage.getItem(BATTLE_STATE_STORAGE_KEY)).toBe(savedBefore);
      expect(result.current.state?.p1.heroes[HERO_A.id]).toMatchObject({ level: 1, hp: 10 });
    });

    it("a defeated hero pays too and stays at 0 HP", () => {
      const { result } = renderGold(2);

      act(() => {
        result.current.setHeroHp("p1", HERO_A.id, 0);
        result.current.setHeroLevel("p1", HERO_A.id, 2);
      });
      expect(result.current.state?.p1.gold).toBe(0);
      expect(result.current.state?.p1.heroes[HERO_A.id]).toMatchObject({ level: 2, hp: 0 });
    });

    it("a jump pays for each level moved, after the clamp", () => {
      const { result } = renderGold(9);

      act(() => {
        result.current.setHeroLevel("p1", HERO_A.id, 9);
      });
      expect(result.current.state?.p1.heroes[HERO_A.id].level).toBe(4);
      expect(result.current.state?.p1.gold).toBe(0);
    });

    it("Ken Obi pays one less per level, and gets the same back", () => {
      const { result } = renderGold(1);

      act(() => {
        result.current.setHeroLevel("p1", KEN_OBI.id, 2);
      });
      expect(result.current.state?.p1.heroes[KEN_OBI.id].level).toBe(2);
      expect(result.current.state?.p1.gold).toBe(0);

      act(() => {
        result.current.setGold("p1", 5);
        result.current.setHeroLevel("p1", KEN_OBI.id, 3);
        result.current.setHeroLevel("p1", KEN_OBI.id, 4);
      });
      expect(result.current.state?.p1.gold).toBe(0);

      act(() => {
        result.current.setHeroLevel("p1", KEN_OBI.id, 3);
      });
      expect(result.current.state?.p1.gold).toBe(3);
    });
  });

  describe("the Arena (intent/14)", () => {
    // Felix (p1) against Cyrus (p2).
    function renderDuel() {
      const hook = renderHook(() => useBattle([OTHER_HERO], [HERO_B], "p1"));
      act(() => {
        hook.result.current.setHeroPosition("p1", OTHER_HERO.id, ARENA_POSITION);
        hook.result.current.setHeroPosition("p2", HERO_B.id, ARENA_POSITION);
      });
      return hook;
    }

    it("an Arena position persists and survives a reload", () => {
      const { unmount } = renderDuel();
      expect(readRawState().p1.heroPositions[OTHER_HERO.id]).toBe(ARENA_POSITION);
      unmount();

      const { result } = renderHook(() => useBattle([OTHER_HERO], [HERO_B], "p1"));
      expect(result.current.state?.p1.heroPositions[OTHER_HERO.id]).toBe(ARENA_POSITION);
      expect(result.current.state?.p2.heroPositions[HERO_B.id]).toBe(ARENA_POSITION);
    });

    it("setHeroHp to 0 sends the defeated duellist to its respawn area, and the other stays", () => {
      const { result } = renderDuel();

      act(() => {
        result.current.setHeroHp("p2", HERO_B.id, 0);
      });

      expect(result.current.state?.p2.heroPositions[HERO_B.id]).toBeNull();
      expect(result.current.state?.p1.heroPositions[OTHER_HERO.id]).toBe(ARENA_POSITION);
    });

    it("setHeroLevel and passInitiative leave Arena positions alone", () => {
      const { result } = renderDuel();

      act(() => {
        result.current.setHeroLevel("p1", OTHER_HERO.id, 1);
        result.current.passInitiative();
      });

      expect(result.current.state?.p1.heroPositions[OTHER_HERO.id]).toBe(ARENA_POSITION);
      expect(result.current.state?.p2.heroPositions[HERO_B.id]).toBe(ARENA_POSITION);
    });
  });
});
