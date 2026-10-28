"use client";

import type { RefObject } from "react";
import { HERO_DEFEAT_MS, STRUCTURE_DEFEAT_MS } from "./motion";
import { useTransitionAnimation } from "./useTransitionAnimation";

/** The gray look `.tokenDefeated` and `.iconDestroyed` apply at 0 HP. Both
 * motions end on it, so the class takes over with no jump. */
export const DEFEATED_FILTER = "grayscale(1) brightness(0.6)";

/**
 * One `filter` value with the same five functions, in the same order, in
 * every keyframe. A browser only blends two filters whose function lists
 * match; otherwise it flips from one to the other halfway, so the gray
 * would snap in instead of fading. The defaults are each function's
 * identity, so `filterOf({ grayscale: 1, brightness: 0.6 })` looks exactly
 * like `DEFEATED_FILTER`.
 */
export function filterOf({
  grayscale = 0,
  brightness = 1,
  sepia = 0,
  hueRotate = 0,
  saturate = 1,
}: {
  grayscale?: number;
  brightness?: number;
  sepia?: number;
  hueRotate?: number;
  saturate?: number;
}): string {
  return `grayscale(${grayscale}) brightness(${brightness}) sepia(${sepia}) hue-rotate(${hueRotate}deg) saturate(${saturate})`;
}

const NORMAL = filterOf({});
const GRAY = filterOf({ grayscale: 1, brightness: 0.6 });
const RED_HIT = filterOf({ brightness: 1.6, sepia: 1, hueRotate: -30, saturate: 4 });

/** A hero's hit: a red flash and a 3px shake over the first 30%, then the
 * portrait eases into the gray look (intent/27, the canvas's "Battle Board
 * — Defeat Animation"). Easing per segment, so the hit lands at the same
 * point every time. */
export const HERO_DEFEAT_KEYFRAMES: Keyframe[] = [
  { filter: NORMAL, transform: "none", easing: "ease-out" },
  { filter: RED_HIT, transform: "translateX(-3px)", offset: 0.075 },
  { transform: "translateX(3px)", offset: 0.15 },
  { transform: "translateX(-2px)", offset: 0.225 },
  { filter: RED_HIT, transform: "none", offset: 0.3, easing: "ease-in-out" },
  { filter: GRAY, transform: "none" },
];

/** A Tower's or Bit's collapse: a 2px rumble, then it sinks and squashes
 * from its base while darkening, and springs back to its normal shape,
 * gray (intent/27). The squash is from the base because `StructureSlot`'s
 * icon sets `transform-origin: 50% 100%`. */
export const STRUCTURE_DEFEAT_KEYFRAMES: Keyframe[] = [
  { filter: NORMAL, transform: "none" },
  { transform: "translateX(2px)", offset: 0.05 },
  { transform: "translateX(-2px)", offset: 0.1 },
  { transform: "translateX(2px)", offset: 0.15 },
  { transform: "translateX(-2px)", offset: 0.2 },
  { filter: filterOf({ brightness: 1.15 }), transform: "none", offset: 0.26, easing: "ease-in" },
  {
    filter: filterOf({ grayscale: 0.8, brightness: 0.5 }),
    transform: "translateY(4px) scaleY(0.8)",
    offset: 0.78,
    easing: "ease-out",
  },
  { filter: GRAY, transform: "none" },
];

function playDefeat(image: HTMLElement, kind: "hero" | "structure"): Animation[] {
  return kind === "hero"
    ? [image.animate(HERO_DEFEAT_KEYFRAMES, { duration: HERO_DEFEAT_MS })]
    : [image.animate(STRUCTURE_DEFEAT_KEYFRAMES, { duration: STRUCTURE_DEFEAT_MS })];
}

/**
 * Plays the defeat animation on `imageRef` each time `hp` goes from above 0
 * to exactly 0 (intent/27): the hero's hit on a portrait, the structure's
 * collapse on a Tower's or Bit's icon. `enabled` false means never: only
 * the Battle Board's cards pass true. Never on mount, so a reload or a
 * Board/Map switch shows the gray look with no replay. Raising HP above 0
 * cancels it, so the image is in color at once. No `fill`: the CSS class
 * holds the gray look after it ends.
 */
export function useDefeatAnimation(
  imageRef: RefObject<HTMLElement | null>,
  hp: number | undefined,
  enabled: boolean,
  kind: "hero" | "structure",
): void {
  useTransitionAnimation({
    elementRef: imageRef,
    value: hp,
    enabled,
    plays: (previous, next) => previous !== undefined && previous > 0 && next === 0,
    play: (image) => playDefeat(image, kind),
  });
}
