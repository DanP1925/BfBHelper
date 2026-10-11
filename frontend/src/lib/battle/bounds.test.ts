import { describe, expect, it } from "vitest";
import { clamp, clampGold, clampGoldPile, clampHeroHp, clampHeroLevel, clampStructureHp } from "./bounds";
import { HERO_HP_CEILING, HERO_MAX_LEVEL, HERO_STARTING_LEVEL } from "./constants";
import { GOLD_PILE_STARTING_COUNT } from "../map/constants";

describe("clamp", () => {
  it.each([
    [-5, 0, 10, 0],
    [0, 0, 10, 0],
    [5, 0, 10, 5],
    [10, 0, 10, 10],
    [15, 0, 10, 10],
  ])("clamp(%d, %d, %d) -> %d", (value, min, max, expected) => {
    expect(clamp(value, min, max)).toBe(expected);
  });

  it("falls back to min on non-finite input", () => {
    expect(clamp(Number.NaN, 2, 10)).toBe(2);
    expect(clamp(Number.POSITIVE_INFINITY, 2, 10)).toBe(10);
  });
});

describe("clampGold", () => {
  it("floors at 0", () => {
    expect(clampGold(-3)).toBe(0);
  });

  it("has no ceiling", () => {
    expect(clampGold(999_999)).toBe(999_999);
  });

  it("NaN falls back to the floor", () => {
    expect(clampGold(Number.NaN)).toBe(0);
  });
});

describe("clampHeroHp", () => {
  it.each([
    [-1, 0],
    [0, 0],
    [10, 10],
    [HERO_HP_CEILING, HERO_HP_CEILING],
    [HERO_HP_CEILING + 1, HERO_HP_CEILING],
    [99, HERO_HP_CEILING],
  ])("clampHeroHp(%d) -> %d", (value, expected) => {
    expect(clampHeroHp(value)).toBe(expected);
  });
});

describe("clampHeroLevel", () => {
  it.each([
    [0, HERO_STARTING_LEVEL],
    [HERO_STARTING_LEVEL, HERO_STARTING_LEVEL],
    [2, 2],
    [HERO_MAX_LEVEL, HERO_MAX_LEVEL],
    [HERO_MAX_LEVEL + 1, HERO_MAX_LEVEL],
  ])("clampHeroLevel(%d) -> %d", (value, expected) => {
    expect(clampHeroLevel(value)).toBe(expected);
  });
});

describe("clampStructureHp", () => {
  it("clamps to the given ceiling, per-structure", () => {
    expect(clampStructureHp(-1, 11)).toBe(0);
    expect(clampStructureHp(5, 11)).toBe(5);
    expect(clampStructureHp(11, 11)).toBe(11);
    expect(clampStructureHp(99, 11)).toBe(11);
    expect(clampStructureHp(99, 16)).toBe(16);
  });
});

describe("clampGoldPile", () => {
  it.each([
    [-1, 0],
    [0, 0],
    [2, 2],
    [GOLD_PILE_STARTING_COUNT, GOLD_PILE_STARTING_COUNT],
    [GOLD_PILE_STARTING_COUNT + 1, GOLD_PILE_STARTING_COUNT],
  ])("clampGoldPile(%d) -> %d", (value, expected) => {
    expect(clampGoldPile(value)).toBe(expected);
  });

  it("NaN falls back to the floor", () => {
    expect(clampGoldPile(Number.NaN)).toBe(0);
  });
});
