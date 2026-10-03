import { HERO_IDS } from "../../data/heroes";
import { GOLD_PILE_SPACE_IDS, MAP_SPACE_IDS } from "../../data/mapSpaces";
import type { GoldPileSpaceId, MapSpaceId } from "../../data/mapSpaces";
import type { DraftState, HeroId, PlayerId } from "../draft/types";
import { getPicksRequiredForStep, STEP_SEQUENCE } from "../draft/sequence";
import {
  BIT_STARTING_HP,
  HERO_HP_CEILING,
  HERO_MAX_LEVEL,
  HERO_STARTING_LEVEL,
  TOWER_STARTING_HP,
} from "../battle/constants";
import { GOLD_PILE_STARTING_COUNT } from "../map/constants";
import type { BattleState, BattleTeamState } from "../battle/types";
import {
  BATTLE_STATE_STORAGE_KEY,
  CURRENT_BATTLE_SCHEMA_VERSION,
  CURRENT_DRAFT_SCHEMA_VERSION,
  STORAGE_KEY,
  VIEW_STORAGE_KEY,
  type LegacyBattleTeamStateV1,
  type PersistedBattleStateV2,
  type PersistedDraftV1,
  type View,
} from "./schema";

const MAX_PICKS_PER_PLAYER = 4;
const MAX_PICKS_TOTAL = 8;
const KNOWN_HERO_IDS = new Set<string>(HERO_IDS);
const KNOWN_MAP_SPACE_IDS = new Set<string>(MAP_SPACE_IDS);

/**
 * Migrations from an older schema version to the current one. Empty for
 * now — schema v1 is the only version that has ever existed, so any older
 * version encountered at load time has no migration path and is treated as
 * corrupt.
 */
const migrations: Record<number, (data: unknown) => PersistedDraftV1 | null> =
  {};

/**
 * Same idea as `migrations` above, for the battle-state payload.
 * `battleMigrations[1]` upgrades a schema-1 payload (no `heroPositions`/
 * `goldPiles`) to schema 2 — every existing hero starts in its team's
 * respawn area (`null`), and every gold pile starts full (intent/04:
 * "upgrades in place rather than resetting").
 */
const battleMigrations: Record<number, (data: unknown) => PersistedBattleStateV2 | null> = {
  1: (data) => {
    if (typeof data !== "object" || data === null) return null;
    const candidate = data as Record<string, unknown>;

    if (
      !hasValidLegacyBattleTeamShape(candidate.p1) ||
      !hasValidLegacyBattleTeamShape(candidate.p2)
    ) {
      return null;
    }

    const upgradeTeam = (team: LegacyBattleTeamStateV1): BattleTeamState => ({
      ...team,
      heroPositions: Object.fromEntries(
        Object.keys(team.heroes).map((heroId) => [heroId, null]),
      ) as Record<HeroId, MapSpaceId | null>,
    });

    return {
      schemaVersion: 2,
      p1: upgradeTeam(candidate.p1),
      p2: upgradeTeam(candidate.p2),
      goldPiles: Object.fromEntries(
        GOLD_PILE_SPACE_IDS.map((id) => [id, GOLD_PILE_STARTING_COUNT]),
      ) as Record<GoldPileSpaceId, number>,
      updatedAt: new Date().toISOString(),
    };
  },
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** A hero id that actually exists in the current roster. */
function isHeroIdLike(value: unknown): value is HeroId {
  return typeof value === "string" && KNOWN_HERO_IDS.has(value);
}

/** A map-space id that actually exists in the board's node graph. */
function isMapSpaceIdLike(value: unknown): value is MapSpaceId {
  return typeof value === "string" && KNOWN_MAP_SPACE_IDS.has(value);
}

function isPlayerId(value: unknown): value is PlayerId {
  return value === "p1" || value === "p2";
}

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Given a total pick count and who had initiative, the split of those
 * picks between p1/p2 is uniquely determined by the fixed step sequence
 * (turns alternate by whole step, not by individual pick) — see
 * `lib/draft/sequence.ts` and `selectors.ts`'s `getCurrentTurnPlayer`.
 */
function expectedPicksPerPlayer(
  totalPicks: number,
  initiative: PlayerId,
): Record<PlayerId, number> {
  const other: PlayerId = initiative === "p1" ? "p2" : "p1";
  const counts: Record<PlayerId, number> = { p1: 0, p2: 0 };

  let remaining = totalPicks;
  for (let step = 1; step <= STEP_SEQUENCE.length && remaining > 0; step++) {
    const required = getPicksRequiredForStep(step);
    const taken = Math.min(required, remaining);
    const player = step % 2 === 1 ? initiative : other;
    counts[player] += taken;
    remaining -= taken;
  }

  return counts;
}

/**
 * Validates the structural shape of a parsed payload's `picks`, independent
 * of schema version: known player keys, string-array values of real hero
 * ids, no duplicate ids (within or across players), and the per-player/
 * overall pick-count caps.
 */
function hasValidPicksShape(
  picks: unknown,
): picks is { p1: HeroId[]; p2: HeroId[] } {
  if (typeof picks !== "object" || picks === null) return false;

  const candidate = picks as Record<string, unknown>;
  const p1 = candidate.p1;
  const p2 = candidate.p2;

  if (!Array.isArray(p1) || !Array.isArray(p2)) return false;
  if (!p1.every(isHeroIdLike) || !p2.every(isHeroIdLike)) return false;

  if (p1.length > MAX_PICKS_PER_PLAYER) return false;
  if (p2.length > MAX_PICKS_PER_PLAYER) return false;
  if (p1.length + p2.length > MAX_PICKS_TOTAL) return false;

  const allIds = [...p1, ...p2];
  const uniqueIds = new Set(allIds);
  if (uniqueIds.size !== allIds.length) return false;

  return true;
}

/**
 * Rejects pick counts that no sequence of real `PICK_HERO` actions could
 * ever produce — e.g. the second player holding picks while the first
 * holds none, which the fixed turn order never allows. Guards against a
 * payload that passes every other structural check (valid ids, within the
 * per-player/overall caps) but is still internally self-contradictory.
 */
function isConsistentWithTurnOrder(
  initiative: PlayerId,
  picks: { p1: HeroId[]; p2: HeroId[] },
): boolean {
  const totalPicks = picks.p1.length + picks.p2.length;
  const expected = expectedPicksPerPlayer(totalPicks, initiative);
  return picks.p1.length === expected.p1 && picks.p2.length === expected.p2;
}

function isValidPersistedDraft(data: unknown): data is PersistedDraftV1 {
  if (typeof data !== "object" || data === null) return false;

  const candidate = data as Record<string, unknown>;

  if (!isPlayerId(candidate.initiative)) return false;
  if (!hasValidPicksShape(candidate.picks)) return false;
  if (!isConsistentWithTurnOrder(candidate.initiative, candidate.picks)) {
    return false;
  }

  return true;
}

/**
 * Validates the pre-intent-04 (schema-1) shape of one side's battle-team
 * state — gold, structures, and heroes only, no `heroPositions` yet. Used
 * only to gate a raw schema-1 payload before `battleMigrations[1]` upgrades
 * it; the live, current-schema validator is `hasValidBattleTeamShape`
 * below.
 */
function hasValidLegacyBattleTeamShape(data: unknown): data is LegacyBattleTeamStateV1 {
  if (typeof data !== "object" || data === null) return false;

  const candidate = data as Record<string, unknown>;

  if (typeof candidate.gold !== "number" || !Number.isFinite(candidate.gold)) {
    return false;
  }
  if (candidate.gold < 0) return false;

  const structures = candidate.structures;
  if (typeof structures !== "object" || structures === null) return false;
  const s = structures as Record<string, unknown>;
  if (!isNumberInRange(s.top, 0, TOWER_STARTING_HP)) return false;
  if (!isNumberInRange(s.middle, 0, TOWER_STARTING_HP)) return false;
  if (!isNumberInRange(s.bottom, 0, TOWER_STARTING_HP)) return false;
  if (!isNumberInRange(s.bit, 0, BIT_STARTING_HP)) return false;

  const heroes = candidate.heroes;
  if (typeof heroes !== "object" || heroes === null) return false;
  const heroEntries = Object.entries(heroes as Record<string, unknown>);
  for (const [heroId, heroValue] of heroEntries) {
    if (!isHeroIdLike(heroId)) return false;
    if (typeof heroValue !== "object" || heroValue === null) return false;
    const hv = heroValue as Record<string, unknown>;
    if (!isNumberInRange(hv.hp, 0, HERO_HP_CEILING)) return false;
    if (!isNumberInRange(hv.level, HERO_STARTING_LEVEL, HERO_MAX_LEVEL)) return false;
  }

  return true;
}

/**
 * Validates one side's `BattleTeamState` shape, independent of schema
 * version and independent of any specific draft's hero-id set (that
 * belongs to `useBattle`'s `heroIdSetsMatch`, which has the draft to
 * compare against): gold is non-negative, each structure is within its
 * own floor/ceiling, every `heroes` entry has a real hero id with hp/level
 * each within bounds, and every one of those hero ids also has a
 * `heroPositions` entry that's either `null` or a real map-space id.
 */
function hasValidBattleTeamShape(data: unknown): data is BattleTeamState {
  if (!hasValidLegacyBattleTeamShape(data)) return false;

  const candidate = data as Record<string, unknown>;
  const heroes = candidate.heroes as Record<string, unknown>;

  const heroPositions = candidate.heroPositions;
  if (typeof heroPositions !== "object" || heroPositions === null) return false;
  const positions = heroPositions as Record<string, unknown>;

  for (const heroId of Object.keys(heroes)) {
    if (!(heroId in positions)) return false;
    const position = positions[heroId];
    if (position !== null && !isMapSpaceIdLike(position)) return false;
  }

  return true;
}

function isValidPersistedBattleState(data: unknown): data is PersistedBattleStateV2 {
  if (typeof data !== "object" || data === null) return false;

  const candidate = data as Record<string, unknown>;

  if (!hasValidBattleTeamShape(candidate.p1)) return false;
  if (!hasValidBattleTeamShape(candidate.p2)) return false;

  const goldPiles = candidate.goldPiles;
  if (typeof goldPiles !== "object" || goldPiles === null) return false;
  const piles = goldPiles as Record<string, unknown>;
  if (Object.keys(piles).length !== GOLD_PILE_SPACE_IDS.length) return false;
  for (const id of GOLD_PILE_SPACE_IDS) {
    if (!isNumberInRange(piles[id], 0, GOLD_PILE_STARTING_COUNT)) return false;
  }

  return true;
}

/**
 * Shared try/catch-and-swallow wrappers around `window.localStorage` —
 * callers must check `isBrowser()` first, since these assume `window`
 * exists. Every localStorage access in this module goes through these
 * rather than each hand-rolling its own try/catch.
 */
function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore write failures (e.g. quota exceeded, storage disabled).
  }
}

function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore — nothing more we can do if localStorage is unavailable.
  }
}

function readRaw(key: string): string | null {
  return safeGetItem(key);
}

function removeRaw(key: string): void {
  safeRemoveItem(key);
}

function clearAndReturnNull(key: string): null {
  removeRaw(key);
  return null;
}

/**
 * Shared parse -> schemaVersion-check -> migrate-or-reject ->
 * structural-validate -> clear-on-failure pipeline, used by both
 * `loadDraft` and `loadBattleState` (previously duplicated almost
 * verbatim between them, differing only in the key/currentVersion/
 * migrations/validator). Never throws — any failure along the way clears
 * `key` and returns `null`. Returns the validated payload as-is; callers do
 * their own small mapping into the final domain shape (e.g. copying
 * arrays).
 *
 * `currentVersion` is an explicit parameter, not a shared module constant
 * — `loadDraft` and `loadBattleState` are independently versioned
 * (intent/04), so bumping one must never affect the other's migrate/reject
 * decision.
 */
function loadPersisted<T>(
  key: string,
  currentVersion: number,
  migrations: Record<number, (data: unknown) => T | null>,
  isValid: (data: unknown) => data is T,
): T | null {
  if (!isBrowser()) return null;

  const raw = readRaw(key);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return clearAndReturnNull(key);
  }

  if (typeof parsed !== "object" || parsed === null) {
    return clearAndReturnNull(key);
  }

  const schemaVersion = (parsed as Record<string, unknown>).schemaVersion;
  if (typeof schemaVersion !== "number") {
    return clearAndReturnNull(key);
  }

  let data: unknown = parsed;
  if (schemaVersion !== currentVersion) {
    if (schemaVersion > currentVersion) {
      // Newer version than this build understands — no downgrade path.
      return clearAndReturnNull(key);
    }

    const migrate = migrations[schemaVersion];
    if (!migrate) {
      // Older version with no migration path available — treat as corrupt.
      return clearAndReturnNull(key);
    }

    const migrated = migrate(parsed);
    if (migrated === null) {
      return clearAndReturnNull(key);
    }
    data = migrated;
  }

  if (!isValid(data)) {
    return clearAndReturnNull(key);
  }

  return data;
}

/** Persists the given draft state, overwriting any previously saved draft. */
export function saveDraft(state: DraftState): void {
  if (!isBrowser()) return;

  const payload: PersistedDraftV1 = {
    schemaVersion: CURRENT_DRAFT_SCHEMA_VERSION,
    initiative: state.initiative,
    picks: {
      p1: [...state.picks.p1],
      p2: [...state.picks.p2],
    },
    updatedAt: new Date().toISOString(),
  };

  safeSetItem(STORAGE_KEY, JSON.stringify(payload));
}

/**
 * Loads a persisted draft, validating it thoroughly. Any failure along the
 * way clears the stored key and returns `null` — this never throws to the
 * caller.
 */
export function loadDraft(): DraftState | null {
  const data = loadPersisted(STORAGE_KEY, CURRENT_DRAFT_SCHEMA_VERSION, migrations, isValidPersistedDraft);
  if (data === null) return null;

  return {
    initiative: data.initiative,
    picks: {
      p1: [...data.picks.p1],
      p2: [...data.picks.p2],
    },
  };
}

/** Persists the given battle state, overwriting any previously saved one. */
export function saveBattleState(state: BattleState): void {
  if (!isBrowser()) return;

  const payload: PersistedBattleStateV2 = {
    schemaVersion: CURRENT_BATTLE_SCHEMA_VERSION,
    p1: state.p1,
    p2: state.p2,
    goldPiles: state.goldPiles,
    updatedAt: new Date().toISOString(),
  };

  safeSetItem(BATTLE_STATE_STORAGE_KEY, JSON.stringify(payload));
}

/**
 * Loads a persisted battle state, validating it thoroughly. Any failure
 * along the way clears the stored key and returns `null` — this never
 * throws to the caller. This validation is generic (doesn't know about a
 * specific draft's picks) — the hero-id-*set*-match check against the
 * current draft's heroes happens in `useBattle`.
 */
export function loadBattleState(): BattleState | null {
  const data = loadPersisted(
    BATTLE_STATE_STORAGE_KEY,
    CURRENT_BATTLE_SCHEMA_VERSION,
    battleMigrations,
    isValidPersistedBattleState,
  );
  if (data === null) return null;

  return {
    schemaVersion: 2,
    p1: data.p1,
    p2: data.p2,
    goldPiles: data.goldPiles,
  };
}

/**
 * Removes any persisted draft, the persisted view flag, and the persisted
 * battle state — structurally, not by convention: whichever screen was
 * showing, and whatever battle progress existed, only ever makes sense
 * relative to a specific completed draft, so any draft reset (new draft,
 * return to start) invalidates all three. Keeping this here (rather than
 * relying on every UI call site that resets a draft to separately
 * remember to reset the others) means a future reset path can't forget it.
 */
export function clearDraft(): void {
  if (!isBrowser()) return;
  removeRaw(STORAGE_KEY);
  safeRemoveItem(VIEW_STORAGE_KEY);
  safeRemoveItem(BATTLE_STATE_STORAGE_KEY);
}

/** The persisted view, defaulting to "results" when nothing (or something
 * other than a known `View` value) is stored. */
export function loadView(): View {
  if (!isBrowser()) return "results";
  const raw = safeGetItem(VIEW_STORAGE_KEY);
  if (raw === "battle" || raw === "map" || raw === "win") return raw;
  if (raw !== null) {
    // A stale/corrupt value (a future build's new View literal, or a
    // hand-edited key) — clear it rather than silently defaulting to
    // "results" forever, matching loadDraft/loadBattleState's
    // clear-on-invalid convention instead of leaving bad data behind.
    safeRemoveItem(VIEW_STORAGE_KEY);
  }
  return "results";
}

/** Persists which screen is showing once a draft is done; "results" just
 * clears the key (it's the default, nothing to store). */
export function saveView(view: View): void {
  if (!isBrowser()) return;
  if (view === "results") {
    safeRemoveItem(VIEW_STORAGE_KEY);
  } else {
    safeSetItem(VIEW_STORAGE_KEY, view);
  }
}
