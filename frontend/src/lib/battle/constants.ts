import type { HeroId } from "../draft/types";
import type { CountedTokenField, HeroBattleState } from "./types";

/** Starting battle-state constants for the Battle Board (intent/02) — all
 * static, since no damage/leveling/gold tracking exists until intent 03. */
export const TOWER_STARTING_HP = 11;
export const BIT_STARTING_HP = 16;
export const HERO_STARTING_LEVEL = 1;
export const HERO_MAX_LEVEL = 4;
export const TEAM_STARTING_GOLD = 0;
export const TOWER_SLOTS = ["top", "middle", "bottom"] as const;

export type TowerSlot = (typeof TOWER_SLOTS)[number];

/** Flat HP ceiling for every hero, regardless of base HP or level
 * (intent/03) — level and HP stay independently adjustable; this ceiling
 * doesn't recalculate off either. */
export const HERO_HP_CEILING = 15;

/** Per-hero ceiling for each counted token (intents 06, 11, 12, 13). The
 * floor is always 0. */
export const HERO_COUNTED_TOKEN_CEILINGS = {
  /** +1 Attack (intent/06's Value Bounds, decided 2026-10-11) — keeps the
   * count to a single digit on the hero card. */
  attackTokens: 9,
  /** Shield (intent/11's Value Bounds, decided 2026-10-16) — the same
   * single digit as +1 Attack. The box's 15 tokens aren't a per-hero
   * limit. */
  shieldTokens: 9,
  /** Stone (intent/12's Value Bounds, decided 2026-10-16) — a hero at 3 is
   * defeated and their tokens are discarded, so a higher count never
   * matters. The box's 8 tokens aren't a per-hero limit. */
  stoneTokens: 3,
  /** Chill (intent/13's Value Bounds, decided 2026-10-17) — the box's 5.
   * No rule caps it, but a hero can't physically hold more. */
  chillTokens: 5,
} as const satisfies Record<CountedTokenField, number>;

/** Every per-hero on/off token's stored field (intents 07-09, 15).
 * OnOffTokenField is read from this list, and storage validation loops
 * over it. */
export const ON_OFF_TOKEN_FIELDS = [
  "confused",
  "immobilized",
  "deathMarked",
  "favoredEnemy",
] as const satisfies readonly BooleanHeroField[];

/** The hero whose card and Map line show the Artifacts (intent/17). */
export const ARTIFACT_OWNER: HeroId = "runika";

/** Runika's Artifacts' stored fields (intent/17), in the card's order:
 * Battle Fist, Auto Deflector, Shield Amulet (the rulebook's, p. 3).
 * ArtifactField is read from this list, and storage validation loops over
 * it. */
export const ARTIFACT_FIELDS = [
  "battleFistFaceUp",
  "autoDeflectorFaceUp",
  "shieldAmuletFaceUp",
] as const satisfies readonly BooleanHeroField[];

/** Every Artifact face-up: a fresh hero's (createInitialHeroState) and an
 * upgraded save's (storage's schema 13 → 14) faces, built from
 * ARTIFACT_FIELDS so a new Artifact can't be left out. */
export const ARTIFACTS_FACE_UP = Object.fromEntries(
  ARTIFACT_FIELDS.map((field) => [field, true]),
) as Record<(typeof ARTIFACT_FIELDS)[number], true>;

type BooleanHeroField = {
  [F in keyof HeroBattleState]: HeroBattleState[F] extends boolean ? F : never;
}[keyof HeroBattleState];
