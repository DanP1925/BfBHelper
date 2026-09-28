/**
 * The fixed hero-draft step sequence: 5 steps, picks-per-step [1, 2, 2, 2, 1].
 * Not a snake draft — turn alternates by *step* (initiative, other, initiative,
 * other, initiative), not by individual pick. See selectors.ts for turn
 * derivation.
 *
 * All helpers here are pure functions of `totalPicks` (the sum of both
 * players' picks) — no state, no I/O.
 */

/** Picks required in each of the 5 steps, in order. */
export const STEP_SEQUENCE = [1, 2, 2, 2, 1] as const;

/** Cumulative total-picks reached at the end of each step. */
export const STEP_BOUNDARIES = [1, 3, 5, 7, 8] as const;

/** Total picks across both players once the draft is complete. */
export const TOTAL_PICKS = 8;

/**
 * 1-indexed current step (1..STEP_SEQUENCE.length) for a given number of
 * total picks made so far. Once the draft is done (totalPicks >= TOTAL_PICKS),
 * this saturates at the final step index.
 */
export function getCurrentStepIndex(totalPicks: number): number {
  if (totalPicks >= TOTAL_PICKS) {
    return STEP_SEQUENCE.length;
  }
  for (let i = 0; i < STEP_BOUNDARIES.length; i++) {
    if (totalPicks < STEP_BOUNDARIES[i]) {
      return i + 1;
    }
  }
  return STEP_SEQUENCE.length;
}

/** Number of picks required within the given 1-indexed step. */
export function getPicksRequiredForStep(stepIndex: number): number {
  return STEP_SEQUENCE[stepIndex - 1];
}

/** Number of picks required in whatever step `totalPicks` currently falls in. */
export function getPicksRequiredForTotal(totalPicks: number): number {
  return getPicksRequiredForStep(getCurrentStepIndex(totalPicks));
}

/** Whether the draft is complete (all 8 picks made). */
export function isDraftDone(totalPicks: number): boolean {
  return totalPicks >= TOTAL_PICKS;
}
