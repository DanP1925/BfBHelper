import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PlayerId } from "../../lib/draft/types";
import { LEVEL_FOUR_BURST_MS } from "../../lib/motion";
import { installFakeAnimations, type FakeAnimations } from "../../test/fakeAnimations";
import { stubMatchMedia } from "../../test/stubMatchMedia";
import { useLevelFourBurst } from "./useLevelFourBurst";

let fakes: FakeAnimations;

/** A card with a level <output>, like a Board HeroCard's. */
function Harness({ level, side }: { level: number; side?: PlayerId }) {
  const cardRef = useRef<HTMLDivElement>(null);
  useLevelFourBurst(cardRef, level, side);
  return (
    <div ref={cardRef} data-testid="card">
      <input defaultValue="8" aria-label="HP" />
      <output>{level}</output>
    </div>
  );
}

const onCard = () => fakes.animationsOn((element) => element.tagName === "DIV");
const onValue = () => fakes.animationsOn((element) => element.tagName === "OUTPUT");
const running = () => fakes.animations.filter((animation) => animation.state === "running");

beforeEach(() => {
  fakes = installFakeAnimations();
  stubMatchMedia(false);
});

afterEach(() => {
  fakes.restore();
  document.documentElement.style.removeProperty("--color-p1");
  document.documentElement.style.removeProperty("--color-p2");
});

describe("useLevelFourBurst (intent/26)", () => {
  it("plays once on 3 to 4: a ring on the card and a pop on the level value", () => {
    const { rerender } = render(<Harness level={3} side="p1" />);
    rerender(<Harness level={4} side="p1" />);
    expect(onCard()).toHaveLength(1);
    expect(onValue()).toHaveLength(1);
    expect(onCard()[0].options.duration).toBe(LEVEL_FOUR_BURST_MS);
    expect(onValue()[0].options.duration).toBe(LEVEL_FOUR_BURST_MS);
    // Nothing held after it ends: the card goes back to its normal look.
    expect(onCard()[0].options.fill).toBeUndefined();
  });

  it("plays nothing on mount, so a reload at level 4 shows no burst", () => {
    render(<Harness level={4} side="p1" />);
    expect(fakes.animations).toHaveLength(0);
  });

  it("plays nothing on the other level-ups", () => {
    const { rerender } = render(<Harness level={1} side="p1" />);
    rerender(<Harness level={2} side="p1" />);
    rerender(<Harness level={3} side="p1" />);
    expect(fakes.animations).toHaveLength(0);
  });

  it("cancels a running burst on 4 to 3, and plays nothing on the way down", () => {
    const { rerender } = render(<Harness level={3} side="p1" />);
    rerender(<Harness level={4} side="p1" />);
    rerender(<Harness level={3} side="p1" />);
    expect(fakes.animations).toHaveLength(2);
    expect(running()).toHaveLength(0);
  });

  it("plays again on 4 to 3 to 4", () => {
    const { rerender } = render(<Harness level={3} side="p1" />);
    rerender(<Harness level={4} side="p1" />);
    const first = [...fakes.animations];
    rerender(<Harness level={3} side="p1" />);
    rerender(<Harness level={4} side="p1" />);
    expect(onCard()).toHaveLength(2);
    expect(first.every((animation) => animation.state === "cancelled")).toBe(true);
    expect(running()).toHaveLength(2);
  });

  it("plays nothing with reduced motion on", () => {
    stubMatchMedia(true);
    const { rerender } = render(<Harness level={3} side="p1" />);
    rerender(<Harness level={4} side="p1" />);
    expect(fakes.animations).toHaveLength(0);
  });

  it("plays nothing without a side", () => {
    const { rerender } = render(<Harness level={3} />);
    rerender(<Harness level={4} />);
    expect(fakes.animations).toHaveLength(0);
  });

  it("uses the team's color", () => {
    document.documentElement.style.setProperty("--color-p2", "#c1665a");
    const { rerender } = render(<Harness level={3} side="p2" />);
    rerender(<Harness level={4} side="p2" />);
    const peak = onCard()[0].keyframes[1];
    expect(peak.outlineColor).toBe("#c1665a");
    expect(peak.offset).toBe(0.4);
  });

  it("cancels a running burst on unmount", () => {
    const { rerender, unmount } = render(<Harness level={3} side="p1" />);
    rerender(<Harness level={4} side="p1" />);
    unmount();
    expect(running()).toHaveLength(0);
  });
});
