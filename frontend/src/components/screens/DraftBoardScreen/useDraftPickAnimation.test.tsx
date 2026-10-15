import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getHeroById, HERO_IDS } from "../../../data/heroes";
import type { Hero, HeroId, PlayerId } from "../../../lib/draft/types";
import { PICK_FADE_MS, POOL_GLIDE_MS, SLOT_REVEAL_MS } from "../../../lib/motion";
import { stubMatchMedia } from "../../../test/stubMatchMedia";
import { useDraftPickAnimation } from "./useDraftPickAnimation";

/** A recorded `element.animate` call, standing in for a real Animation. */
type FakeAnimation = {
  element: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  state: "running" | "finished" | "cancelled";
  onfinish: (() => void) | null;
  oncancel: (() => void) | null;
  cancel: () => void;
  finish: () => void;
};

let animations: FakeAnimation[] = [];
let frames: FrameRequestCallback[] = [];

const CARD_WIDTH = 100;

/** Lays pool cards out in a row, 100px apart, by their current DOM order,
 * so a card's rect changes when an earlier card is removed. */
function fakeRect(element: Element): DOMRect {
  const card = element.closest("[data-pool-hero]");
  if (card?.parentElement) {
    const index = Array.from(card.parentElement.children).indexOf(card);
    return new DOMRect(index * CARD_WIDTH, 0, CARD_WIDTH, 140);
  }
  return new DOMRect(0, 0, 0, 0);
}

function flushFrames() {
  const pending = frames;
  frames = [];
  for (const callback of pending) callback(0);
}

function animationsOn(predicate: (element: Element) => boolean) {
  return animations.filter((animation) => predicate(animation.element));
}

function poolCardAnimations(id: HeroId) {
  return animationsOn((element) => (element as HTMLElement).dataset.poolHero === id);
}

/** Lets a test call the hook's latest `beforePick` from outside. */
type HookApi = {
  beforePick: (heroId: HeroId) => void;
  expose: (beforePick: (heroId: HeroId) => void) => void;
};

function makeApi(): HookApi {
  const api: HookApi = {
    beforePick: () => {},
    expose: (beforePick) => {
      api.beforePick = beforePick;
    },
  };
  return api;
}

function Harness({
  pool,
  slots,
  currentTurnPlayer,
  api,
}: {
  pool: Hero[];
  slots: HeroId[];
  currentTurnPlayer: PlayerId | null;
  api: HookApi;
}) {
  const { rootRef, beforePick } = useDraftPickAnimation({ pool, currentTurnPlayer });
  api.expose(beforePick);
  return (
    <div ref={rootRef}>
      <div>
        {pool.map((hero) => (
          <button key={hero.id} type="button" data-pool-hero={hero.id}>
            {/* eslint-disable-next-line @next/next/no-img-element -- test fixture */}
            <img src={hero.portrait} alt="" />
          </button>
        ))}
      </div>
      {slots.map((id) => (
        <div key={id} data-slot-hero={id} />
      ))}
    </div>
  );
}

const [a, b, c, d] = HERO_IDS.slice(0, 4).map(getHeroById);

/** Renders the pool [a, b, c, d], taps `picked`, then commits the pick the
 * way the draft does: the hero leaves the pool and lands in a slot. */
function pick(
  picked: Hero,
  { side = "p1", reduceMotion = false }: { side?: PlayerId | null; reduceMotion?: boolean } = {},
) {
  stubMatchMedia(reduceMotion);
  const api = makeApi();
  const pool = [a, b, c, d];
  const view = render(<Harness pool={pool} slots={[]} currentTurnPlayer={side} api={api} />);
  api.beforePick(picked.id);
  view.rerender(
    <Harness
      pool={pool.filter((hero) => hero.id !== picked.id)}
      slots={[picked.id]}
      currentTurnPlayer={side}
      api={api}
    />,
  );
  return { view, api };
}

describe("useDraftPickAnimation", () => {
  const originalAnimate = Element.prototype.animate;
  const originalGetAnimations = Element.prototype.getAnimations;
  const originalRect = Element.prototype.getBoundingClientRect;

  beforeEach(() => {
    animations = [];
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    document.documentElement.style.setProperty("--color-p1", "#c1665a");
    document.documentElement.style.setProperty("--color-p2", "#4f9aa0");

    Element.prototype.getBoundingClientRect = function (this: Element) {
      return fakeRect(this);
    };
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Element.prototype.animate = originalAnimate;
    Element.prototype.getAnimations = originalGetAnimations;
    Element.prototype.getBoundingClientRect = originalRect;
    document.documentElement.style.removeProperty("--color-p1");
    document.documentElement.style.removeProperty("--color-p2");
    document.querySelectorAll("body > img").forEach((img) => img.remove());
  });

  it("waits a frame after the pick, then glides every card after the picked one", () => {
    pick(b);
    expect(animations).toHaveLength(0);

    flushFrames();

    expect(poolCardAnimations(a.id)).toHaveLength(0);
    for (const hero of [c, d]) {
      const [glide] = poolCardAnimations(hero.id);
      // Each moved one slot left, so it plays back from 100px to the right,
      // scaling from its corner.
      expect(glide.keyframes[0]).toMatchObject({
        transform: "translate(100px, 0px) scale(1)",
        transformOrigin: "0 0",
      });
      expect(glide.keyframes[1].transform).toBe("none");
      expect(glide.options).toMatchObject({
        duration: POOL_GLIDE_MS,
        delay: PICK_FADE_MS,
        fill: "backwards",
      });
    }
  });

  it("fades the slot in with a flash in the picking team's color", () => {
    pick(b, { side: "p2" });
    flushFrames();

    const [reveal] = animationsOn((element) => element.hasAttribute("data-slot-hero"));
    expect(reveal.keyframes[0].opacity).toBe(0);
    expect(reveal.keyframes[1].outlineColor).toBe("#4f9aa0");
    expect(reveal.keyframes[1].outlineOffset).toBe("-3px");
    expect(reveal.keyframes[1].boxShadow).toContain("#4f9aa0");
    expect(reveal.keyframes[2].opacity).toBe(1);
    expect(reveal.options).toMatchObject({
      duration: SLOT_REVEAL_MS,
      delay: PICK_FADE_MS,
      fill: "backwards",
    });
  });

  it("fades out a stand-in for the picked card, then removes it", () => {
    pick(b);
    flushFrames();

    const standIn = document.body.querySelector<HTMLImageElement>(":scope > img");
    expect(standIn).not.toBeNull();
    expect(standIn!.src).toMatch(new RegExp(`${b.portrait}$`));
    expect(standIn!.style.position).toBe("fixed");
    expect(standIn!.style.pointerEvents).toBe("none");

    const [fade] = animationsOn((element) => element === standIn);
    expect(fade.options).toMatchObject({ duration: PICK_FADE_MS });
    fade.finish();
    expect(standIn!.isConnected).toBe(false);
  });

  it("does nothing when the OS asks for reduced motion", () => {
    pick(b, { reduceMotion: true });
    flushFrames();
    expect(animations).toHaveLength(0);
    expect(document.body.querySelector(":scope > img")).toBeNull();
  });

  it("does nothing once the draft is done", () => {
    pick(b, { side: null });
    flushFrames();
    expect(animations).toHaveLength(0);
  });

  it("restarts a card's glide when the next pick lands mid-glide", () => {
    const { view, api } = pick(a);
    flushFrames();
    const [firstGlide] = poolCardAnimations(d.id);

    api.beforePick(b.id);
    view.rerender(<Harness pool={[c, d]} slots={[a.id, b.id]} currentTurnPlayer="p1" api={api} />);
    flushFrames();

    expect(firstGlide.state).toBe("cancelled");
    expect(poolCardAnimations(d.id).filter((glide) => glide.state === "running")).toHaveLength(1);
  });

  it("cancels its animations and removes stand-ins on unmount", () => {
    const { view } = pick(b);
    flushFrames();
    expect(document.body.querySelector(":scope > img")).not.toBeNull();

    view.unmount();

    expect(animations.every((animation) => animation.state !== "running")).toBe(true);
    expect(document.body.querySelector(":scope > img")).toBeNull();
  });
});
