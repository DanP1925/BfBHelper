import { describe, expect, it } from "vitest";
import { getBattleWinner } from "./selectors";
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
    schemaVersion: 2,
    p1: team(p1BitHp),
    p2: team(p2BitHp),
    goldPiles: {} as BattleState["goldPiles"],
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
