import { describe, expect, it } from "vitest";
import { getHeroById } from "../../data/heroes";
import { MAP_SPACE_IDS } from "../../data/mapSpaces";
import type { HeroId, PlayerId } from "../draft/types";
import { ARENA_POSITION } from "../map/constants";
import { arenaOccupants, arenaOwnerSide, canEnterArena, isArenaShown } from "./arena";
import { createInitialBattleState } from "./reducer";
import type { BattleState, HeroPosition } from "./types";

const SPACE = MAP_SPACE_IDS[0];

function battle(p1: HeroId[], p2: HeroId[]): BattleState {
  return createInitialBattleState(p1.map(getHeroById), p2.map(getHeroById), "p1");
}

/** Felix (p1, with ally Boreas) against Sterling and Caligar (p2). */
const duel = () => battle(["felix", "boreas"], ["sterling", "caligar"]);

function withHero(
  state: BattleState,
  side: PlayerId,
  heroId: HeroId,
  changes: { level?: number; hp?: number; position?: HeroPosition },
): BattleState {
  const team = state[side];
  const hero = team.heroes[heroId];
  return {
    ...state,
    [side]: {
      ...team,
      heroes: {
        ...team.heroes,
        [heroId]: { ...hero, level: changes.level ?? hero.level, hp: changes.hp ?? hero.hp },
      },
      heroPositions:
        changes.position === undefined
          ? team.heroPositions
          : { ...team.heroPositions, [heroId]: changes.position },
    },
  };
}

/** Felix at level 4 on a board space: the Arena can open. */
const felixReady = () => withHero(duel(), "p1", "felix", { level: 4, position: SPACE });

describe("arenaOwnerSide", () => {
  it("finds Felix on either side", () => {
    expect(arenaOwnerSide(battle(["felix"], ["sterling"]))).toBe("p1");
    expect(arenaOwnerSide(battle(["sterling"], ["felix"]))).toBe("p2");
  });

  it("is null when Felix wasn't drafted", () => {
    expect(arenaOwnerSide(battle(["boreas"], ["sterling"]))).toBeNull();
  });
});

describe("arenaOccupants", () => {
  it("is empty when nobody is in the Arena", () => {
    expect(arenaOccupants(felixReady())).toEqual([]);
  });

  it("lists P1 before P2", () => {
    const state = withHero(
      withHero(duel(), "p2", "sterling", { position: ARENA_POSITION }),
      "p1",
      "felix",
      { position: ARENA_POSITION },
    );
    expect(arenaOccupants(state)).toEqual([
      { side: "p1", heroId: "felix" },
      { side: "p2", heroId: "sterling" },
    ]);
  });
});

describe("isArenaShown", () => {
  it("is false without Felix", () => {
    expect(isArenaShown(battle(["boreas"], ["sterling"]))).toBe(false);
  });

  it.each([1, 2, 3])("is false with Felix at level %i", (level) => {
    expect(isArenaShown(withHero(duel(), "p1", "felix", { level, position: SPACE }))).toBe(false);
  });

  it("is true with Felix at level 4 on a board space", () => {
    expect(isArenaShown(felixReady())).toBe(true);
  });

  it("is false with Felix at level 4 but at 0 HP", () => {
    expect(isArenaShown(withHero(felixReady(), "p1", "felix", { hp: 0 }))).toBe(false);
  });

  it("is false with Felix at level 4 and HP but still in his respawn area", () => {
    expect(isArenaShown(withHero(felixReady(), "p1", "felix", { position: null }))).toBe(false);
  });

  it("stays true while anyone is inside, whatever Felix's level or state", () => {
    const enemyInside = withHero(duel(), "p2", "sterling", { position: ARENA_POSITION });
    expect(isArenaShown(enemyInside)).toBe(true);
    expect(isArenaShown(withHero(enemyInside, "p1", "felix", { hp: 0, position: null }))).toBe(
      true,
    );
    // A hand-edited save: someone inside with no Felix drafted at all.
    const noFelix = withHero(battle(["boreas"], ["sterling"]), "p2", "sterling", {
      position: ARENA_POSITION,
    });
    expect(isArenaShown(noFelix)).toBe(true);
  });
});

describe("canEnterArena", () => {
  it("lets Felix in", () => {
    expect(canEnterArena(felixReady(), { side: "p1", heroId: "felix" })).toBe(true);
  });

  it("lets an enemy into an empty or Felix-only Arena", () => {
    expect(canEnterArena(felixReady(), { side: "p2", heroId: "sterling" })).toBe(true);
    const felixInside = withHero(felixReady(), "p1", "felix", { position: ARENA_POSITION });
    expect(canEnterArena(felixInside, { side: "p2", heroId: "sterling" })).toBe(true);
  });

  it("refuses a second enemy, but not the one already inside", () => {
    const sterlingInside = withHero(felixReady(), "p2", "sterling", {
      position: ARENA_POSITION,
    });
    expect(canEnterArena(sterlingInside, { side: "p2", heroId: "caligar" })).toBe(false);
    expect(canEnterArena(sterlingInside, { side: "p2", heroId: "sterling" })).toBe(true);
  });

  it("refuses Felix's allies", () => {
    expect(canEnterArena(felixReady(), { side: "p1", heroId: "boreas" })).toBe(false);
  });

  it("refuses everyone when Felix wasn't drafted", () => {
    const state = battle(["boreas"], ["sterling"]);
    expect(canEnterArena(state, { side: "p1", heroId: "boreas" })).toBe(false);
    expect(canEnterArena(state, { side: "p2", heroId: "sterling" })).toBe(false);
  });

  it("doesn't check HP or level", () => {
    const state = withHero(withHero(duel(), "p1", "felix", { level: 1, hp: 0 }), "p2", "sterling", {
      hp: 0,
    });
    expect(canEnterArena(state, { side: "p1", heroId: "felix" })).toBe(true);
    expect(canEnterArena(state, { side: "p2", heroId: "sterling" })).toBe(true);
  });
});
