import { describe, expect, it } from "vitest";
import {
  STEP_BOUNDARIES,
  STEP_SEQUENCE,
  TOTAL_PICKS,
  getCurrentStepIndex,
  getPicksRequiredForStep,
  getPicksRequiredForTotal,
  isDraftDone,
} from "./sequence";

describe("sequence", () => {
  it("has the fixed 5-step sequence with cumulative boundaries [1,3,5,7,8]", () => {
    expect(STEP_SEQUENCE).toEqual([1, 2, 2, 2, 1]);
    expect(STEP_BOUNDARIES).toEqual([1, 3, 5, 7, 8]);
    expect(TOTAL_PICKS).toBe(8);
  });

  // Scenario 13: step/turn derivation is a pure function of total picks;
  // cumulative boundaries [1,3,5,7,8] match the step sequence exactly.
  it("derives the current step purely from totalPicks, matching the boundaries", () => {
    const expectations: Array<[number, number]> = [
      [0, 1],
      [1, 2],
      [2, 2],
      [3, 3],
      [4, 3],
      [5, 4],
      [6, 4],
      [7, 5],
      [8, 5],
    ];
    for (const [totalPicks, expectedStep] of expectations) {
      expect(getCurrentStepIndex(totalPicks)).toBe(expectedStep);
    }
  });

  it("is a pure function — same input always yields same output", () => {
    for (let i = 0; i <= 8; i++) {
      expect(getCurrentStepIndex(i)).toBe(getCurrentStepIndex(i));
    }
  });

  it("reports picks required per step matching STEP_SEQUENCE", () => {
    STEP_SEQUENCE.forEach((count, idx) => {
      expect(getPicksRequiredForStep(idx + 1)).toBe(count);
    });
  });

  it("reports picks required for a given total-picks count", () => {
    expect(getPicksRequiredForTotal(0)).toBe(1);
    expect(getPicksRequiredForTotal(1)).toBe(2);
    expect(getPicksRequiredForTotal(3)).toBe(2);
    expect(getPicksRequiredForTotal(5)).toBe(2);
    expect(getPicksRequiredForTotal(7)).toBe(1);
  });

  it("is done only once totalPicks reaches 8", () => {
    for (let i = 0; i < 8; i++) {
      expect(isDraftDone(i)).toBe(false);
    }
    expect(isDraftDone(8)).toBe(true);
    expect(isDraftDone(9)).toBe(true);
  });
});
