import type { PlayerId } from "./types";

/**
 * Decides which player gets initiative. Pure aside from the injectable rng
 * (defaults to Math.random). Called by useDraft's startNewDraft() — the
 * reducer never calls this itself; NEW_DRAFT actions carry the already
 * decided initiative as payload.
 */
export function coinFlip(rng: () => number = Math.random): PlayerId {
  return rng() < 0.5 ? "p1" : "p2";
}
