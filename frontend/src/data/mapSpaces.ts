import type { PlayerId } from "../lib/draft/types";
import type { TowerSlot } from "../lib/battle/constants";

export type MapSpaceKind = "plain" | "tower" | "bit" | "gold";

export type MapSpaceDef = {
  id: string;
  kind: MapSpaceKind;
  /** Percent coordinates (0-100) of this space's center on the board art
   * (`/map/board.png`), measured against the full-resolution source. */
  xPct: number;
  yPct: number;
  /** "tower"/"bit", and the 4 exclusive "plain" front-line nodes (2 per
   * side): which team this belongs to. The 3 "gold" nodes are always
   * shared/neutral and leave this `undefined`. */
  side?: PlayerId;
  /** Only present for "tower" — which of the 3 slots. */
  slot?: TowerSlot;
};

/**
 * The board's full hero-placement graph — 15 nodes total, confirmed
 * directly against the physical board, not inferred from the denser-
 * looking tile art (which is walkable-looking decoration, not additional
 * discrete stopping points). See specs/04_battle-map.md's Data Model.
 *
 * The 3 `"gold"` nodes are the board's only shared front-line spaces —
 * there is no separate gold-only space anywhere else on the board.
 */
export const MAP_SPACES = [
  { id: "p1-bit", kind: "bit", side: "p1", xPct: 87.7, yPct: 88.3 },
  { id: "p2-bit", kind: "bit", side: "p2", xPct: 12, yPct: 11 },

  { id: "p1-tower-top", kind: "tower", side: "p1", slot: "top", xPct: 71.7, yPct: 73.1 },
  { id: "p1-tower-middle", kind: "tower", side: "p1", slot: "middle", xPct: 86.7, yPct: 69.3 },
  { id: "p1-tower-bottom", kind: "tower", side: "p1", slot: "bottom", xPct: 68.9, yPct: 86.1 },
  { id: "p2-tower-top", kind: "tower", side: "p2", slot: "top", xPct: 31.3, yPct: 12.5 },
  { id: "p2-tower-middle", kind: "tower", side: "p2", slot: "middle", xPct: 13, yPct: 30 },
  { id: "p2-tower-bottom", kind: "tower", side: "p2", slot: "bottom", xPct: 27, yPct: 26.7 },

  { id: "p1-plain-1", kind: "plain", side: "p1", xPct: 70.5, yPct: 41.5 },
  { id: "p1-plain-2", kind: "plain", side: "p1", xPct: 41.5, yPct: 72 },
  { id: "p2-plain-1", kind: "plain", side: "p2", xPct: 58, yPct: 27 },
  { id: "p2-plain-2", kind: "plain", side: "p2", xPct: 28, yPct: 57.5 },

  { id: "gold-ne", kind: "gold", xPct: 82.7, yPct: 16.3 },
  { id: "gold-mid", kind: "gold", xPct: 50, yPct: 50 },
  { id: "gold-sw", kind: "gold", xPct: 16.5, yPct: 83 },
] as const satisfies readonly MapSpaceDef[];

export type MapSpaceId = (typeof MAP_SPACES)[number]["id"];
export type GoldPileSpaceId = Extract<(typeof MAP_SPACES)[number], { kind: "gold" }>["id"];

/** Runtime membership arrays — `MapSpaceId`/`GoldPileSpaceId` only exist as
 * compile-time types, but storage.ts's validators need real values to check
 * an untrusted persisted string against. */
export const MAP_SPACE_IDS: MapSpaceId[] = MAP_SPACES.map((space) => space.id);
export const GOLD_PILE_SPACE_IDS: GoldPileSpaceId[] = MAP_SPACES.filter(
  (space): space is Extract<(typeof MAP_SPACES)[number], { kind: "gold" }> => space.kind === "gold",
).map((space) => space.id);
