import type { HeroId } from "../draft/types";
import type { BattleTeamState, StructuresState } from "../battle/types";
import type { GoldPileSpaceId } from "../../data/mapSpaces";

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

/** The current schema version `loadDraft`/`saveDraft` reads and writes. */
export const CURRENT_DRAFT_SCHEMA_VERSION = 1 as const;

/** The current schema version `loadBattleState`/`saveBattleState` reads
 * and writes — independent of `CURRENT_DRAFT_SCHEMA_VERSION` (intent/04):
 * bumping the battle-state schema must never make `loadDraft` also expect
 * a migration that doesn't exist for drafts. */
export const CURRENT_BATTLE_SCHEMA_VERSION = 2 as const;

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

/** The pre-intent-04 on-disk shape of one side's battle-team state — the
 * migration source shape `battleMigrations[1]` upgrades from. Deliberately
 * not `BattleTeamState` (which is schema-2 and already has
 * `heroPositions`) — a genuine schema-1 payload never has that field. */
export type LegacyBattleTeamStateV1 = {
  gold: number;
  heroes: Record<HeroId, { hp: number; level: number }>;
  structures: StructuresState;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 2
 * (intent/04: `heroPositions` per side, top-level `goldPiles`). */
export type PersistedBattleStateV2 = {
  schemaVersion: 2;
  p1: BattleTeamState;
  p2: BattleTeamState;
  goldPiles: Record<GoldPileSpaceId, number>;
  /** Informational only — not used for any load-time logic. */
  updatedAt: string;
};

/** Which screen is showing once a draft is done. Only a non-`"results"`
 * value is ever written to `VIEW_STORAGE_KEY`; absence means `"results"`. */
export type View = "results" | "battle" | "map" | "win";
