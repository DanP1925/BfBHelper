import type { HeroId } from "../draft/types";

/**
 * The single stable key drafts are persisted under. Versioning lives inside
 * the payload (`schemaVersion`), not the key name.
 */
export const STORAGE_KEY = "bfbhelper:hero-draft";

/**
 * Separate key for which screen (Results vs Battle Board) is showing once a
 * draft is done. Kept out of `PersistedDraftV1` since it's UI navigation
 * state, not draft data — only "battle" is ever written; absence means
 * "results" (see `storage.ts`'s `loadBattleView`/`saveBattleView`).
 */
export const VIEW_STORAGE_KEY = "bfbhelper:battle-view";

/** The current schema version this build reads and writes. */
export const CURRENT_SCHEMA_VERSION = 1 as const;

/**
 * The on-disk (localStorage) shape of a persisted draft, version 1.
 *
 * No separate `stepIndex`/`phase` fields — those are always re-derived from
 * `initiative` + `picks` on load.
 */
export type PersistedDraftV1 = {
  schemaVersion: 1;
  initiative: "p1" | "p2";
  picks: { p1: HeroId[]; p2: HeroId[] };
  /** Informational only — not used for any load-time logic. */
  updatedAt: string;
};
