import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installFakeAnimations, type FakeAnimations } from "../test/fakeAnimations";
import { stubMatchMedia } from "../test/stubMatchMedia";
import { HERO_DEFEAT_MS, STRUCTURE_DEFEAT_MS } from "./motion";
import {
  DEFEATED_FILTER,
  filterOf,
  HERO_DEFEAT_KEYFRAMES,
  STRUCTURE_DEFEAT_KEYFRAMES,
  useDefeatAnimation,
} from "./useDefeatAnimation";

let fakes: FakeAnimations;

function Harness({
  hp,
  kind = "hero",
  enabled = true,
}: {
  hp: number;
  kind?: "hero" | "structure";
  enabled?: boolean;
}) {
  const ref = useRef<HTMLImageElement>(null);
  useDefeatAnimation(ref, hp, enabled, kind);
  // eslint-disable-next-line @next/next/no-img-element -- a bare test image, like the app's portrait
  return <img ref={ref} alt="" />;
}

const running = () => fakes.animations.filter((animation) => animation.state === "running");

beforeEach(() => {
  fakes = installFakeAnimations();
  stubMatchMedia(false);
});

afterEach(() => fakes.restore());

describe("useDefeatAnimation (intent/27)", () => {
  it("plays once when HP goes from above 0 to 0", () => {
    const { rerender } = render(<Harness hp={1} />);
    rerender(<Harness hp={0} />);
    expect(fakes.animations).toHaveLength(1);
    expect(fakes.animations[0].element.tagName).toBe("IMG");
    // Nothing held after it ends: the CSS class keeps the gray look.
    expect(fakes.animations[0].options.fill).toBeUndefined();
  });

  it("plays nothing on mount at 0, so a reload shows the gray look with no replay", () => {
    render(<Harness hp={0} />);
    expect(fakes.animations).toHaveLength(0);
  });

  it("plays nothing on other HP changes", () => {
    const { rerender } = render(<Harness hp={3} />);
    rerender(<Harness hp={2} />);
    rerender(<Harness hp={5} />);
    expect(fakes.animations).toHaveLength(0);
  });

  it("cancels when HP goes back above 0, with no reverse animation", () => {
    const { rerender } = render(<Harness hp={1} />);
    rerender(<Harness hp={0} />);
    rerender(<Harness hp={3} />);
    expect(fakes.animations).toHaveLength(1);
    expect(running()).toHaveLength(0);
  });

  it("plays again on a second defeat", () => {
    const { rerender } = render(<Harness hp={1} />);
    rerender(<Harness hp={0} />);
    rerender(<Harness hp={1} />);
    rerender(<Harness hp={0} />);
    expect(fakes.animations.map((animation) => animation.state)).toEqual(["cancelled", "running"]);
  });

  it("plays nothing when not enabled, or with reduced motion on", () => {
    const { rerender } = render(<Harness hp={1} enabled={false} />);
    rerender(<Harness hp={0} enabled={false} />);
    stubMatchMedia(true);
    const second = render(<Harness hp={1} />);
    second.rerender(<Harness hp={0} />);
    expect(fakes.animations).toHaveLength(0);
  });

  it("plays the hero's hit or the structure's collapse, by kind", () => {
    const hero = render(<Harness hp={1} kind="hero" />);
    hero.rerender(<Harness hp={0} kind="hero" />);
    const structure = render(<Harness hp={1} kind="structure" />);
    structure.rerender(<Harness hp={0} kind="structure" />);
    const [hit, collapse] = fakes.animations;
    expect(hit.keyframes).toBe(HERO_DEFEAT_KEYFRAMES);
    expect(hit.options.duration).toBe(HERO_DEFEAT_MS);
    expect(collapse.keyframes).toBe(STRUCTURE_DEFEAT_KEYFRAMES);
    expect(collapse.options.duration).toBe(STRUCTURE_DEFEAT_MS);
  });

  it("ends both motions on the gray look, with no transform left", () => {
    for (const keyframes of [HERO_DEFEAT_KEYFRAMES, STRUCTURE_DEFEAT_KEYFRAMES]) {
      const last = keyframes[keyframes.length - 1];
      // The class's filter, plus the other functions at their identity.
      expect(last.filter).toBe(`${DEFEATED_FILTER} sepia(0) hue-rotate(0deg) saturate(1)`);
      expect(last.transform).toBe("none");
    }
  });

  it("lists the same filter functions in every keyframe, so the gray fades in", () => {
    const functions = (filter: unknown) => String(filter).match(/[a-z-]+(?=\()/g);
    for (const keyframes of [HERO_DEFEAT_KEYFRAMES, STRUCTURE_DEFEAT_KEYFRAMES]) {
      const lists = keyframes.filter((frame) => frame.filter).map((f) => functions(f.filter));
      for (const list of lists) expect(list).toEqual(functions(filterOf({})));
    }
  });
});
