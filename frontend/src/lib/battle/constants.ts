/** Starting battle-state constants for the Battle Board (intent/02) — all
 * static, since no damage/leveling/gold tracking exists until intent 03. */
export const TOWER_STARTING_HP = 11;
export const BIT_STARTING_HP = 16;
export const HERO_STARTING_LEVEL = 1;
export const HERO_MAX_LEVEL = 4;
export const TEAM_STARTING_GOLD = 0;
export const TOWER_SLOTS = ["top", "middle", "bottom"] as const;

export type TowerSlot = (typeof TOWER_SLOTS)[number];
