import type { Hero, HeroRole } from "./types";

/** A role filter option: one role, or every hero (intent/23). */
export type RoleFilterValue = "all" | HeroRole;

/** The filter's options in display order, with their labels (intent/23). */
export const ROLE_FILTER_OPTIONS: ReadonlyArray<{ value: RoleFilterValue; label: string }> = [
  { value: "all", label: "All" },
  { value: "damage", label: "Damage" },
  { value: "utility", label: "Utility" },
  { value: "support", label: "Support" },
];

/** How many of `pool`'s heroes are in each role, plus "all". */
export function countRemainingByRole(pool: readonly Hero[]): Record<RoleFilterValue, number> {
  const counts: Record<RoleFilterValue, number> = {
    all: pool.length,
    damage: 0,
    utility: 0,
    support: 0,
  };
  for (const hero of pool) counts[hero.role] += 1;
  return counts;
}

/** `pool` narrowed to one role, in its existing order (the pool stays
 * alphabetical, intent/23); "all" returns it as is. */
export function filterPoolByRole(pool: Hero[], role: RoleFilterValue): Hero[] {
  return role === "all" ? pool : pool.filter((hero) => hero.role === role);
}
