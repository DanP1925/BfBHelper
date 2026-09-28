import type { HeroId } from "./types";

/**
 * TEMPORARY DUPLICATE — reconcile at merge time.
 *
 * This is the full list of the 19 hero ids from the roster table in
 * plan/01_hero-draft-picker.md, kept here so reducer.ts has an
 * authoritative id set to validate PICK_HERO actions against without a hard
 * dependency on `../../data/heroes` (owned by a parallel M2 worktree that
 * may not exist yet in this one). Once `data/heroes.ts` lands, replace this
 * file's usage with `HERO_ROSTER.map(h => h.id)` (or an exported HERO_IDS
 * set from that module) and delete this file.
 */
export const ALL_HERO_IDS: HeroId[] = [
  "agatha-trunch",
  "baldwin",
  "boreas",
  "caligar",
  "ceralin",
  "cynthia",
  "cyrus",
  "dazeem",
  "dolgolae",
  "felix",
  "ken-obi",
  "kerrick",
  "kunoichi",
  "longshanks",
  "motley",
  "runika",
  "sedusa",
  "sterling",
  "vladiator",
];
