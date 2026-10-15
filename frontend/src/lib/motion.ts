/** How long the picked card takes to fade out of the pool (intent/10). */
export const PICK_FADE_MS = 150;

/** How long the rest of the pool takes to glide into the gap, starting
 * once the picked card has faded out. */
export const POOL_GLIDE_MS = 300;

/** How long the hero's team slot takes to fade in and flash in the team's
 * color, starting once the picked card has faded out. */
export const SLOT_REVEAL_MS = 600;

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
