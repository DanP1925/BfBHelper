import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeAnimations, type FakeAnimations } from "../test/fakeAnimations";
import { stubMatchMedia } from "../test/stubMatchMedia";
import { useTransitionAnimation } from "./useTransitionAnimation";

let fakes: FakeAnimations;

/** Plays a one-keyframe animation whenever `value` goes up. */
function Harness({ value, enabled = true }: { value: number; enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useTransitionAnimation({
    elementRef: ref,
    value,
    enabled,
    // Fresh inline callbacks every render, as callers pass them.
    plays: (previous, next) => next > previous,
    play: (element) => [element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 100 })],
  });
  return <div ref={ref} />;
}

const running = () => fakes.animations.filter((animation) => animation.state === "running");

beforeEach(() => {
  fakes = installFakeAnimations();
  stubMatchMedia(false);
});

afterEach(() => fakes.restore());

describe("useTransitionAnimation (intents 26 and 27)", () => {
  it("plays on a change `plays` accepts, and never on mount", () => {
    const { rerender } = render(<Harness value={1} />);
    expect(fakes.animations).toHaveLength(0);
    rerender(<Harness value={2} />);
    expect(fakes.animations).toHaveLength(1);
    expect(running()).toHaveLength(1);
  });

  it("plays nothing on a change `plays` rejects", () => {
    const { rerender } = render(<Harness value={2} />);
    rerender(<Harness value={1} />);
    expect(fakes.animations).toHaveLength(0);
  });

  it("cancels the running animation on any later change", () => {
    const { rerender } = render(<Harness value={1} />);
    rerender(<Harness value={2} />);
    rerender(<Harness value={1} />);
    expect(fakes.animations).toHaveLength(1);
    expect(running()).toHaveLength(0);
  });

  it("cancels and plays again on a second accepted change", () => {
    const { rerender } = render(<Harness value={1} />);
    rerender(<Harness value={2} />);
    rerender(<Harness value={3} />);
    expect(fakes.animations.map((animation) => animation.state)).toEqual(["cancelled", "running"]);
  });

  it("doesn't replay on a re-render with the same value", () => {
    const { rerender } = render(<Harness value={1} />);
    rerender(<Harness value={2} />);
    rerender(<Harness value={2} />);
    expect(fakes.animations).toHaveLength(1);
    expect(running()).toHaveLength(1);
  });

  it("plays nothing when not enabled", () => {
    const { rerender } = render(<Harness value={1} enabled={false} />);
    rerender(<Harness value={2} enabled={false} />);
    expect(fakes.animations).toHaveLength(0);
  });

  it("plays nothing with reduced motion on", () => {
    stubMatchMedia(true);
    const { rerender } = render(<Harness value={1} />);
    rerender(<Harness value={2} />);
    expect(fakes.animations).toHaveLength(0);
  });

  it("reads reduced motion when an animation would start", () => {
    const matchMedia = vi.fn(() => ({ matches: false }));
    vi.stubGlobal("matchMedia", matchMedia);
    const { rerender } = render(<Harness value={1} />);
    expect(matchMedia).not.toHaveBeenCalled();
    rerender(<Harness value={2} />);
    expect(matchMedia).toHaveBeenCalled();
  });

  it("cancels the running animation on unmount", () => {
    const { rerender, unmount } = render(<Harness value={1} />);
    rerender(<Harness value={2} />);
    unmount();
    expect(running()).toHaveLength(0);
  });
});
