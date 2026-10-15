import { afterEach, describe, expect, it, vi } from "vitest";
import { motionAllowed } from "./motion";

function stubMatchMedia(reduce: boolean) {
  const matchMedia = vi.fn((query: string) => ({
    matches: reduce && query === "(prefers-reduced-motion: reduce)",
  }));
  vi.stubGlobal("matchMedia", matchMedia);
  return matchMedia;
}

describe("motionAllowed", () => {
  const originalAnimate = Element.prototype.animate;

  afterEach(() => {
    vi.unstubAllGlobals();
    Element.prototype.animate = originalAnimate;
  });

  it("is false without matchMedia (jsdom's default)", () => {
    Element.prototype.animate = vi.fn();
    expect(motionAllowed()).toBe(false);
  });

  it("is false without element.animate", () => {
    stubMatchMedia(false);
    // @ts-expect-error -- simulating a browser without the Web Animations API
    Element.prototype.animate = undefined;
    expect(motionAllowed()).toBe(false);
  });

  it("is false when the OS asks for reduced motion", () => {
    stubMatchMedia(true);
    Element.prototype.animate = vi.fn();
    expect(motionAllowed()).toBe(false);
  });

  it("is true when animation is supported and motion isn't reduced", () => {
    stubMatchMedia(false);
    Element.prototype.animate = vi.fn();
    expect(motionAllowed()).toBe(true);
  });

  it("re-reads the setting on every call", () => {
    Element.prototype.animate = vi.fn();
    stubMatchMedia(false);
    expect(motionAllowed()).toBe(true);
    stubMatchMedia(true);
    expect(motionAllowed()).toBe(false);
  });
});
