import { describe, expect, it } from "vitest";
import { fanOffset } from "./fanOut";

const TOKEN_FOOTPRINT_PX = 68;
const RADIUS_SCALE = 0.5;

function radiusOf(index: number, total: number): number {
  const { dx, dy } = fanOffset(index, total);
  return Math.hypot(dx, dy);
}

function chordBetween(total: number): number {
  const a = fanOffset(0, total);
  const b = fanOffset(1, total);
  return Math.hypot(a.dx - b.dx, a.dy - b.dy);
}

describe("fanOffset", () => {
  it("is the origin for a single token (no sharing)", () => {
    expect(fanOffset(0, 1)).toEqual({ dx: 0, dy: 0 });
  });

  it("spreads 2 tokens to opposite sides of the node", () => {
    const a = fanOffset(0, 2);
    const b = fanOffset(1, 2);
    expect(a.dx).toBeCloseTo(-b.dx, 5);
    expect(a.dy).toBeCloseTo(-b.dy, 5);
    expect(a.dx !== 0 || a.dy !== 0).toBe(true);
  });

  it("keeps every group at the same, deliberately-tightened inter-token spacing", () => {
    // RADIUS_SCALE trades the full footprint-clearance guarantee (no
    // overlap at any size) for a visibly tighter cluster at the group
    // sizes that actually come up, per the user's call after seeing an
    // 8-hero team fight read as too spread out — a big pileup overlapping
    // is acceptable (same bar as "overlap is fine at full zoom, not at a
    // single zoom level"). The chord is still constant across every group
    // size, just scaled down from the full footprint.
    for (const total of [2, 3, 4, 5, 6, 8, 12]) {
      expect(chordBetween(total)).toBeCloseTo(TOKEN_FOOTPRINT_PX * 1.03 * RADIUS_SCALE, 5);
    }
  });

  it("grows the radius as the group gets bigger, so a bigger pileup doesn't collapse to a point", () => {
    expect(radiusOf(0, 3)).toBeGreaterThan(radiusOf(0, 2));
    expect(radiusOf(0, 6)).toBeGreaterThan(radiusOf(0, 4));
    expect(radiusOf(0, 8)).toBeGreaterThan(radiusOf(0, 6));
  });

  it("every token in a group sits at the same radius from the node's center", () => {
    const total = 5;
    const radii = Array.from({ length: total }, (_, index) => radiusOf(index, total));
    for (const radius of radii) {
      expect(radius).toBeCloseTo(radii[0], 5);
    }
  });
});
