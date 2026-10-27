import { describe, expect, it } from "vitest";
import { HERO_ROSTER } from "../../data/heroes";
import { createInitialBattleState } from "./reducer";
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

/** A fresh 4-hero team, with its heroes at the given levels in roster order. */
function teamAtLevels(levels: number[]): BattleTeamState {
  const roster = HERO_ROSTER.slice(0, 4);
  const fresh = createInitialBattleState(roster, [], "p1").p1;
  roster.forEach((hero, index) => {
    fresh.heroes[hero.id] = { ...fresh.heroes[hero.id], level: levels[index] };
  });
  return fresh;
}

describe("teamLevel", () => {
  it.each([
    { levels: [1, 1, 1, 1], expected: 0 },
    { levels: [2, 1, 1, 1], expected: 1 },
    { levels: [3, 4, 1, 1], expected: 5 },
    { levels: [4, 4, 4, 4], expected: 12 },
  ])("is $expected for heroes at levels $levels", ({ levels, expected }) => {
    expect(teamLevel(teamAtLevels(levels))).toBe(expected);
  });
});
