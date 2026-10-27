import { describe, expect, it } from "vitest";
import { HERO_ROSTER } from "../../data/heroes";
import { createInitialHeroState } from "./reducer";
import { getBattleWinner, teamLevel } from "./selectors";
import type { BattleState, BattleTeamState } from "./types";

function team(bitHp: number): BattleTeamState {
  return {
    gold: 0,
    heroes: {} as BattleTeamState["heroes"],
    structures: { top: 11, middle: 11, bottom: 11, bit: bitHp },
    heroPositions: {} as BattleTeamState["heroPositions"],
  };
}

function state(p1BitHp: number, p2BitHp: number): BattleState {
  return {
    schemaVersion: 15,
    p1: team(p1BitHp),
    p2: team(p2BitHp),
    goldPiles: {} as BattleState["goldPiles"],
    initiative: "p1",
    iceWall: null,
    bearTrap: null,
  };
}

describe("getBattleWinner", () => {
  it("returns null when neither Bit is at 0", () => {
    expect(getBattleWinner(state(16, 16))).toBeNull();
  });

  it("returns p2 when only p1's Bit is at 0", () => {
    expect(getBattleWinner(state(0, 16))).toBe("p2");
  });

  it("returns p1 when only p2's Bit is at 0", () => {
    expect(getBattleWinner(state(16, 0))).toBe("p1");
  });

  it("returns 'draw' when both Bits are simultaneously at 0", () => {
    expect(getBattleWinner(state(0, 0))).toBe("draw");
  });
});

/** A 4-hero team at the given levels (and HP, if given), in roster order. */
function teamAtLevels(levels: number[], hps: number[] = []): BattleTeamState {
  const heroes = Object.fromEntries(
    HERO_ROSTER.slice(0, levels.length).map((hero, index) => {
      const initial = createInitialHeroState(hero);
      return [hero.id, { ...initial, level: levels[index], hp: hps[index] ?? initial.hp }];
    }),
  ) as BattleTeamState["heroes"];
  return { ...team(16), heroes };
}

describe("teamLevel", () => {
  it("is 0 for a fresh team", () => {
    expect(teamLevel(teamAtLevels([1, 1, 1, 1]))).toBe(0);
  });

  it("counts one level-up as 1", () => {
    expect(teamLevel(teamAtLevels([2, 1, 1, 1]))).toBe(1);
  });

  it("adds level-ups across heroes", () => {
    expect(teamLevel(teamAtLevels([3, 4, 1, 1]))).toBe(5);
  });

  it("is 12 when every hero is at level 4", () => {
    expect(teamLevel(teamAtLevels([4, 4, 4, 4]))).toBe(12);
  });

  it("still counts a defeated hero's level-ups", () => {
    expect(teamLevel(teamAtLevels([3, 1, 1, 1], [0]))).toBe(2);
  });
});
