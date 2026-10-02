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
