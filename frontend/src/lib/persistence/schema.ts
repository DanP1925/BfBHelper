import type { HeroId } from "../draft/types";
import type { BattleTeamState } from "../battle/types";

/**
 * The single stable key drafts are persisted under. Versioning lives inside
 * the payload (`schemaVersion`), not the key name.
 */
export const STORAGE_KEY = "bfbhelper:hero-draft";

/**
 * Separate key for which screen is showing once a draft is done. Kept out
 * of `PersistedDraftV1` since it's UI navigation state, not draft data —
 * only a non-default `View` value is ever written; absence means
 * `"results"` (see `storage.ts`'s `loadView`/`saveView`).
 */
export const VIEW_STORAGE_KEY = "bfbhelper:battle-view";

/** Separate key for the mutable, persisted battle state (intent/03) —
 * kept apart from `STORAGE_KEY` since it's a different, independently
 * versioned payload. */
export const BATTLE_STATE_STORAGE_KEY = "bfbhelper:battle-state";

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

/** The on-disk (localStorage) shape of a persisted battle state, version 1. */
export type PersistedBattleStateV1 = {
  schemaVersion: 1;
  p1: BattleTeamState;
  p2: BattleTeamState;
  /** Informational only — not used for any load-time logic. */
  updatedAt: string;
};

/** Which screen is showing once a draft is done. Only a non-`"results"`
 * value is ever written to `VIEW_STORAGE_KEY`; absence means `"results"`. */
export type View = "results" | "battle" | "win";
