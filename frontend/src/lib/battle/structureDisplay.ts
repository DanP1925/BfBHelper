import type { PlayerId } from "../draft/types";
import type { TowerSlot } from "./constants";

/** Structure icon art comes in a red/blue pair per side — see specs/Battle
 * Board/. Shared by every surface that renders a Tower/Bit icon
 * (`BattleTeamPanel`, `MapSpace`, `MapTeamStatusPanel`) so the
 * side->color convention lives in one place. */
const SIDE_ICON_SUFFIX: Record<PlayerId, string> = { p1: "red", p2: "blue" };

export function structureIcon(kind: "tower" | "bit", side: PlayerId): string {
  return `/structures/${kind}-${SIDE_ICON_SUFFIX[side]}.png`;
}

/** Short on-screen label for each Tower slot — "Structures" (the section
 * heading) already establishes the category, so these stay terse. */
export const TOWER_LABEL: Record<TowerSlot, string> = {
  top: "Top",
  middle: "Middle",
  bottom: "Bottom",
};
