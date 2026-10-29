import { render } from "@testing-library/react";
import type { CSSProperties } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getHeroById, HERO_IDS } from "../../../data/heroes";
import type { Hero, HeroId, PlayerId } from "../../../lib/draft/types";
import { PICK_FADE_MS, POOL_GLIDE_MS, SLOT_REVEAL_MS } from "../../../lib/motion";
import {
  installFakeAnimations,
  type FakeAnimation,
  type FakeAnimations,
} from "../../../test/fakeAnimations";
import { stubMatchMedia } from "../../../test/stubMatchMedia";
import { useDraftPickAnimation } from "./useDraftPickAnimation";

let fakes: FakeAnimations;
let animations: FakeAnimation[] = [];

const CARD_WIDTH = 100;

const THEMED_TEAM_COLORS = {
  "--color-p1": "#56aab1",
  "--color-p2": "#d4705f",
} as CSSProperties;

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
  fakes.flushFrames();
}

function animationsOn(predicate: (element: Element) => boolean) {
  return fakes.animationsOn(predicate);
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
  onFinalPickLanded,
}: {
  pool: Hero[];
  slots: HeroId[];
  currentTurnPlayer: PlayerId | null;
  api: HookApi;
  onFinalPickLanded?: () => void;
}) {
  const { rootRef, beforePick } = useDraftPickAnimation({
    pool,
    currentTurnPlayer,
    onFinalPickLanded,
  });
  api.expose(beforePick);
  return (
    // The themed team colors on the root, as the Draft's data-theme root
    // has them (intent/29); the document keeps the unthemed ones.
    <div ref={rootRef} style={THEMED_TEAM_COLORS}>
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
 * way the draft does: the hero leaves the pool and lands in a slot. Like
 * the page, `onFinalPickLanded` is only passed from that commit on, as if
 * it were the draft's final pick. */
function pick(
  picked: Hero,
  {
    side = "p1",
    reduceMotion = false,
    onFinalPickLanded,
  }: {
    side?: PlayerId | null;
    reduceMotion?: boolean;
    onFinalPickLanded?: () => void;
  } = {},
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
      onFinalPickLanded={onFinalPickLanded}
    />,
  );
  return { view, api };
}

function slotReveal() {
  const [reveal] = animationsOn((element) => element.hasAttribute("data-slot-hero"));
  return reveal;
}

describe("useDraftPickAnimation", () => {
  const originalRect = Element.prototype.getBoundingClientRect;

  beforeEach(() => {
    fakes = installFakeAnimations();
    animations = fakes.animations;
    document.documentElement.style.setProperty("--color-p1", "#4f9aa0");
    document.documentElement.style.setProperty("--color-p2", "#c1665a");
    Element.prototype.getBoundingClientRect = function (this: Element) {
      return fakeRect(this);
    };
  });

  afterEach(() => {
    fakes.restore();
    Element.prototype.getBoundingClientRect = originalRect;
    document.documentElement.style.removeProperty("--color-p1");
    document.documentElement.style.removeProperty("--color-p2");
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

  it("fades the whole pool in, without gliding, when the pick brings filtered-out cards back (intent/23)", () => {
    stubMatchMedia(false);
    const api = makeApi();
    // The role filter shows only [a, b]; picking a passes the turn, and the
    // filter going back to All brings c and d, never drawn at the tap.
    const view = render(<Harness pool={[a, b]} slots={[]} currentTurnPlayer="p1" api={api} />);
    api.beforePick(a.id);
    view.rerender(<Harness pool={[b, c, d]} slots={[a.id]} currentTurnPlayer="p1" api={api} />);
    flushFrames();

    for (const hero of [b, c, d]) {
      const [fade] = poolCardAnimations(hero.id);
      expect(fade.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
      expect(fade.options).toMatchObject({
        duration: POOL_GLIDE_MS,
        delay: PICK_FADE_MS,
        fill: "backwards",
      });
    }
    expect(slotReveal()).toBeDefined();
  });

  it("fades the slot in with a flash in the picking team's themed color", () => {
    pick(b, { side: "p2" });
    flushFrames();

    const [reveal] = animationsOn((element) => element.hasAttribute("data-slot-hero"));
    expect(reveal.keyframes[0].opacity).toBe(0);
    // The root's themed Player 2 red, not the document's unthemed one.
    expect(reveal.keyframes[1].outlineColor).toBe("#d4705f");
    expect(reveal.keyframes[1].outlineOffset).toBe("-3px");
    expect(reveal.keyframes[1].boxShadow).toContain("#d4705f");
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

  describe("onFinalPickLanded", () => {
    it("fires once, after the final pick's slot reveal finishes", () => {
      const onFinalPickLanded = vi.fn();
      pick(b, { onFinalPickLanded });
      expect(onFinalPickLanded).not.toHaveBeenCalled();

      flushFrames();
      expect(onFinalPickLanded).not.toHaveBeenCalled();

      // The glide and fade ending first changes nothing: only the reveal counts.
      for (const animation of animations.filter((a) => a !== slotReveal())) animation.finish();
      expect(onFinalPickLanded).not.toHaveBeenCalled();

      slotReveal().finish();
      expect(onFinalPickLanded).toHaveBeenCalledTimes(1);
    });

    it("fires right away when no reveal plays", () => {
      const onFinalPickLanded = vi.fn();
      pick(b, { reduceMotion: true, onFinalPickLanded });
      expect(onFinalPickLanded).toHaveBeenCalledTimes(1);
    });

    it("doesn't fire when the board unmounts mid-reveal", () => {
      const onFinalPickLanded = vi.fn();
      const { view } = pick(b, { onFinalPickLanded });
      flushFrames();
      view.unmount();
      expect(slotReveal().state).toBe("cancelled");
      expect(onFinalPickLanded).not.toHaveBeenCalled();
    });
  });
});
