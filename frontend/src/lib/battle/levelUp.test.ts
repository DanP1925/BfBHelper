import { describe, expect, it } from "vitest";
import { hpAfterLevelChange } from "./levelUp";

describe("hpAfterLevelChange", () => {
  it("adds 1 HP on a level-up", () => {
    expect(hpAfterLevelChange(6, 1)).toBe(7);
  });

  it("takes 1 HP off on a level-down, undoing a level-up", () => {
    expect(hpAfterLevelChange(7, -1)).toBe(6);
  });

  it("moves 1 HP per level moved", () => {
    expect(hpAfterLevelChange(6, 3)).toBe(9);
  });

  it("leaves a defeated hero at 0 either way", () => {
    expect(hpAfterLevelChange(0, 1)).toBe(0);
    expect(hpAfterLevelChange(0, -1)).toBe(0);
  });

  it("never takes a living hero below 1 on a level-down", () => {
    expect(hpAfterLevelChange(1, -1)).toBe(1);
  });

  it("leaves the HP ceiling to the reducer", () => {
    expect(hpAfterLevelChange(15, 1)).toBe(16);
    expect(hpAfterLevelChange(15, -1)).toBe(14);
  });
});
