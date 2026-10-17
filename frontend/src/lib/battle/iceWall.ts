import type { HeroId, PlayerId } from "../draft/types";
import { heroSide } from "./selectors";
import type { BattleState } from "./types";

/** The hero whose power card places the Ice Wall (intent/16). */
const ICE_WALL_OWNER: HeroId = "dazeem";

/** The side Dazeem was drafted on, or `null` if he wasn't. The Map shows
 * the wall's holder in that side's column, and nothing at all when it's
 * `null`. No level, HP or position check: the card can be played at any
 * level, and a defeated Dazeem's wall stays on the board. Only placing
 * the holder depends on the side; either player can drag the wall. */
export function iceWallOwnerSide(state: BattleState): PlayerId | null {
  return heroSide(state, ICE_WALL_OWNER);
}
