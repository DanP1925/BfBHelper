import { describe, expect, it } from "vitest";
import { coinFlip } from "./coinFlip";

describe("coinFlip", () => {
  // Scenario 1: coin flip with injected rng: <0.5 -> p1, >=0.5 -> p2.
  it("returns p1 when rng() < 0.5", () => {
    expect(coinFlip(() => 0)).toBe("p1");
    expect(coinFlip(() => 0.4999)).toBe("p1");
  });

  it("returns p2 when rng() >= 0.5", () => {
    expect(coinFlip(() => 0.5)).toBe("p2");
    expect(coinFlip(() => 0.9999)).toBe("p2");
  });

  it("defaults to Math.random when no rng is injected", () => {
    const result = coinFlip();
    expect(["p1", "p2"]).toContain(result);
  });
});
