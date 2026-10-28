import { describe, expect, it } from "vitest";
import { NO_TOKENS } from "../../test/heroState";
import type { HeroId } from "../draft/types";
import { cardsAhead, formatRespawnWindow, respawnWindow, sameRespawnWindow } from "./respawn";
import type { BattleTeamState } from "./types";

const IDS: HeroId[] = ["boreas", "caligar", "ceralin", "cyrus"];

/** A team of four heroes at these levels; the first `defeated` are at 0 HP. */
function team(levels: number[], defeated: number): BattleTeamState {
  return {
    gold: 0,
    heroes: Object.fromEntries(
      levels.map((level, i) => [IDS[i], { hp: i < defeated ? 0 : 5, level, ...NO_TOKENS }]),
    ) as BattleTeamState["heroes"],
    structures: { top: 11, middle: 11, bottom: 11, bit: 16 },
    heroPositions: Object.fromEntries(IDS.map((id) => [id, null])) as Record<HeroId, null>,
  };
}

describe("cardsAhead / respawnWindow (intent/24)", () => {
  it.each([
    // levels, heroes down, round, cards ahead, window
    [[1, 2, 2, 3], 1, 3, 9, { from: 4, to: 6 }], // the intent's Proposed Outcome
    [[1, 1, 1, 1], 1, 1, 5, { from: 1, to: 2 }],
    [[1, 1, 1, 1], 2, 2, 6, { from: 2, to: 5 }], // a second defeat
    [[4, 4, 4, 4], 1, 5, 17, { from: 7, to: 10 }],
    [[4, 4, 4, 4], 4, 5, 20, { from: 7, to: null }], // no hero standing
    [[2, 2, 2, 2], 3, 4, 11, { from: 5, to: 15 }],
  ])(
    "levels %j with %i down in Round %i: %i cards ahead, window %j",
    (levels, down, round, ahead, window) => {
      const t = team(levels, down);
      expect(cardsAhead(t)).toBe(ahead);
      expect(respawnWindow(t, round)).toEqual(window);
    },
  );

  it("counts a defeated hero's levels: its power cards are still in the deck", () => {
    // The fallen hero is level 4: 4 + (4 + 1 + 1 + 1) - 3 living.
    expect(cardsAhead(team([4, 1, 1, 1], 1))).toBe(8);
  });
});

describe("formatRespawnWindow (intent/24)", () => {
  it.each([
    [{ from: 4, to: 6 }, "Round 4–6", "R4–6"],
    [{ from: 4, to: 4 }, "Round 4", "R4"],
    [{ from: 7, to: null }, "Round 7+", "R7+"],
  ])("%j reads %s, or %s short", (window, long, short) => {
    expect(formatRespawnWindow(window)).toBe(long);
    expect(formatRespawnWindow(window, true)).toBe(short);
  });
});

describe("sameRespawnWindow", () => {
  it("compares by value, with null only equal to null", () => {
    expect(sameRespawnWindow(null, null)).toBe(true);
    expect(sameRespawnWindow({ from: 4, to: 6 }, { from: 4, to: 6 })).toBe(true);
    expect(sameRespawnWindow({ from: 4, to: null }, { from: 4, to: null })).toBe(true);
    expect(sameRespawnWindow({ from: 4, to: 6 }, { from: 4, to: 7 })).toBe(false);
    expect(sameRespawnWindow({ from: 4, to: 6 }, null)).toBe(false);
    expect(sameRespawnWindow(null, { from: 4, to: 6 })).toBe(false);
  });
});
