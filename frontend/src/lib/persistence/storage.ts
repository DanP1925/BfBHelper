import type { DraftState, HeroId, PlayerId } from "../draft/types";
import {
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEY,
  type PersistedDraftV1,
} from "./schema";

const MAX_PICKS_PER_PLAYER = 4;
const MAX_PICKS_TOTAL = 8;

/**
 * Migrations from an older schema version to the current one. Empty for
 * now — schema v1 is the only version that has ever existed, so any older
 * version encountered at load time has no migration path and is treated as
 * corrupt.
 */
const migrations: Record<number, (data: unknown) => PersistedDraftV1 | null> =
  {};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** A loose, roster-agnostic check that a value looks like a HeroId. */
function isHeroIdLike(value: unknown): value is HeroId {
  return typeof value === "string" && value.length > 0;
}

function isPlayerId(value: unknown): value is PlayerId {
  return value === "p1" || value === "p2";
}

/**
 * Validates the structural shape of a parsed payload's `picks`, independent
 * of schema version: known player keys, string-array values, no duplicate
 * ids (within or across players), and the per-player/overall pick-count
 * caps. Does not check hero ids against the roster (this module doesn't
 * import `data/heroes.ts`).
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

function isValidPersistedDraft(data: unknown): data is PersistedDraftV1 {
  if (typeof data !== "object" || data === null) return false;

  const candidate = data as Record<string, unknown>;

  if (!isPlayerId(candidate.initiative)) return false;
  if (!hasValidPicksShape(candidate.picks)) return false;

  return true;
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function removeRaw(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — nothing more we can do if localStorage is unavailable.
  }
}

function clearAndReturnNull(): null {
  removeRaw();
  return null;
}

/** Persists the given draft state, overwriting any previously saved draft. */
export function saveDraft(state: DraftState): void {
  if (!isBrowser()) return;

  const payload: PersistedDraftV1 = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    initiative: state.initiative,
    picks: {
      p1: [...state.picks.p1],
      p2: [...state.picks.p2],
    },
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore write failures (e.g. quota exceeded, storage disabled).
  }
}

/**
 * Loads a persisted draft, validating it thoroughly. Any failure along the
 * way clears the stored key and returns `null` — this never throws to the
 * caller.
 */
export function loadDraft(): DraftState | null {
  if (!isBrowser()) return null;

  const raw = readRaw();
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return clearAndReturnNull();
  }

  if (typeof parsed !== "object" || parsed === null) {
    return clearAndReturnNull();
  }

  const schemaVersion = (parsed as Record<string, unknown>).schemaVersion;
  if (typeof schemaVersion !== "number") {
    return clearAndReturnNull();
  }

  let data = parsed;
  if (schemaVersion !== CURRENT_SCHEMA_VERSION) {
    if (schemaVersion > CURRENT_SCHEMA_VERSION) {
      // Newer version than this build understands — no downgrade path.
      return clearAndReturnNull();
    }

    const migrate = migrations[schemaVersion];
    if (!migrate) {
      // Older version with no migration path available — treat as corrupt.
      return clearAndReturnNull();
    }

    const migrated = migrate(parsed);
    if (migrated === null) {
      return clearAndReturnNull();
    }
    data = migrated;
  }

  if (!isValidPersistedDraft(data)) {
    return clearAndReturnNull();
  }

  return {
    initiative: data.initiative,
    picks: {
      p1: [...data.picks.p1],
      p2: [...data.picks.p2],
    },
  };
}

/** Removes any persisted draft. */
export function clearDraft(): void {
  if (!isBrowser()) return;
  removeRaw();
}
