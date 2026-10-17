import { describe, expect, it } from "vitest";
import { getHeroById } from "../../data/heroes";
import { heroSpecificTokenSide, targetSideForRule } from "./heroSpecificTokens";

const kunoichi = getHeroById("kunoichi");
const boreas = getHeroById("boreas");
const sterling = getHeroById("sterling");
const caligar = getHeroById("caligar");
const cyrus = getHeroById("cyrus");
const sedusa = getHeroById("sedusa");
const dazeem = getHeroById("dazeem");

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

  it("offers Shield to Cyrus's own team, whichever side he's on", () => {
    expect(heroSpecificTokenSide("shield", { p1: [boreas, cyrus], p2: [sterling] })).toBe("p1");
    expect(heroSpecificTokenSide("shield", { p1: [boreas], p2: [cyrus, sterling] })).toBe("p2");
  });

  it("offers Shield to nobody when Cyrus wasn't drafted", () => {
    expect(heroSpecificTokenSide("shield", { p1: [boreas], p2: [kunoichi] })).toBeNull();
  });

  it("offers Stone to Sedusa's enemies, whichever side she's on", () => {
    expect(heroSpecificTokenSide("stone", { p1: [boreas, sedusa], p2: [sterling] })).toBe("p2");
    expect(heroSpecificTokenSide("stone", { p1: [boreas], p2: [sedusa, sterling] })).toBe("p1");
  });

  it("offers Stone to nobody when Sedusa wasn't drafted", () => {
    expect(heroSpecificTokenSide("stone", { p1: [boreas], p2: [cyrus] })).toBeNull();
  });

  it("offers Chill to Dazeem's enemies, whichever side he's on", () => {
    expect(heroSpecificTokenSide("chill", { p1: [boreas, dazeem], p2: [sterling] })).toBe("p2");
    expect(heroSpecificTokenSide("chill", { p1: [boreas], p2: [dazeem, sterling] })).toBe("p1");
  });

  it("offers Chill to nobody when Dazeem wasn't drafted", () => {
    expect(heroSpecificTokenSide("chill", { p1: [boreas], p2: [sedusa] })).toBeNull();
  });

  it("offers Favored Enemy to Boreas's enemies, whichever side he's on", () => {
    expect(heroSpecificTokenSide("favoredEnemy", { p1: [boreas, cyrus], p2: [sterling] })).toBe(
      "p2",
    );
    expect(heroSpecificTokenSide("favoredEnemy", { p1: [cyrus], p2: [boreas, sterling] })).toBe(
      "p1",
    );
  });

  it("offers Favored Enemy to nobody when Boreas wasn't drafted", () => {
    expect(heroSpecificTokenSide("favoredEnemy", { p1: [cyrus], p2: [sedusa] })).toBeNull();
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
