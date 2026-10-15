"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
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

/** What a pick's animations leave behind, so unmount can clean it all up. */
type Running = {
  animations: Set<Animation>;
  standIns: Set<HTMLElement>;
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

function track(running: Running, animation: Animation, onDone?: () => void) {
  running.animations.add(animation);
  const done = () => {
    running.animations.delete(animation);
    onDone?.();
  };
  animation.onfinish = done;
  animation.oncancel = done;
}

/** The tapped card is already gone from the DOM, so a fixed-position copy
 * of its art fades out where it was drawn. */
function fadeOut(running: Running, { src, rect }: NonNullable<PendingPick["fadeImage"]>) {
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
  running.standIns.add(standIn);
  track(
    running,
    standIn.animate(
      [
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0, transform: "scale(0.92)" },
      ],
      { duration: PICK_FADE_MS, easing: "ease-in", fill: "forwards" },
    ),
    () => {
      standIn.remove();
      running.standIns.delete(standIn);
    },
  );
}

/** FLIP: each card plays back from where it was drawn at the tap to its new
 * spot. `fill: "backwards"` holds it at the old spot while the picked card
 * fades. Cancels, reads and animations run as three passes so the reads
 * share one layout instead of forcing one per card. */
function glide(running: Running, root: HTMLElement, rects: PendingPick["rects"]) {
  const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-pool-hero]"));
  // Cancelling a previous pick's glide first, so each new rect is the card's
  // real layout spot while `rects` holds where it was drawn.
  for (const card of cards) for (const previous of card.getAnimations()) previous.cancel();
  const moves = cards.map((card) => ({
    card,
    before: rects.get(card.dataset.poolHero!),
    after: card.getBoundingClientRect(),
  }));
  for (const { card, before, after } of moves) {
    if (!before || after.width === 0) continue;
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    const scale = before.width / after.width;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(scale - 1) < 0.001) continue;
    track(
      running,
      card.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, transformOrigin: "0 0" },
          { transform: "none", transformOrigin: "0 0" },
        ],
        { duration: POOL_GLIDE_MS, delay: PICK_FADE_MS, easing: "ease-out", fill: "backwards" },
      ),
    );
  }
}

/** The hero's slot fades in with a flash in the picking team's color. The
 * animation is the only thing keeping the slot invisible, so cancelling it
 * always leaves the slot showing. */
function revealSlot(running: Running, slot: HTMLElement, side: PlayerId) {
  const color =
    getComputedStyle(document.documentElement).getPropertyValue(`--color-${side}`).trim() ||
    "currentColor";
  // The ring is an outline drawn just inside the card: TeamPanel's slot list
  // clips anything outside it, which would cut a box-shadow ring off on a
  // slot touching the panel's edge. Only the soft glow spills outside, where
  // being clipped doesn't matter.
  const ring = { outlineStyle: "solid", outlineWidth: "3px", outlineOffset: "-3px" };
  const off = { ...ring, outlineColor: "transparent", boxShadow: "0 0 0 0 transparent" };
  track(
    running,
    slot.animate(
      // Easing per segment, not on the whole effect, so the flash peaks at
      // exactly 40% of the reveal.
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
  const runningRef = useRef<Running>({ animations: new Set(), standIns: new Set() });

  function beforePick(heroId: HeroId) {
    const root = rootRef.current;
    // Once the draft is done the reducer ignores picks, so there's nothing
    // to animate. Before that, every pick the pool offers commits.
    if (!root || currentTurnPlayer === null || !motionAllowed()) return;

    const rects = new Map<string, DOMRect>();
    for (const card of root.querySelectorAll<HTMLElement>("[data-pool-hero]")) {
      rects.set(card.dataset.poolHero!, card.getBoundingClientRect());
    }
    const image = root.querySelector<HTMLImageElement>(`[data-pool-hero="${heroId}"] img`);
    const fadeImage = image
      ? { src: image.currentSrc || image.src, rect: image.getBoundingClientRect() }
      : null;
    pendingRef.current = { heroId, side: currentTurnPlayer, rects, fadeImage };
  }

  // After a pick commits, wait a frame: it runs after every pre-paint
  // re-render (HeroPool's grid fit re-renders once more), so the new layout
  // is final, and still before that layout is first painted.
  useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (pending === null) return;
    pendingRef.current = null;
    if (pool.some((hero) => hero.id === pending.heroId)) return;

    const frame = requestAnimationFrame(() => {
      framesRef.current.delete(frame);
      const root = rootRef.current;
      if (!root) return;
      const running = runningRef.current;
      if (pending.fadeImage) fadeOut(running, pending.fadeImage);
      glide(running, root, pending.rects);
      const slot = root.querySelector<HTMLElement>(`[data-slot-hero="${pending.heroId}"]`);
      if (slot) revealSlot(running, slot, pending.side);
    });
    framesRef.current.add(frame);
  }, [pool]);

  useEffect(() => {
    const frames = framesRef.current;
    const { animations, standIns } = runningRef.current;
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
