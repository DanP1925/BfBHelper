import type { HeroId, PlayerId } from "../draft/types";
import { heroSide } from "./selectors";
import type { BattleState } from "./types";

/** The hero whose power card places the Bear Trap (intent/18). */
const BEAR_TRAP_OWNER: HeroId = "boreas";

/** The side Boreas was drafted on, or `null` if he wasn't. The Map shows
 * the trap's holder in that side's outer zones, and nothing at all when
 * it's `null`. No level, HP or position check: the card can be played at
 * any level, and a defeated Boreas's trap stays on the board. Only placing
 * the holder depends on the side; either player can drag the trap. */
export function bearTrapOwnerSide(state: BattleState): PlayerId | null {
  return heroSide(state, BEAR_TRAP_OWNER);
}
