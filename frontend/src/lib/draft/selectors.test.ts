import { describe, expect, it } from "vitest";
import type { DraftState } from "./types";
import {
  getCurrentStep,
  getCurrentTurnPlayer,
  getPicksRequiredThisStep,
  getRemainingPool,
  getTeamSlots,
  getTotalPicks,
  isDraftComplete,
} from "./selectors";
import { ALL_HERO_IDS } from "./heroIdsLocal";

function freshState(initiative: DraftState["initiative"] = "p1"): DraftState {
  return { initiative, picks: { p1: [], p2: [] } };
}

describe("selectors", () => {
  it("computes total picks from both players' picks", () => {
    const state: DraftState = {
      initiative: "p1",
      picks: { p1: ["baldwin"], p2: ["cyrus", "felix"] },
    };
    expect(getTotalPicks(state)).toBe(3);
  });

  // Scenario 3: immediately after NEW_DRAFT, initiative player's turn, step 1
  // of 5, 1 pick required.
  it("starts at step 1 with 1 pick required and the initiative player's turn", () => {
    const state = freshState("p2");
    expect(getCurrentStep(state)).toBe(1);
    expect(getPicksRequiredThisStep(state)).toBe(1);
    expect(getCurrentTurnPlayer(state)).toBe("p2");
  });

  // Scenario 4: after the initiative player's pick, turn passes, step 2, 2
  // picks required.
  it("passes turn to the other player after step 1's single pick", () => {
    const state: DraftState = { initiative: "p1", picks: { p1: ["baldwin"], p2: [] } };
    expect(getCurrentStep(state)).toBe(2);
    expect(getPicksRequiredThisStep(state)).toBe(2);
    expect(getCurrentTurnPlayer(state)).toBe("p2");
  });

  // Scenario 6: within a 2-pick step, both picks belong to the same player
  // (not a snake draft).
  it("keeps turn with the same player for both picks within a 2-pick step", () => {
    const afterFirstOfStep2: DraftState = {
      initiative: "p1",
      picks: { p1: ["baldwin"], p2: ["cyrus"] },
    };
    expect(getCurrentStep(afterFirstOfStep2)).toBe(2);
    expect(getCurrentTurnPlayer(afterFirstOfStep2)).toBe("p2");
  });

  // Scenario 5: full 5-step sequence resolves correctly for both initiative
  // assignments.
  it("resolves the full 5-step turn order for initiative = p1", () => {
    const turnsByStep: Array<[DraftState, string | null]> = [
      [{ initiative: "p1", picks: { p1: [], p2: [] } }, "p1"], // step 1
      [{ initiative: "p1", picks: { p1: ["agatha-trunch"], p2: [] } }, "p2"], // step 2
      [
        { initiative: "p1", picks: { p1: ["agatha-trunch"], p2: ["boreas", "caligar"] } },
        "p1",
      ], // step 3
      [
        {
          initiative: "p1",
          picks: {
            p1: ["agatha-trunch", "ceralin", "cynthia"],
            p2: ["boreas", "caligar"],
          },
        },
        "p2",
      ], // step 4
      [
        {
          initiative: "p1",
          picks: {
            p1: ["agatha-trunch", "ceralin", "cynthia"],
            p2: ["boreas", "caligar", "cyrus", "dazeem"],
          },
        },
        "p1",
      ], // step 5
    ];
    turnsByStep.forEach(([state, expectedTurn], idx) => {
      expect(getCurrentStep(state)).toBe(idx + 1);
      expect(getCurrentTurnPlayer(state)).toBe(expectedTurn);
    });
  });

  it("resolves the full 5-step turn order for initiative = p2 (mirrored)", () => {
    const turnsByStep: Array<[DraftState, string | null]> = [
      [{ initiative: "p2", picks: { p1: [], p2: [] } }, "p2"],
      [{ initiative: "p2", picks: { p1: [], p2: ["agatha-trunch"] } }, "p1"],
      [
        { initiative: "p2", picks: { p1: ["boreas", "caligar"], p2: ["agatha-trunch"] } },
        "p2",
      ],
      [
        {
          initiative: "p2",
          picks: {
            p1: ["boreas", "caligar"],
            p2: ["agatha-trunch", "ceralin", "cynthia"],
          },
        },
        "p1",
      ],
      [
        {
          initiative: "p2",
          picks: {
            p1: ["boreas", "caligar", "cyrus", "dazeem"],
            p2: ["agatha-trunch", "ceralin", "cynthia"],
          },
        },
        "p2",
      ],
    ];
    turnsByStep.forEach(([state, expectedTurn], idx) => {
      expect(getCurrentStep(state)).toBe(idx + 1);
      expect(getCurrentTurnPlayer(state)).toBe(expectedTurn);
    });
  });

  // Scenario 10: pool never offers an already-picked hero.
  it("excludes every already-picked hero from the remaining pool", () => {
    const state: DraftState = {
      initiative: "p1",
      picks: { p1: ["baldwin", "cyrus"], p2: ["felix"] },
    };
    const pool = getRemainingPool(state, ALL_HERO_IDS);
    expect(pool).not.toContain("baldwin");
    expect(pool).not.toContain("cyrus");
    expect(pool).not.toContain("felix");
    expect(pool.length).toBe(ALL_HERO_IDS.length - 3);
    // every remaining id is still a known id
    pool.forEach((id) => expect(ALL_HERO_IDS).toContain(id));
  });

  it("offers the full pool when nothing has been picked", () => {
    const pool = getRemainingPool(freshState(), ALL_HERO_IDS);
    expect(pool).toEqual(ALL_HERO_IDS);
  });

  // Scenario 11: each player's derived team slots contain exactly their
  // picks, in order; unfilled slots are empty placeholders.
  it("derives team slots as picks in order, padded with null placeholders", () => {
    const state: DraftState = {
      initiative: "p1",
      picks: { p1: ["baldwin", "cyrus"], p2: ["felix"] },
    };
    expect(getTeamSlots(state, "p1")).toEqual(["baldwin", "cyrus", null, null]);
    expect(getTeamSlots(state, "p2")).toEqual(["felix", null, null, null]);
  });

  it("derives a full team with no placeholders once 4 picks are made", () => {
    const state: DraftState = {
      initiative: "p1",
      picks: { p1: ["agatha-trunch", "boreas", "caligar", "ceralin"], p2: [] },
    };
    expect(getTeamSlots(state, "p1")).toEqual(["agatha-trunch", "boreas", "caligar", "ceralin"]);
  });

  // Scenario 12: after the 8th total pick, draft transitions to done.
  it("reports draft complete only once all 8 picks are made", () => {
    const almostDone: DraftState = {
      initiative: "p1",
      picks: {
        p1: ["agatha-trunch", "ceralin", "cynthia"],
        p2: ["boreas", "caligar", "cyrus", "dazeem"],
      },
    };
    expect(isDraftComplete(almostDone)).toBe(false);
    expect(getCurrentTurnPlayer(almostDone)).not.toBeNull();

    const done: DraftState = {
      initiative: "p1",
      picks: {
        p1: ["agatha-trunch", "ceralin", "cynthia", "dolgolae"],
        p2: ["boreas", "caligar", "cyrus", "dazeem"],
      },
    };
    expect(isDraftComplete(done)).toBe(true);
    expect(getCurrentTurnPlayer(done)).toBeNull();
  });
});
