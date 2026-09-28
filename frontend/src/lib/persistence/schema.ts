import type { HeroId } from "../draft/types";

/**
 * The single stable key drafts are persisted under. Versioning lives inside
 * the payload (`schemaVersion`), not the key name.
 */
export const STORAGE_KEY = "bfbhelper:hero-draft";

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
