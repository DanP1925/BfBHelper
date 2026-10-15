import { describe, expect, it } from "vitest";
import { getHeroById } from "../../data/heroes";
import { heroSpecificTokenSide, targetSideForRule } from "./heroSpecificTokens";

const kunoichi = getHeroById("kunoichi");
const boreas = getHeroById("boreas");
const sterling = getHeroById("sterling");
const caligar = getHeroById("caligar");

describe("heroSpecificTokenSide", () => {
  it("offers Death Mark to p2 when Kunoichi is on p1", () => {
    expect(
      heroSpecificTokenSide("deathMark", { p1: [boreas, kunoichi], p2: [sterling, caligar] }),
    ).toBe("p2");
  });

  it("offers Death Mark to p1 when Kunoichi is on p2", () => {
    expect(
      heroSpecificTokenSide("deathMark", { p1: [boreas, sterling], p2: [caligar, kunoichi] }),
    ).toBe("p1");
  });

  it("offers Death Mark to nobody when Kunoichi wasn't drafted", () => {
    expect(
      heroSpecificTokenSide("deathMark", { p1: [boreas, sterling], p2: [caligar] }),
    ).toBeNull();
  });
});

describe("targetSideForRule", () => {
  it("returns the owner's own side for an allies token", () => {
    const rule = { owner: "boreas", targets: "allies" } as const;
    expect(targetSideForRule(rule, { p1: [sterling], p2: [boreas] })).toBe("p2");
    expect(targetSideForRule(rule, { p1: [boreas], p2: [sterling] })).toBe("p1");
    expect(targetSideForRule(rule, { p1: [sterling], p2: [caligar] })).toBeNull();
  });
});
