"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { Hero, HeroId, PlayerId } from "../../../lib/draft/types";
import { motionAllowed, PICK_FADE_MS, POOL_GLIDE_MS, SLOT_REVEAL_MS } from "../../../lib/motion";

type PendingPick = {
  heroId: HeroId;
  side: PlayerId;
  /** Where every pool card was drawn at the tap, running transforms included. */
  rects: Map<string, DOMRect>;
  /** The tapped card's art and where it was drawn, for its fade-out stand-in. */
  fadeImage: { src: string; rect: DOMRect } | null;
};

type UseDraftPickAnimationOptions = {
  pool: Hero[];
  /** null once the draft is done. */
  currentTurnPlayer: PlayerId | null;
};

type UseDraftPickAnimationResult = {
  rootRef: RefObject<HTMLDivElement | null>;
  /** Call from the pool's click handler, before dispatching the pick. */
  beforePick: (heroId: HeroId) => void;
};

/**
 * Animates a draft pick (intent/10): the picked card fades out where it
 * was, then the rest of the pool glides into the gap (FLIP: snapshot rects
 * at the tap, measure the new layout, play each card back from its old
 * spot) while the hero's team slot fades in with a flash in the team's
 * color. Purely presentational: the pick itself is already committed, and
 * nothing here blocks a tap. Glides move the real cards with transforms,
 * which are hit-tested, so a tap mid-glide lands on the card drawn there.
 *
 * Does nothing when `motionAllowed()` is false (reduced motion, or jsdom).
 */
export function useDraftPickAnimation({
  pool,
  currentTurnPlayer,
}: UseDraftPickAnimationOptions): UseDraftPickAnimationResult {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef<PendingPick | null>(null);
  const framesRef = useRef(new Set<number>());
  const animationsRef = useRef(new Set<Animation>());
  const standInsRef = useRef(new Set<HTMLElement>());

  const beforePick = useCallback(
    (heroId: HeroId) => {
      const root = rootRef.current;
      // Once the draft is done the reducer ignores picks, so there's
      // nothing to animate. Before that, every pick the pool offers commits.
      if (!root || currentTurnPlayer === null || !motionAllowed()) return;

      const rects = new Map<string, DOMRect>();
      let fadeImage: PendingPick["fadeImage"] = null;
      for (const card of root.querySelectorAll<HTMLElement>("[data-pool-hero]")) {
        const id = card.dataset.poolHero;
        if (!id) continue;
        rects.set(id, card.getBoundingClientRect());
        if (id === heroId) {
          const image = card.querySelector("img");
          if (image) {
            fadeImage = {
              src: image.currentSrc || image.src,
              rect: image.getBoundingClientRect(),
            };
          }
        }
      }
      pendingRef.current = { heroId, side: currentTurnPlayer, rects, fadeImage };
    },
    [currentTurnPlayer],
  );

  const track = useCallback((animation: Animation, onDone?: () => void) => {
    animationsRef.current.add(animation);
    const done = () => {
      animationsRef.current.delete(animation);
      onDone?.();
    };
    animation.onfinish = done;
    animation.oncancel = done;
  }, []);

  const play = useCallback(
    (pending: PendingPick) => {
      const root = rootRef.current;
      if (!root) return;

      // 1. Fade-out. The tapped card is already gone from the DOM, so a
      // fixed-position copy of its art fades out where it was drawn.
      if (pending.fadeImage) {
        const { src, rect } = pending.fadeImage;
        const standIn = document.createElement("img");
        standIn.src = src;
        standIn.alt = "";
        standIn.setAttribute("aria-hidden", "true");
        Object.assign(standIn.style, {
          position: "fixed",
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          margin: "0",
          objectFit: "cover",
          borderRadius: "6px",
          pointerEvents: "none",
          zIndex: "100",
        });
        document.body.appendChild(standIn);
        standInsRef.current.add(standIn);
        track(
          standIn.animate(
            [
              { opacity: 1, transform: "scale(1)" },
              { opacity: 0, transform: "scale(0.92)" },
            ],
            { duration: PICK_FADE_MS, easing: "ease-in", fill: "forwards" },
          ),
          () => {
            standIn.remove();
            standInsRef.current.delete(standIn);
          },
        );
      }

      // 2. Glide. `fill: "backwards"` holds each card at its old spot while
      // the picked card fades, then plays it into its new one.
      for (const card of root.querySelectorAll<HTMLElement>("[data-pool-hero]")) {
        const before = card.dataset.poolHero ? pending.rects.get(card.dataset.poolHero) : undefined;
        if (!before) continue;
        // Cancelling a previous pick's glide first, so the new rect is the
        // card's real layout spot and `before` is where it was drawn.
        for (const running of card.getAnimations()) running.cancel();
        const after = card.getBoundingClientRect();
        if (after.width === 0) continue;
        const dx = before.left - after.left;
        const dy = before.top - after.top;
        const scale = before.width / after.width;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(scale - 1) < 0.001) continue;
        track(
          card.animate(
            [{ transform: `translate(${dx}px, ${dy}px) scale(${scale})` }, { transform: "none" }],
            {
              duration: POOL_GLIDE_MS,
              delay: PICK_FADE_MS,
              easing: "ease-out",
              fill: "backwards",
            },
          ),
        );
      }

      // 3. Slot reveal, flashing the picking team's color. The animation is
      // the only thing keeping the slot invisible, so cancelling it always
      // leaves the slot showing.
      const slot = Array.from(root.querySelectorAll<HTMLElement>("[data-slot-hero]")).find(
        (element) => element.dataset.slotHero === pending.heroId,
      );
      if (slot) {
        const color =
          getComputedStyle(document.documentElement)
            .getPropertyValue(`--color-${pending.side}`)
            .trim() || "currentColor";
        // The ring is an outline drawn just inside the card: TeamPanel's
        // slot list clips anything outside it, which would cut a box-shadow
        // ring off on a slot touching the panel's edge. Only the soft glow
        // spills outside, where being clipped doesn't matter.
        const ring = { outlineStyle: "solid", outlineWidth: "3px", outlineOffset: "-3px" };
        const off = { ...ring, outlineColor: "transparent", boxShadow: "0 0 0 0 transparent" };
        track(
          slot.animate(
            // Easing per segment, not on the whole effect, so the flash
            // peaks at exactly 40% of the reveal.
            [
              { ...off, opacity: 0, easing: "ease-out" },
              {
                ...ring,
                outlineColor: color,
                boxShadow: `0 0 18px 4px ${color}`,
                opacity: 1,
                offset: 0.4,
                easing: "ease-in-out",
              },
              { ...off, opacity: 1 },
            ],
            { duration: SLOT_REVEAL_MS, delay: PICK_FADE_MS, fill: "backwards" },
          ),
        );
      }
    },
    [track],
  );

  // After a pick commits. HeroPool's useFitGrid re-renders once more in its
  // own layout effect, so wait a frame for the final grid before measuring;
  // the frame still runs before the new layout is painted.
  useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (pending === null) return;
    pendingRef.current = null;
    if (pool.some((hero) => hero.id === pending.heroId)) return;

    const frame = requestAnimationFrame(() => {
      framesRef.current.delete(frame);
      play(pending);
    });
    framesRef.current.add(frame);
  }, [pool, play]);

  useEffect(() => {
    const frames = framesRef.current;
    const animations = animationsRef.current;
    const standIns = standInsRef.current;
    return () => {
      for (const frame of frames) cancelAnimationFrame(frame);
      frames.clear();
      for (const animation of Array.from(animations)) animation.cancel();
      animations.clear();
      for (const standIn of standIns) standIn.remove();
      standIns.clear();
    };
  }, []);

  return { rootRef, beforePick };
}
