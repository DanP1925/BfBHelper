/** How long the picked card takes to fade out of the pool (intent/10). */
export const PICK_FADE_MS = 150;

/** How long the rest of the pool takes to glide into the gap, starting
 * once the picked card has faded out. */
export const POOL_GLIDE_MS = 300;

/** How long the hero's team slot takes to fade in and flash in the team's
 * color, starting once the picked card has faded out. */
export const SLOT_REVEAL_MS = 600;

/** How long a Board hero card's burst lasts when its level goes from 3 to
 * 4 (intent/26). */
export const LEVEL_FOUR_BURST_MS = 700;

/** How long a hero's defeat animation lasts on its Board portrait, when its
 * HP goes from above 0 to 0 (intent/27). */
export const HERO_DEFEAT_MS = 600;

/** How long a Tower's or Bit's destruction animation lasts on its Board
 * icon, when its HP goes from above 0 to 0 (intent/27). */
export const STRUCTURE_DEFEAT_MS = 700;

/**
 * True when the app may animate: the browser supports the Web Animations
 * API and the OS "reduce motion" setting is off. Read at the moment an
 * animation would start, not cached, so changing the OS setting mid-draft
 * takes effect on the next pick. False in jsdom (no matchMedia, no
 * element.animate), so unit tests never animate.
 */
export function motionAllowed(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  if (typeof Element === "undefined" || typeof Element.prototype.animate !== "function") {
    return false;
  }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
