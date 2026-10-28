import { describe, expect, it } from "vitest";
import { getHeroById, HERO_ROSTER } from "../../data/heroes";
import { countRemainingByRole, filterPoolByRole, ROLE_FILTER_OPTIONS } from "./roles";

describe("ROLE_FILTER_OPTIONS", () => {
  it("lists All, Damage, Utility and Support in that order", () => {
    expect(ROLE_FILTER_OPTIONS.map((option) => option.label)).toEqual([
      "All",
      "Damage",
      "Utility",
      "Support",
    ]);
  });
});

describe("countRemainingByRole", () => {
  it("counts the full roster as 8 Damage, 8 Utility and 3 Support (intent/23)", () => {
    expect(countRemainingByRole(HERO_ROSTER)).toEqual({
      all: 19,
      damage: 8,
      utility: 8,
      support: 3,
    });
  });

  it("counts only the heroes left in the pool", () => {
    const pool = HERO_ROSTER.filter((hero) => hero.id !== "caligar" && hero.id !== "sterling");
    expect(countRemainingByRole(pool)).toEqual({ all: 17, damage: 7, utility: 8, support: 2 });
  });

  it("counts an empty pool as zero everywhere", () => {
    expect(countRemainingByRole([])).toEqual({ all: 0, damage: 0, utility: 0, support: 0 });
  });
});

describe("filterPoolByRole", () => {
  it("returns only that role's heroes, keeping the pool's order", () => {
    expect(filterPoolByRole(HERO_ROSTER, "support").map((hero) => hero.id)).toEqual([
      "baldwin",
      "caligar",
      "cyrus",
    ]);
  });

  it("returns the pool as is for all", () => {
    expect(filterPoolByRole(HERO_ROSTER, "all")).toBe(HERO_ROSTER);
  });

  it("returns nothing when no hero of that role is left", () => {
    const pool = [getHeroById("felix"), getHeroById("motley")];
    expect(filterPoolByRole(pool, "support")).toEqual([]);
  });
});
