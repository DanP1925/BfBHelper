import type { Hero, HeroId, PlayerId } from "../draft/types";
import { otherPlayer } from "../draft/selectors";

/** Which team a hero-specific token can go on, relative to its owner. */
type HeroSpecificTarget = "enemies" | "allies";

type HeroSpecificTokenRule = { owner: HeroId; targets: HeroSpecificTarget };

/** Hero-specific tokens (BACKLOG's visibility rule, decided
 * 2026-10-10): each one only exists while its owner is in the battle,
 * on either team. One row per token; later intents add rows. */
export const HERO_SPECIFIC_TOKENS = {
  deathMark: { owner: "kunoichi", targets: "enemies" },
} as const satisfies Record<string, HeroSpecificTokenRule>;

export type HeroSpecificTokenId = keyof typeof HERO_SPECIFIC_TOKENS;

/** The side whose heroes a `rule` lets carry its token, or `null` when its
 * owner wasn't drafted. "In the battle" means drafted, so an owner at 0 HP
 * or in the respawn area still counts. The draft never picks a hero twice,
 * so the owner is on at most one side. */
export function targetSideForRule(
  rule: HeroSpecificTokenRule,
  rosters: Record<PlayerId, readonly Hero[]>,
): PlayerId | null {
  const ownerSide = (["p1", "p2"] as const).find((side) =>
    rosters[side].some((hero) => hero.id === rule.owner),
  );
  if (ownerSide === undefined) return null;
  return rule.targets === "enemies" ? otherPlayer(ownerSide) : ownerSide;
}

/** The side whose heroes can carry `token`, or `null` when its owner
 * wasn't drafted (then no hero gets a control). */
export function heroSpecificTokenSide(
  token: HeroSpecificTokenId,
  rosters: Record<PlayerId, readonly Hero[]>,
): PlayerId | null {
  return targetSideForRule(HERO_SPECIFIC_TOKENS[token], rosters);
}
