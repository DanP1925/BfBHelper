import { HERO_COUNTED_TOKEN_CEILINGS } from "../lib/battle/constants";
import type { CountedTokenField } from "../lib/battle/types";

/** One `describe.each` / `it.each` row per counted token, read from the
 * ceilings table, so a new counted token is covered without a new row. */
export const COUNTED_TOKENS = (
  Object.entries(HERO_COUNTED_TOKEN_CEILINGS) as [CountedTokenField, number][]
).map(([field, ceiling]) => ({ field, ceiling }));
