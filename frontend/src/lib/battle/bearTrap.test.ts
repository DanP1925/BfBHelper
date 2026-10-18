import { describe, expect, it } from "vitest";
import { getHeroById } from "../../data/heroes";
import { MAP_SPACE_IDS } from "../../data/mapSpaces";
import type { HeroId } from "../draft/types";
import { bearTrapOwnerSide } from "./bearTrap";
import { battleReducer, createInitialBattleState } from "./reducer";
import type { BattleState } from "./types";

function battle(p1: HeroId[], p2: HeroId[]): BattleState {
  return createInitialBattleState(p1.map(getHeroById), p2.map(getHeroById), "p1");
}

describe("bearTrapOwnerSide", () => {
  it("is the side Boreas was drafted on", () => {
    expect(bearTrapOwnerSide(battle(["boreas", "dazeem"], ["sterling"]))).toBe("p1");
    expect(bearTrapOwnerSide(battle(["dazeem"], ["sterling", "boreas"]))).toBe("p2");
  });

  it("is null when Boreas wasn't drafted", () => {
    expect(bearTrapOwnerSide(battle(["dazeem"], ["sterling"]))).toBeNull();
  });

  it("doesn't depend on Boreas's level, HP or position", () => {
    let state = battle(["dazeem"], ["boreas"]);
    state = battleReducer(state, { type: "SET_HERO_HP", side: "p2", heroId: "boreas", value: 0 });
    expect(bearTrapOwnerSide(state)).toBe("p2");

    state = battleReducer(state, {
      type: "SET_HERO_POSITION",
      side: "p2",
      heroId: "boreas",
      spaceId: MAP_SPACE_IDS[0],
    });
    state = battleReducer(state, {
      type: "SET_HERO_LEVEL",
      side: "p2",
      heroId: "boreas",
      value: 4,
    });
    expect(bearTrapOwnerSide(state)).toBe("p2");
  });
});
