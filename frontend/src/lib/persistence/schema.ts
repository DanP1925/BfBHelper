import type { HeroId, PlayerId } from "../draft/types";
import type { BattleTeamState, HeroBattleState, StructuresState } from "../battle/types";
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
export const CURRENT_BATTLE_SCHEMA_VERSION = 10 as const;

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

/** One side's battle-team state in schemas 2-3: heroPositions, but no
 * per-hero attackTokens yet (intent/06). */
export type LegacyBattleTeamStateV2 = Omit<BattleTeamState, "heroes"> & {
  heroes: Record<HeroId, { hp: number; level: number }>;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 2
 * (intent/04: `heroPositions` per side, top-level `goldPiles`) — now only
 * the migration source shape `battleMigrations[2]` upgrades from. */
export type PersistedBattleStateV2 = {
  schemaVersion: 2;
  p1: LegacyBattleTeamStateV2;
  p2: LegacyBattleTeamStateV2;
  goldPiles: Record<GoldPileSpaceId, number>;
  /** Informational only — not used for any load-time logic. */
  updatedAt: string;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 3
 * (intent/05: top-level `initiative`) — now only the migration source
 * shape `battleMigrations[3]` upgrades from. */
export type PersistedBattleStateV3 = Omit<PersistedBattleStateV2, "schemaVersion"> & {
  schemaVersion: 3;
  initiative: PlayerId;
};

/** One side's battle-team state in schema 4: per-hero attackTokens,
 * but no confused flag yet (intent/07). */
export type LegacyBattleTeamStateV4 = Omit<BattleTeamState, "heroes"> & {
  heroes: Record<HeroId, Omit<LegacyHeroBattleStateV5, "confused">>;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 4
 * (intent/06: per-hero `attackTokens`) — now only the migration source
 * shape `battleMigrations[4]` upgrades from. */
export type PersistedBattleStateV4 = Omit<PersistedBattleStateV3, "schemaVersion" | "p1" | "p2"> & {
  schemaVersion: 4;
  p1: LegacyBattleTeamStateV4;
  p2: LegacyBattleTeamStateV4;
};

/** One side's battle-team state in schema 5: per-hero confused,
 * but no immobilized flag yet (intent/08). */
export type LegacyBattleTeamStateV5 = Omit<BattleTeamState, "heroes"> & {
  heroes: Record<HeroId, LegacyHeroBattleStateV5>;
};

/** Each schema's hero is the next one's minus the field that schema added,
 * so a new schema only touches the newest legacy type. */
type LegacyHeroBattleStateV9 = Omit<HeroBattleState, "chillTokens">;
type LegacyHeroBattleStateV8 = Omit<LegacyHeroBattleStateV9, "stoneTokens">;
type LegacyHeroBattleStateV7 = Omit<LegacyHeroBattleStateV8, "shieldTokens">;
type LegacyHeroBattleStateV6 = Omit<LegacyHeroBattleStateV7, "deathMarked">;
type LegacyHeroBattleStateV5 = Omit<LegacyHeroBattleStateV6, "immobilized">;

/** The on-disk (localStorage) shape of a persisted battle state, version 5
 * (intent/07: per-hero `confused`) — now only the migration source shape
 * `battleMigrations[5]` upgrades from. */
export type PersistedBattleStateV5 = Omit<PersistedBattleStateV4, "schemaVersion" | "p1" | "p2"> & {
  schemaVersion: 5;
  p1: LegacyBattleTeamStateV5;
  p2: LegacyBattleTeamStateV5;
};

/** One side's battle-team state in schema 6: per-hero immobilized,
 * but no deathMarked flag yet (intent/09). */
export type LegacyBattleTeamStateV6 = Omit<BattleTeamState, "heroes"> & {
  heroes: Record<HeroId, LegacyHeroBattleStateV6>;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 6
 * (intent/08: per-hero `immobilized`) — now only the migration source shape
 * `battleMigrations[6]` upgrades from. */
export type PersistedBattleStateV6 = Omit<PersistedBattleStateV5, "schemaVersion" | "p1" | "p2"> & {
  schemaVersion: 6;
  p1: LegacyBattleTeamStateV6;
  p2: LegacyBattleTeamStateV6;
};

/** One side's battle-team state in schema 7: per-hero deathMarked,
 * but no shieldTokens count yet (intent/11). */
export type LegacyBattleTeamStateV7 = Omit<BattleTeamState, "heroes"> & {
  heroes: Record<HeroId, LegacyHeroBattleStateV7>;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 7
 * (intent/09: per-hero `deathMarked`) — now only the migration source shape
 * `battleMigrations[7]` upgrades from. */
export type PersistedBattleStateV7 = Omit<PersistedBattleStateV6, "schemaVersion" | "p1" | "p2"> & {
  schemaVersion: 7;
  p1: LegacyBattleTeamStateV7;
  p2: LegacyBattleTeamStateV7;
};

/** One side's battle-team state in schema 8: per-hero shieldTokens,
 * but no stoneTokens count yet (intent/12). */
export type LegacyBattleTeamStateV8 = Omit<BattleTeamState, "heroes"> & {
  heroes: Record<HeroId, LegacyHeroBattleStateV8>;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 8
 * (intent/11: per-hero `shieldTokens`) — now only the migration source shape
 * `battleMigrations[8]` upgrades from. */
export type PersistedBattleStateV8 = Omit<PersistedBattleStateV7, "schemaVersion" | "p1" | "p2"> & {
  schemaVersion: 8;
  p1: LegacyBattleTeamStateV8;
  p2: LegacyBattleTeamStateV8;
};

/** One side's battle-team state in schema 9: per-hero stoneTokens,
 * but no chillTokens count yet (intent/13). */
export type LegacyBattleTeamStateV9 = Omit<BattleTeamState, "heroes"> & {
  heroes: Record<HeroId, LegacyHeroBattleStateV9>;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 9
 * (intent/12: per-hero `stoneTokens`) — now only the migration source shape
 * `battleMigrations[9]` upgrades from. */
export type PersistedBattleStateV9 = Omit<PersistedBattleStateV8, "schemaVersion" | "p1" | "p2"> & {
  schemaVersion: 9;
  p1: LegacyBattleTeamStateV9;
  p2: LegacyBattleTeamStateV9;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 10
 * (intent/13: per-hero `chillTokens`). */
export type PersistedBattleStateV10 = Omit<
  PersistedBattleStateV9,
  "schemaVersion" | "p1" | "p2"
> & {
  schemaVersion: 10;
  p1: BattleTeamState;
  p2: BattleTeamState;
};

/** Which screen is showing once a draft is done. Only a non-`"results"`
 * value is ever written to `VIEW_STORAGE_KEY`; absence means `"results"`. */
export type View = "results" | "battle" | "map" | "win";
