"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { Hero, HeroId, PlayerId } from "../../../lib/draft/types";
import { motionAllowed, PICK_FADE_MS, POOL_GLIDE_MS, SLOT_REVEAL_MS } from "../../../lib/motion";

type PendingPick = {
  heroId: HeroId;
  side: PlayerId;
  /** Where every pool card was drawn at the tap, running transforms included. */
  rects: Map<string, DOMRect>;
  /** The tapped card's art, where it was drawn and its corner radius, for
   * its fade-out stand-in. */
  fadeImage: { src: string; rect: DOMRect; borderRadius: string } | null;
};

/** Everything a pick's animations leave running, so unmount can tear it
 * all down. */
type Running = {
  frames: Set<number>;
  animations: Set<Animation>;
  standIns: Set<HTMLElement>;
  /** The slot reveals still playing: the last one ending means the final
   * hero has landed. */
  reveals: Set<Animation>;
};

type UseDraftPickAnimationOptions = {
  pool: Hero[];
  /** null once the draft is done. */
  currentTurnPlayer: PlayerId | null;
  /** While passed, called as soon as no pick animation is pending or
   * playing: the page passes it only while the draft's last hero is
   * landing (intent/10's "After the 8th hero appears in its slot"). */
  onFinalPickLanded?: () => void;
};

type UseDraftPickAnimationResult = {
  rootRef: RefObject<HTMLDivElement | null>;
  /** Call from the pool's click handler, before dispatching the pick. */
  beforePick: (heroId: HeroId) => void;
};

function poolCards(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-pool-hero]"));
}

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
function fadeOut(
  running: Running,
  { src, rect, borderRadius }: NonNullable<PendingPick["fadeImage"]>,
) {
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
    borderRadius,
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
  const cards = poolCards(root);
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

/** Calls `onLanded`, if one is passed, once no pick's frame is pending and
 * no slot reveal is playing. */
function settle(running: Running, onLanded: (() => void) | undefined) {
  if (onLanded && running.frames.size === 0 && running.reveals.size === 0) onLanded();
}

/** The hero's slot fades in with a flash of `color`, the picking team's.
 * The animation is the only thing keeping the slot invisible, so cancelling
 * it always leaves the slot showing. */
function revealSlot(running: Running, slot: HTMLElement, color: string, onDone: () => void) {
  // The ring is an outline drawn just inside the card: TeamPanel's slot list
  // clips anything outside it, which would cut a box-shadow ring off on a
  // slot touching the panel's edge. Only the soft glow spills outside, where
  // being clipped doesn't matter.
  const ring = { outlineStyle: "solid", outlineWidth: "3px", outlineOffset: "-3px" };
  const off = { ...ring, outlineColor: "transparent", boxShadow: "0 0 0 0 transparent" };
  const reveal = slot.animate(
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
  );
  running.reveals.add(reveal);
  track(running, reveal, () => {
    running.reveals.delete(reveal);
    onDone();
  });
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
  onFinalPickLanded,
}: UseDraftPickAnimationOptions): UseDraftPickAnimationResult {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef<PendingPick | null>(null);
  const runningRef = useRef<Running>({
    frames: new Set(),
    animations: new Set(),
    standIns: new Set(),
    reveals: new Set(),
  });
  // The latest `onFinalPickLanded`, for animation callbacks.
  const onLandedRef = useRef(onFinalPickLanded);

  // Every render: keep the latest callback, then check whether nothing is
  // left to play. On the final pick's render its frame is already scheduled
  // (layout effects run first), so this waits for that frame and its reveal.
  useEffect(() => {
    onLandedRef.current = onFinalPickLanded;
    settle(runningRef.current, onFinalPickLanded);
  });

  function beforePick(heroId: HeroId) {
    const root = rootRef.current;
    // Once the draft is done the reducer ignores picks, so there's nothing
    // to animate. Before that, every pick the pool offers commits.
    if (!root || currentTurnPlayer === null || !motionAllowed()) return;

    const rects = new Map<string, DOMRect>();
    let fadeImage: PendingPick["fadeImage"] = null;
    for (const card of poolCards(root)) {
      rects.set(card.dataset.poolHero!, card.getBoundingClientRect());
      const image = card.dataset.poolHero === heroId ? card.querySelector("img") : null;
      if (image) {
        fadeImage = {
          src: image.currentSrc || image.src,
          rect: image.getBoundingClientRect(),
          borderRadius: getComputedStyle(image).borderRadius,
        };
      }
    }
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

    const running = runningRef.current;
    const frame = requestAnimationFrame(() => {
      running.frames.delete(frame);
      const root = rootRef.current;
      if (!root) return;
      // Every read before any write: the team color and the glide's layout
      // reads come before the stand-in is appended and animations start.
      const color =
        getComputedStyle(document.documentElement)
          .getPropertyValue(`--color-${pending.side}`)
          .trim() || "currentColor";
      glide(running, root, pending.rects);
      if (pending.fadeImage) fadeOut(running, pending.fadeImage);
      const slot = root.querySelector<HTMLElement>(`[data-slot-hero="${pending.heroId}"]`);
      if (slot) revealSlot(running, slot, color, () => settle(running, onLandedRef.current));
      // No slot found: nothing will reveal, so the final pick lands now.
      settle(running, onLandedRef.current);
    });
    running.frames.add(frame);
  }, [pool]);

  useEffect(() => {
    const { frames, animations, standIns } = runningRef.current;
    return () => {
      // Cancelling a reveal below mustn't report a landing on the way out.
      // (On Strict Mode's dev-only remount, the effect above restores it.)
      onLandedRef.current = undefined;
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
