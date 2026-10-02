import { HERO_IDS } from "../../data/heroes";
import type { DraftState, HeroId, PlayerId } from "../draft/types";
import { getPicksRequiredForStep, STEP_SEQUENCE } from "../draft/sequence";
import {
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEY,
  VIEW_STORAGE_KEY,
  type PersistedDraftV1,
} from "./schema";

const MAX_PICKS_PER_PLAYER = 4;
const MAX_PICKS_TOTAL = 8;
const KNOWN_HERO_IDS = new Set<string>(HERO_IDS);

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

/** A hero id that actually exists in the current roster. */
function isHeroIdLike(value: unknown): value is HeroId {
  return typeof value === "string" && KNOWN_HERO_IDS.has(value);
}

function isPlayerId(value: unknown): value is PlayerId {
  return value === "p1" || value === "p2";
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
 * Shared try/catch-and-swallow wrappers around `window.localStorage` —
 * callers must check `isBrowser()` first, since these assume `window`
 * exists. Every localStorage access in this module (draft + battle-view)
 * goes through these rather than each hand-rolling its own try/catch.
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

function readRaw(): string | null {
  return safeGetItem(STORAGE_KEY);
}

function removeRaw(): void {
  safeRemoveItem(STORAGE_KEY);
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

  safeSetItem(STORAGE_KEY, JSON.stringify(payload));
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

/**
 * Removes any persisted draft, *and* the persisted battle-view flag (see
 * `saveBattleView` below) — structurally, not by convention: whichever
 * screen was showing only ever makes sense relative to a specific
 * completed draft, so any draft reset (new draft, return to start)
 * invalidates it too. Keeping this here (rather than relying on every UI
 * call site that resets a draft to separately remember to reset the view)
 * means a future reset path can't forget it.
 */
export function clearDraft(): void {
  if (!isBrowser()) return;
  removeRaw();
  safeRemoveItem(VIEW_STORAGE_KEY);
}

/** True if the persisted view was "battle"; absence/anything else means "results". */
export function loadBattleView(): boolean {
  if (!isBrowser()) return false;
  return safeGetItem(VIEW_STORAGE_KEY) === "battle";
}

/** Persists which screen is showing once a draft is done; "results" just clears the key. */
export function saveBattleView(view: "results" | "battle"): void {
  if (!isBrowser()) return;
  if (view === "battle") {
    safeSetItem(VIEW_STORAGE_KEY, "battle");
  } else {
    safeRemoveItem(VIEW_STORAGE_KEY);
  }
}
