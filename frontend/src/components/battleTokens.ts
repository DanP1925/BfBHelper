import type { ComponentType } from "react";
import { HERO_ATTACK_TOKEN_CEILING, HERO_SHIELD_TOKEN_CEILING } from "../lib/battle/constants";
import type { HeroSpecificTokenId } from "../lib/battle/heroSpecificTokens";
import type { HeroBattleState } from "../lib/battle/types";
import { AttackTokenIcon } from "./TokenChip/AttackTokenIcon";
import { ShieldTokenIcon } from "./TokenChip/ShieldTokenIcon";
import { ConfuseTokenIcon } from "./TokenToggle/ConfuseTokenIcon";
import { DeathMarkIcon } from "./TokenToggle/DeathMarkIcon";
import { ImmobilizeIcon } from "./TokenToggle/ImmobilizeIcon";

/** A per-hero counted token's stored field (intents 06, 11). */
export type CountedTokenField = keyof Pick<HeroBattleState, "attackTokens" | "shieldTokens">;

/** A per-hero on/off token's stored field (intents 07-09). */
export type OnOffTokenField = keyof Pick<
  HeroBattleState,
  "confused" | "immobilized" | "deathMarked"
>;

/** Every token's stored field. Its value type is `HeroBattleState[field]`. */
export type BattleTokenField = CountedTokenField | OnOffTokenField;

type TokenLook = {
  Icon: ComponentType<{ size: number }>;
  accent: string;
  /** Set on a hero-specific token: its rule in heroSpecificTokens.ts, which
   * decides which side may carry it. Left out, every hero can. */
  heroSpecific?: HeroSpecificTokenId;
};

/** A counted token: a TokenChip with "×N" and a − / + stepper. */
export type CountedToken = TokenLook & {
  kind: "counted";
  field: CountedTokenField;
  /** The token's name everywhere: the chip, its picker row, the Map's
   * tooltip and tokenCountLabel, e.g. "+1 Attack", "+1 Shield". */
  label: string;
  max: number;
};

/** An on/off token: a lit TokenToggle that a tap removes. */
export type OnOffToken = TokenLook & {
  kind: "onOff";
  field: OnOffTokenField;
  /** The picker row's label, e.g. "Confuse". */
  optionLabel: string;
  /** The held chip's label and the Map icon's tooltip, e.g. "Confuse token". */
  chipLabel: string;
  /** The Map icon's accessible name, e.g. "Confused". */
  mapLabel: string;
};

/** How one token looks, shared by the Board's token row and picker
 * (HeroCard) and the Map's read-only token line (MapTeamStatusPanel). */
export type BattleToken = CountedToken | OnOffToken;

/** Every token in the fixed order (intents 09 and 11): +1 Attack, Confuse,
 * Immobilize, then the hero-specific ones (Death Mark first). HeroCard's
 * row and picker, the Board's wiring and the Map's token line all loop
 * over this, so a new token is one row here plus its stored field and
 * setter. Which heroes may carry a hero-specific token comes from the rule
 * its `heroSpecific` id names. The stored fields, actions and migrations
 * stay one plain field per token. */
export const BATTLE_TOKENS: readonly BattleToken[] = [
  {
    kind: "counted",
    field: "attackTokens",
    Icon: AttackTokenIcon,
    label: "+1 Attack",
    accent: "var(--color-gold)",
    max: HERO_ATTACK_TOKEN_CEILING,
  },
  {
    kind: "onOff",
    field: "confused",
    Icon: ConfuseTokenIcon,
    chipLabel: "Confuse token",
    optionLabel: "Confuse",
    mapLabel: "Confused",
    accent: "var(--color-confuse)",
  },
  {
    kind: "onOff",
    field: "immobilized",
    Icon: ImmobilizeIcon,
    chipLabel: "Immobilized",
    optionLabel: "Immobilize",
    mapLabel: "Immobilized",
    accent: "var(--color-immobilize)",
  },
  {
    kind: "onOff",
    field: "deathMarked",
    Icon: DeathMarkIcon,
    chipLabel: "Death Mark token",
    optionLabel: "Death Mark",
    mapLabel: "Death Mark",
    accent: "var(--color-death-mark)",
    heroSpecific: "deathMark",
  },
  // Named "+1 Shield" to match "+1 Attack" (intent/11, decided 2026-10-16).
  {
    kind: "counted",
    field: "shieldTokens",
    Icon: ShieldTokenIcon,
    label: "+1 Shield",
    accent: "var(--color-shield)",
    max: HERO_SHIELD_TOKEN_CEILING,
    heroSpecific: "shield",
  },
];
