import { describe, expect, it } from "vitest";
import { canAffordLevelUp, goldForLevelChange, hpAfterLevelChange, levelUpCost } from "./levelUp";

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

  it("takes 1 HP off a hero at the ceiling on a level-down", () => {
    expect(hpAfterLevelChange(15, -1)).toBe(14);
  });
});

describe("levelUpCost", () => {
  it("is the current level plus one, and null at level 4", () => {
    expect(levelUpCost("ceralin", 1)).toBe(2);
    expect(levelUpCost("ceralin", 2)).toBe(3);
    expect(levelUpCost("ceralin", 3)).toBe(4);
    expect(levelUpCost("ceralin", 4)).toBeNull();
  });

  it("is one less for Ken Obi", () => {
    expect(levelUpCost("ken-obi", 1)).toBe(1);
    expect(levelUpCost("ken-obi", 2)).toBe(2);
    expect(levelUpCost("ken-obi", 3)).toBe(3);
    expect(levelUpCost("ken-obi", 4)).toBeNull();
  });
});

describe("goldForLevelChange", () => {
  it("pays going up and refunds going down", () => {
    expect(goldForLevelChange("ceralin", 1, 2)).toBe(2);
    expect(goldForLevelChange("ceralin", 3, 2)).toBe(-3);
  });

  it("pays for each level of a jump", () => {
    expect(goldForLevelChange("ceralin", 1, 4)).toBe(9);
    expect(goldForLevelChange("ken-obi", 1, 4)).toBe(6);
    expect(goldForLevelChange("ken-obi", 4, 1)).toBe(-6);
  });

  it("is 0 when the level doesn't move", () => {
    expect(goldForLevelChange("ceralin", 4, 4)).toBe(0);
  });
});

describe("canAffordLevelUp", () => {
  it("needs at least the next level's price", () => {
    expect(canAffordLevelUp("ceralin", 3, 2)).toBe(true);
    expect(canAffordLevelUp("ceralin", 2, 2)).toBe(false);
    expect(canAffordLevelUp("ken-obi", 1, 1)).toBe(true);
  });

  it("is false at level 4, whatever the gold", () => {
    expect(canAffordLevelUp("ceralin", 99, 4)).toBe(false);
  });
});
