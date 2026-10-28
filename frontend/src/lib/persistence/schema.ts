import type { HeroId, PlayerId } from "../draft/types";
import type {
  ArtifactField,
  BattlePhase,
  BattleTeamState,
  HeroBattleState,
  IceWallPosition,
  StructuresState,
} from "../battle/types";
import type { GoldPileSpaceId, MapSpaceId } from "../../data/mapSpaces";

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
export const CURRENT_BATTLE_SCHEMA_VERSION = 17 as const;

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
export type LegacyBattleTeamStateV2 = Omit<LegacyBattleTeamStateV10, "heroes"> & {
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
export type LegacyBattleTeamStateV4 = Omit<LegacyBattleTeamStateV10, "heroes"> & {
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
export type LegacyBattleTeamStateV5 = Omit<LegacyBattleTeamStateV10, "heroes"> & {
  heroes: Record<HeroId, LegacyHeroBattleStateV5>;
};

/** Each schema's hero is the next one's minus the field that schema added,
 * so a new schema only touches the newest legacy type. Schemas 10 and 11
 * share one hero shape (intent/14 changed positions only), and so do 12
 * and 13 (intent/16 added only the top-level `iceWall`), and 14 to 16
 * (intents 18 and 21 added only top-level fields). */
type LegacyHeroBattleStateV16 = Omit<HeroBattleState, "respawnWindow">;
type LegacyHeroBattleStateV13 = Omit<LegacyHeroBattleStateV16, ArtifactField>;
type LegacyHeroBattleStateV11 = Omit<LegacyHeroBattleStateV13, "favoredEnemy">;
type LegacyHeroBattleStateV9 = Omit<LegacyHeroBattleStateV11, "chillTokens">;
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
export type LegacyBattleTeamStateV6 = Omit<LegacyBattleTeamStateV10, "heroes"> & {
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
export type LegacyBattleTeamStateV7 = Omit<LegacyBattleTeamStateV10, "heroes"> & {
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
export type LegacyBattleTeamStateV8 = Omit<LegacyBattleTeamStateV10, "heroes"> & {
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
export type LegacyBattleTeamStateV9 = Omit<LegacyBattleTeamStateV10, "heroes"> & {
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

/** One side's battle-team state in schemas 2-10: a hero's position is a
 * board space or the respawn area, never the Arena yet (intent/14). The
 * older legacy team types build on it, so widening `BattleTeamState`'s
 * positions doesn't widen them. */
export type LegacyBattleTeamStateV10 = Omit<LegacyBattleTeamStateV11, "heroPositions"> & {
  heroPositions: Record<HeroId, MapSpaceId | null>;
};

/** One side's battle-team state in schemas 10-11: per-hero chillTokens, but
 * no favoredEnemy flag yet (intent/15). Every older legacy team type builds
 * on it through V10, so adding a hero field doesn't add it to them. */
export type LegacyBattleTeamStateV11 = Omit<BattleTeamState, "heroes"> & {
  heroes: Record<HeroId, LegacyHeroBattleStateV11>;
};

/** One side's battle-team state in schemas 12-13: per-hero favoredEnemy,
 * but no Artifact flags yet (intent/17). */
export type LegacyBattleTeamStateV13 = Omit<BattleTeamState, "heroes"> & {
  heroes: Record<HeroId, LegacyHeroBattleStateV13>;
};

/** One side's battle-team state in schemas 14-16: per-hero Artifact flags,
 * but no respawnWindow yet (intent/24). */
export type LegacyBattleTeamStateV16 = Omit<BattleTeamState, "heroes"> & {
  heroes: Record<HeroId, LegacyHeroBattleStateV16>;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 10
 * (intent/13: per-hero `chillTokens`) — now only the migration source shape
 * `battleMigrations[10]` upgrades from. */
export type PersistedBattleStateV10 = Omit<
  PersistedBattleStateV9,
  "schemaVersion" | "p1" | "p2"
> & {
  schemaVersion: 10;
  p1: LegacyBattleTeamStateV10;
  p2: LegacyBattleTeamStateV10;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 11
 * (intent/14: `heroPositions` may hold `"arena"`) — now only the migration
 * source shape `battleMigrations[11]` upgrades from. */
export type PersistedBattleStateV11 = Omit<
  PersistedBattleStateV10,
  "schemaVersion" | "p1" | "p2"
> & {
  schemaVersion: 11;
  p1: LegacyBattleTeamStateV11;
  p2: LegacyBattleTeamStateV11;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 12
 * (intent/15: per-hero `favoredEnemy`) — now only the migration source
 * shape `battleMigrations[12]` upgrades from. Its top-level fields come
 * from `PersistedBattleStateV2` onward, not `BattleState`, so it never
 * gains `iceWall`. */
export type PersistedBattleStateV12 = Omit<
  PersistedBattleStateV11,
  "schemaVersion" | "p1" | "p2"
> & {
  schemaVersion: 12;
  p1: LegacyBattleTeamStateV13;
  p2: LegacyBattleTeamStateV13;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 13
 * (intent/16: a top-level `iceWall`, `null` while it's in its holder) — now
 * only the migration source shape `battleMigrations[13]` upgrades from. */
export type PersistedBattleStateV13 = Omit<PersistedBattleStateV12, "schemaVersion"> & {
  schemaVersion: 13;
  iceWall: IceWallPosition | null;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 14
 * (intent/17: per-hero Artifact flags, face-up by default) — now only the
 * migration source shape `battleMigrations[14]` upgrades from. Its
 * top-level fields come from `PersistedBattleStateV2` onward, not
 * `BattleState`, so it never gains `bearTrap`. */
export type PersistedBattleStateV14 = Omit<
  PersistedBattleStateV13,
  "schemaVersion" | "p1" | "p2"
> & {
  schemaVersion: 14;
  p1: LegacyBattleTeamStateV16;
  p2: LegacyBattleTeamStateV16;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 15
 * (intent/18: a top-level `bearTrap`, the space it's on or `null` while
 * it's in its holder) — now only the migration source shape
 * `battleMigrations[15]` upgrades from. */
export type PersistedBattleStateV15 = Omit<PersistedBattleStateV14, "schemaVersion"> & {
  schemaVersion: 15;
  bearTrap: MapSpaceId | null;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 16
 * (intent/21: top-level `round`, from 1, and `phase`) — now only the
 * migration source shape `battleMigrations[16]` upgrades from. */
export type PersistedBattleStateV16 = Omit<PersistedBattleStateV15, "schemaVersion"> & {
  schemaVersion: 16;
  round: number;
  phase: BattlePhase;
};

/** The on-disk (localStorage) shape of a persisted battle state, version 17
 * (intent/24: per-hero `respawnWindow`, `null` while the hero is standing). */
export type PersistedBattleStateV17 = Omit<
  PersistedBattleStateV16,
  "schemaVersion" | "p1" | "p2"
> & {
  schemaVersion: 17;
  p1: BattleTeamState;
  p2: BattleTeamState;
};

/** Which screen is showing once a draft is done. Only a non-`"results"`
 * value is ever written to `VIEW_STORAGE_KEY`; absence means `"results"`. */
export type View = "results" | "battle" | "map" | "win";
