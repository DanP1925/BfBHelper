import { describe, expect, it } from "vitest";
import type { DraftState, HeroId, PlayerId } from "./types";
import { draftReducer } from "./reducer";
import {
  getCurrentStep,
  getCurrentTurnPlayer,
  getPicksRequiredThisStep,
  getRemainingPool,
  isDraftComplete,
} from "./selectors";
import { HERO_IDS } from "../../data/heroes";

function pick(player: PlayerId, heroId: HeroId) {
  return { type: "PICK_HERO" as const, player, heroId };
}

function newDraft(initiative: PlayerId) {
  return { type: "NEW_DRAFT" as const, initiative };
}

/** Drives a full, valid 8-pick draft, always picking the correct turn's next hero. */
function playFullDraft(initiative: PlayerId): DraftState {
  let state = draftReducer(
    { initiative: "p1", picks: { p1: ["baldwin"], p2: [] } },
    newDraft(initiative),
  );
  let heroIndex = 0;
  while (!isDraftComplete(state)) {
    const turn = getCurrentTurnPlayer(state);
    if (!turn) break;
    state = draftReducer(state, pick(turn, HERO_IDS[heroIndex]));
    heroIndex += 1;
  }
  return state;
}

describe("draftReducer", () => {
  // Scenario 2: NEW_DRAFT resets any prior state to zero picks.
  it("NEW_DRAFT resets prior state to zero picks with the given initiative", () => {
    const priorState: DraftState = {
      initiative: "p2",
      picks: { p1: ["baldwin", "cyrus"], p2: ["felix"] },
    };
    const next = draftReducer(priorState, newDraft("p1"));
    expect(next).toEqual({ initiative: "p1", picks: { p1: [], p2: [] } });
  });

  // Scenario 3 (via reducer + selectors): immediately after NEW_DRAFT,
  // initiative player's turn, step 1 of 5, 1 pick required.
  it("after NEW_DRAFT: initiative's turn, step 1, 1 pick required", () => {
    const state = draftReducer({ initiative: "p1", picks: { p1: [], p2: [] } }, newDraft("p2"));
    expect(getCurrentTurnPlayer(state)).toBe("p2");
    expect(getCurrentStep(state)).toBe(1);
    expect(getPicksRequiredThisStep(state)).toBe(1);
  });

  // Scenario 4: after the initiative player's pick, turn passes, step 2, 2
  // picks required.
  it("after the initiative player's pick: turn passes, step 2, 2 picks required", () => {
    let state: DraftState = { initiative: "p1", picks: { p1: [], p2: [] } };
    state = draftReducer(state, pick("p1", "baldwin"));
    expect(state.picks.p1).toEqual(["baldwin"]);
    expect(getCurrentStep(state)).toBe(2);
    expect(getPicksRequiredThisStep(state)).toBe(2);
    expect(getCurrentTurnPlayer(state)).toBe("p2");
  });

  // Scenario 5: full 5-step sequence resolves correctly for both initiative
  // assignments.
  it.each<PlayerId>(["p1", "p2"])(
    "resolves the full 5-step, 8-pick draft when initiative is %s",
    (initiative) => {
      const final = playFullDraft(initiative);
      expect(final.picks.p1.length).toBe(4);
      expect(final.picks.p2.length).toBe(4);
      expect(isDraftComplete(final)).toBe(true);
      // no duplicate picks anywhere
      const all = [...final.picks.p1, ...final.picks.p2];
      expect(new Set(all).size).toBe(all.length);
    },
  );

  // Scenario 6: within a 2-pick step, both picks belong to the same player.
  it("both picks in a 2-pick step belong to the same player", () => {
    let state: DraftState = { initiative: "p1", picks: { p1: [], p2: [] } };
    state = draftReducer(state, pick("p1", "baldwin")); // step 1 done, now step 2 / p2's turn
    expect(getCurrentTurnPlayer(state)).toBe("p2");
    state = draftReducer(state, pick("p2", "cyrus")); // 1st of step 2
    expect(getCurrentStep(state)).toBe(2);
    expect(getCurrentTurnPlayer(state)).toBe("p2"); // still p2 for 2nd of step 2
    state = draftReducer(state, pick("p2", "felix")); // 2nd of step 2
    expect(state.picks.p2).toEqual(["cyrus", "felix"]);
    expect(getCurrentStep(state)).toBe(3);
    expect(getCurrentTurnPlayer(state)).toBe("p1");
  });

  // Scenario 7: a pick from the wrong player's turn is rejected.
  it("rejects a pick from the wrong player's turn, leaving state unchanged", () => {
    const state: DraftState = { initiative: "p1", picks: { p1: [], p2: [] } };
    const next = draftReducer(state, pick("p2", "baldwin"));
    expect(next).toBe(state);
    expect(next.picks).toEqual({ p1: [], p2: [] });
  });

  // Scenario 8: a pick for an already-picked hero is rejected.
  it("rejects a pick for a hero already picked (by either player)", () => {
    let state: DraftState = { initiative: "p1", picks: { p1: ["baldwin"], p2: ["cyrus"] } };
    const beforePicks = state.picks;
    // p1's turn now (step 2, second pick already made by... let's set up a clean case)
    state = { initiative: "p1", picks: { p1: ["baldwin"], p2: [] } };
    // it's p2's turn (step 2); try to have p2 pick baldwin, already taken by p1
    const next = draftReducer(state, pick("p2", "baldwin"));
    expect(next).toBe(state);
    expect(next.picks.p1).toEqual(["baldwin"]);
    expect(next.picks.p2).toEqual([]);
    expect(beforePicks).toBeDefined(); // sanity, unused var guard
  });

  // Scenario 9: a pick for an unknown hero id is rejected.
  it("rejects a pick for an unknown hero id", () => {
    const state: DraftState = { initiative: "p1", picks: { p1: [], p2: [] } };
    const next = draftReducer(state, pick("p1", "not-a-real-hero" as HeroId));
    expect(next).toBe(state);
    expect(next.picks).toEqual({ p1: [], p2: [] });
  });

  // Scenario 12: after the 8th total pick, draft transitions to done; further
  // picks are no-ops.
  it("further picks after the 8th are no-ops", () => {
    const done = playFullDraft("p1");
    expect(isDraftComplete(done)).toBe(true);
    const unusedHero = HERO_IDS.find(
      (id) => !done.picks.p1.includes(id) && !done.picks.p2.includes(id),
    )!;
    const next = draftReducer(done, pick("p1", unusedHero));
    expect(next).toBe(done);
  });

  it("scenario 10 sanity via reducer: pool shrinks and never re-offers a picked hero", () => {
    let state: DraftState = { initiative: "p1", picks: { p1: [], p2: [] } };
    state = draftReducer(state, pick("p1", "baldwin"));
    const pool = getRemainingPool(state, HERO_IDS);
    expect(pool).not.toContain("baldwin");
  });
});
