import { describe, expect, it } from "vitest";
import { nextPosition, previousPosition, type RoundPosition } from "./phase";

// Spec 21's step table.
describe("nextPosition", () => {
  it.each<[RoundPosition, RoundPosition]>([
    [
      { round: 1, phase: "orders" },
      { round: 1, phase: "movement" },
    ],
    [
      { round: 1, phase: "movement" },
      { round: 1, phase: "action" },
    ],
    [
      { round: 1, phase: "action" },
      { round: 1, phase: "cleanup" },
    ],
    [
      { round: 3, phase: "cleanup" },
      { round: 4, phase: "orders" },
    ],
  ])("moves %o forward to %o", (from, to) => {
    expect(nextPosition(from)).toEqual(to);
  });
});

describe("previousPosition", () => {
  it.each<[RoundPosition, RoundPosition]>([
    [
      { round: 2, phase: "movement" },
      { round: 2, phase: "orders" },
    ],
    [
      { round: 2, phase: "cleanup" },
      { round: 2, phase: "action" },
    ],
    [
      { round: 4, phase: "orders" },
      { round: 3, phase: "cleanup" },
    ],
  ])("moves %o back to %o", (from, to) => {
    expect(previousPosition(from)).toEqual(to);
  });

  it("is null at Round 1, Orders: the battle can't step back past its start", () => {
    expect(previousPosition({ round: 1, phase: "orders" })).toBeNull();
  });

  it("undoes nextPosition everywhere it can", () => {
    for (let round = 1; round <= 3; round++) {
      for (const phase of ["orders", "movement", "action", "cleanup"] as const) {
        const from = { round, phase };
        expect(previousPosition(nextPosition(from))).toEqual(from);
      }
    }
  });
});
