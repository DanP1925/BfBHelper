/** A hero's HP after their level moves by `levelDelta` (intent/19).
 * +1 HP per level gained and -1 per level lost. A defeated hero (0 HP)
 * stays at 0 either way, and a level-down never takes a living hero
 * below 1 HP: it's a correction, not damage, so it never defeats them.
 * The flat HERO_HP_CEILING is applied by the reducer's SET_HERO_HP. */
export function hpAfterLevelChange(hp: number, levelDelta: number): number {
  if (hp === 0) return 0;
  return Math.max(1, hp + levelDelta);
}
