"use client";

import type { RefObject } from "react";
import { HERO_MAX_LEVEL } from "../../lib/battle/constants";
import type { PlayerId } from "../../lib/draft/types";
import { LEVEL_FOUR_BURST_MS } from "../../lib/motion";
import { useTransitionAnimation } from "../../lib/useTransitionAnimation";

/** Starts the burst's two animations: a ring and glow in `color` on the
 * card, and a pop on its level value. Both end in the card's normal look,
 * so cancelling or finishing them leaves nothing behind. */
function playBurst(card: HTMLElement, color: string): Animation[] {
  // The ring is an outline drawn just inside the card: the hero grid can
  // clip anything outside it, as TeamPanel's slots do in intent/10's
  // reveal. Only the soft glow spills outside, where being clipped doesn't
  // matter.
  const ring = { outlineStyle: "solid", outlineWidth: "3px", outlineOffset: "-3px" };
  const off = { ...ring, outlineColor: "transparent", boxShadow: "0 0 0 0 transparent" };
  const timing = { duration: LEVEL_FOUR_BURST_MS };
  const animations = [
    // Easing per segment, not on the whole effect, so the peak lands at
    // exactly 40% of the burst.
    card.animate(
      [
        { ...off, easing: "ease-out" },
        {
          ...ring,
          outlineColor: color,
          boxShadow: `0 0 18px 4px ${color}`,
          offset: 0.4,
          easing: "ease-in-out",
        },
        off,
      ],
      timing,
    ),
  ];
  // The level is the battle card's only <output> (NumberStepper's
  // read-only value, intent/22); HP is an <input>.
  const value = card.querySelector("output");
  if (value) {
    animations.push(
      value.animate(
        [
          { transform: "scale(1)", easing: "ease-out" },
          { transform: "scale(1.3)", offset: 0.4, easing: "ease-in-out" },
          { transform: "scale(1)" },
        ],
        timing,
      ),
    );
  }
  return animations;
}

/**
 * Plays the level-4 burst on `cardRef`, in `side`'s team color, each time
 * `level` goes from 3 to 4 (intent/26). `side` undefined means no burst:
 * only a Board card passes it. Never on mount, so a reload or a Board/Map
 * switch with a hero already at 4 shows nothing. Going back down to 3
 * stops a burst still playing. Purely presentational: the level is already
 * saved, and nothing here blocks a tap.
 *
 * Does nothing when `motionAllowed()` is false (reduced motion, or jsdom).
 */
export function useLevelFourBurst(
  cardRef: RefObject<HTMLElement | null>,
  level: number | undefined,
  side: PlayerId | undefined,
): void {
  useTransitionAnimation({
    elementRef: cardRef,
    value: level,
    enabled: side !== undefined,
    plays: (previous, next) => previous === HERO_MAX_LEVEL - 1 && next === HERO_MAX_LEVEL,
    play: (card) => {
      const color =
        getComputedStyle(document.documentElement).getPropertyValue(`--color-${side}`).trim() ||
        "currentColor";
      return playBurst(card, color);
    },
  });
}
