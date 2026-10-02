export type PlayerId = "p1" | "p2";

export type HeroId =
  | "agatha-trunch"
  | "baldwin"
  | "boreas"
  | "caligar"
  | "ceralin"
  | "cynthia"
  | "cyrus"
  | "dazeem"
  | "dolgolae"
  | "felix"
  | "ken-obi"
  | "kerrick"
  | "kunoichi"
  | "longshanks"
  | "motley"
  | "runika"
  | "sedusa"
  | "sterling"
  | "vladiator";

export type Hero = {
  id: HeroId;
  name: string;
  className: string;
  portrait: string;
  /**
   * The standalone map-token art (no card chrome, no baked-in stats) used on
   * the Battle Board, distinct from `portrait`'s cropped trading-card art —
   * see specs/02_battle-board.md's UI Design Reference.
   */
  battleToken: string;
  /** Fixed per-hero HP printed on the card (heart icon) — never changes. */
  baseHp: number;
};

/**
 * The only stored/dispatched draft state. Phase, step, turn, remaining
 * pool, and per-player team slots are all derived from this plus the fixed
 * step sequence (see sequence.ts) — never stored directly.
 */
export type DraftState = {
  initiative: PlayerId;
  picks: Record<PlayerId, HeroId[]>;
};

export type DraftAction =
  | { type: "NEW_DRAFT"; initiative: PlayerId }
  | { type: "PICK_HERO"; player: PlayerId; heroId: HeroId };
