import type { ComponentType } from "react";
import type { HeroBattleState } from "../../lib/battle/types";
import { ConfuseTokenIcon } from "./ConfuseTokenIcon";
import { DeathMarkIcon } from "./DeathMarkIcon";
import { ImmobilizeIcon } from "./ImmobilizeIcon";

/** A per-hero on/off token's stored field (intents 07-09). */
export type OnOffTokenField = keyof Pick<
  HeroBattleState,
  "confused" | "immobilized" | "deathMarked"
>;

/** How one on/off token looks, shared by the Board's token row (HeroCard)
 * and the Map's read-only token line (MapTeamStatusPanel). */
export type OnOffToken = {
  field: OnOffTokenField;
  Icon: ComponentType<{ size: number }>;
  /** The held chip's label and the Map icon's tooltip, e.g. "Confuse token". */
  chipLabel: string;
  /** The picker row's label, e.g. "Confuse". */
  optionLabel: string;
  /** The Map icon's accessible name, e.g. "Confused". */
  mapLabel: string;
  accent: string;
};

/** Every on/off token in the fixed order (intent/09): the general ones,
 * then the hero-specific ones. The Board and the Map both loop over this,
 * so a new token is one row here. Which heroes may carry a hero-specific
 * token is decided elsewhere (heroSpecificTokens.ts). */
export const ON_OFF_TOKENS: readonly OnOffToken[] = [
  {
    field: "confused",
    Icon: ConfuseTokenIcon,
    chipLabel: "Confuse token",
    optionLabel: "Confuse",
    mapLabel: "Confused",
    accent: "var(--color-confuse)",
  },
  {
    field: "immobilized",
    Icon: ImmobilizeIcon,
    chipLabel: "Immobilized",
    optionLabel: "Immobilize",
    mapLabel: "Immobilized",
    accent: "var(--color-immobilize)",
  },
  {
    field: "deathMarked",
    Icon: DeathMarkIcon,
    chipLabel: "Death Mark token",
    optionLabel: "Death Mark",
    mapLabel: "Death Mark",
    accent: "var(--color-death-mark)",
  },
];
