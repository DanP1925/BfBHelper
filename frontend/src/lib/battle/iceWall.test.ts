import { describe, expect, it } from "vitest";
import { getHeroById } from "../../data/heroes";
import { MAP_SPACE_IDS } from "../../data/mapSpaces";
import type { HeroId } from "../draft/types";
import { iceWallOwnerSide } from "./iceWall";
import { battleReducer, createInitialBattleState } from "./reducer";
import type { BattleState } from "./types";

function battle(p1: HeroId[], p2: HeroId[]): BattleState {
  return createInitialBattleState(p1.map(getHeroById), p2.map(getHeroById), "p1");
}

describe("iceWallOwnerSide", () => {
  it("is the side Dazeem was drafted on", () => {
    expect(iceWallOwnerSide(battle(["dazeem", "boreas"], ["sterling"]))).toBe("p1");
    expect(iceWallOwnerSide(battle(["boreas"], ["sterling", "dazeem"]))).toBe("p2");
  });

  it("is null when Dazeem wasn't drafted", () => {
    expect(iceWallOwnerSide(battle(["boreas"], ["sterling"]))).toBeNull();
  });

  it("doesn't depend on Dazeem's level, HP or position", () => {
    let state = battle(["boreas"], ["dazeem"]);
    state = battleReducer(state, { type: "SET_HERO_HP", side: "p2", heroId: "dazeem", value: 0 });
    expect(iceWallOwnerSide(state)).toBe("p2");

    state = battleReducer(state, {
      type: "SET_HERO_POSITION",
      side: "p2",
      heroId: "dazeem",
      spaceId: MAP_SPACE_IDS[0],
    });
    state = battleReducer(state, {
      type: "SET_HERO_LEVEL",
      side: "p2",
      heroId: "dazeem",
      value: 4,
    });
    expect(iceWallOwnerSide(state)).toBe("p2");
  });
});
