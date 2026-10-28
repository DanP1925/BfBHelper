import { ARTIFACTS_FACE_UP } from "../lib/battle/constants";
import type { HeroBattleState } from "../lib/battle/types";

/** Every token field of a fresh hero (createInitialHeroState), for test
 * fixtures to spread after `hp` and `level` and override what matters:
 * no tokens held, Runika's Artifacts (intent/17) face-up, and no respawn
 * window (intent/24). A new hero field is added here once instead of in
 * every fixture. */
export const NO_TOKENS: Omit<HeroBattleState, "hp" | "level"> = {
  attackTokens: 0,
  confused: false,
  immobilized: false,
  deathMarked: false,
  shieldTokens: 0,
  stoneTokens: 0,
  chillTokens: 0,
  favoredEnemy: false,
  ...ARTIFACTS_FACE_UP,
  respawnWindow: null,
};
