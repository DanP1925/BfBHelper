import { vi } from "vitest";

/** A recorded `element.animate` call, standing in for a real Animation. */
export type FakeAnimation = {
  element: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  state: "running" | "finished" | "cancelled";
  onfinish: (() => void) | null;
  oncancel: (() => void) | null;
  cancel: () => void;
  finish: () => void;
};

export type FakeAnimations = {
  /** Every `animate` call so far, in order. */
  animations: FakeAnimation[];
  /** The recorded animations on elements matching `predicate`. */
  animationsOn: (predicate: (element: Element) => boolean) => FakeAnimation[];
  /** Runs every queued `requestAnimationFrame` callback. */
  flushFrames: () => void;
  /** Puts the real APIs back and removes leftover fade-out stand-ins. */
  restore: () => void;
};

/**
 * Stands in for the Web Animations API (absent in jsdom) and queues
 * `requestAnimationFrame` callbacks until `flushFrames`. Animations never
 * end by themselves: a test calls `finish()` or `cancel()` on them.
 */
export function installFakeAnimations(): FakeAnimations {
  const animations: FakeAnimation[] = [];
  let frames: FrameRequestCallback[] = [];
  const originalAnimate = Element.prototype.animate;
  const originalGetAnimations = Element.prototype.getAnimations;

  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  Element.prototype.animate = function (
    this: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions,
  ) {
    const animation: FakeAnimation = {
      element: this,
      keyframes: keyframes as Keyframe[],
      options: options as KeyframeAnimationOptions,
      state: "running",
      onfinish: null,
      oncancel: null,
      cancel() {
        if (animation.state !== "running") return;
        animation.state = "cancelled";
        animation.oncancel?.();
      },
      finish() {
        animation.state = "finished";
        animation.onfinish?.();
      },
    };
    animations.push(animation);
    return animation as unknown as Animation;
  };
  Element.prototype.getAnimations = function (this: Element) {
    return animations.filter(
      (animation) => animation.element === this && animation.state === "running",
    ) as unknown as Animation[];
  };

  return {
    animations,
    animationsOn: (predicate) => animations.filter((animation) => predicate(animation.element)),
    flushFrames: () => {
      const pending = frames;
      frames = [];
      for (const callback of pending) callback(0);
    },
    restore: () => {
      vi.unstubAllGlobals();
      Element.prototype.animate = originalAnimate;
      Element.prototype.getAnimations = originalGetAnimations;
      document.querySelectorAll("body > img").forEach((img) => img.remove());
    },
  };
}
