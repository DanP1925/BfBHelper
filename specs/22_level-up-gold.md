# Spec 22: Level-Up Gold

> **DRAFT.** Architecture for intent 22's scope. Build-out has not started
> yet. See [../intent/22_level-up-gold.md](../intent/22_level-up-gold.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-21: React + TypeScript,
  Next.js, static build, no backend.
- **The payment lives in `useBattle.setHeroLevel`, next to spec 19's HP
  bump.** The mutator already dispatches `SET_HERO_LEVEL` then
  `SET_HERO_HP` in one `setState` update. It gains a third step,
  `SET_GOLD`, and a guard that turns an unaffordable level-up into a
  no-op. `battleReducer` keeps one field per action, as in spec 19.
- **The gold rule joins the HP rule in `lib/battle/levelUp.ts`.** Pure
  functions for the cost of one level and the gold moved by a level
  change. The mutator and the UI both read them, so the price shown is
  the price taken.
- **`NumberStepper` gains two optional props:** `readOnly` (no typed
  input) and `increaseDisabled` (an extra reason to disable +). Only the
  hero level uses them (intent's Scope: HP, gold and token counts stay
  typeable).
- **No persisted shape changes** (intent's Constraints). The gold taken
  is ordinary team `gold`, and the battle schema stays at 15.
- **What doesn't change:** `battleReducer`'s actions and clamps
  (`clampGold`'s floor of 0 stays, though the guard means a payment
  never reaches it), the persistence schema and
  validation, `setGold` (gold stays editable by hand, intent's Scope),
  `setHeroHp`, `hpAfterLevelChange`, the team level from intent 20, the
  Battle Map, `ResultsScreen` and `WinScreen`.

## State Management
- **`useBattle` (`frontend/src/lib/useBattle.ts`):** `setHeroLevel`
  keeps its signature, `(side, heroId, value) => void`. Its body becomes:
  ```ts
  setState((prev) => {
    if (prev === null) return prev;
    const afterLevel = battleReducer(prev, { type: "SET_HERO_LEVEL", side, heroId, value });
    if (afterLevel === prev) return prev;
    const before = prev[side].heroes[heroId];
    const toLevel = afterLevel[side].heroes[heroId].level;
    const cost = goldForLevelChange(heroId, before.level, toLevel);
    if (cost > prev[side].gold) return prev;
    const hp = hpAfterLevelChange(before.hp, toLevel - before.level);
    const afterHp = battleReducer(afterLevel, { type: "SET_HERO_HP", side, heroId, value: hp });
    return battleReducer(afterHp, { type: "SET_GOLD", side, value: prev[side].gold - cost });
  });
  ```
  - **The cost is measured after the level clamp,** like spec 19's HP
    delta. A level-down has a negative cost, a refund.
  - **Can't afford it, nothing happens** (intent's Scope). If the cost
    is more than the team's gold, the previous state is returned as is:
    no level, HP or gold change, nothing saved. The UI already disables
    + in that case (see Layout), so this is the backstop, not the main
    path.
  - **Exactly enough is enough.** Gold 3 and a cost of 3 levels up and
    leaves 0.
  - **Defeated heroes pay** (intent's Scope). The guard and the
    `SET_GOLD` don't look at HP. Only `hpAfterLevelChange` treats 0 HP
    specially, as before.
  - **No phase check** (intent's Scope). The mutator doesn't read
    intent 21's round or phase, so levels can change in any phase.
  - **It stays general over a jump.** With the level read-only, the UI
    only ever sends ±1, but a larger move (from a test or a future
    caller) costs the sum of each level's price, matching the rule that
    each level is paid individually.
- **Nothing else moves gold from level.** `setGold` doesn't change
  level, and no other mutator reads level.
- `page.tsx`, `BattleBoardScreen` and `BattleTeamPanel` already pass
  `setHeroLevel` through, so no wiring changes for the payment itself.

## Data Model
- No new types, fields or reducer actions.
- **No schema change** (intent's Constraints). `CURRENT_BATTLE_SCHEMA_VERSION`
  stays 15 (or whatever intent 21 lands it at, which this doesn't touch),
  and existing saved battles load as they are. Level-ups paid by hand
  before this ships aren't revisited: a later level-down still refunds
  that level's price, which is correct either way.
- **Doc comments that go stale:**
  - `battleReducer`'s comment (`reducer.ts`) lists "no gold-on-level-up"
    among the things no action does. The reducer still holds to that, so
    the comment should say the gold payment (intent/22) is composed in
    `useBattle.setHeroLevel` alongside the HP bump.
  - `NumberStepper`'s comment says the input is "always directly
    editable". It becomes: editable unless `readOnly`.
  - The `setHeroLevel` doc in `useBattle`'s return type gains a line:
    pays or refunds the level's gold, and is a no-op if the team can't
    afford it.

## Level-Up Gold Logic
Added to `frontend/src/lib/battle/levelUp.ts`, pure and unit-tested in
`levelUp.test.ts`:

```ts
/** Ken Obi's "Become the Master" trait: each of his level-ups costs one
 * less gold (intent/22). Named like ARENA_OWNER and ICE_WALL_OWNER. */
const LEVEL_UP_DISCOUNT_OWNER: HeroId = "ken-obi";

/** Gold to raise `heroId` from `level` to `level + 1` (intent/22,
 * rulebook p. 12): the current level plus one, minus one for Ken Obi.
 * `null` at HERO_MAX_LEVEL, where there's no next level to buy. */
export function levelUpCost(heroId: HeroId, level: number): number | null {
  if (level >= HERO_MAX_LEVEL) return null;
  return heroId === LEVEL_UP_DISCOUNT_OWNER ? level : level + 1;
}

/** Gold a level change moves: the sum of each level's price, positive
 * going up (paid) and negative going down (refunded). Each level is paid
 * individually (rulebook p. 12), so 1 → 3 costs 2 + 3 = 5 (Ken Obi:
 * 1 + 2 = 3). */
export function goldForLevelChange(heroId: HeroId, fromLevel: number, toLevel: number): number {
  let gold = 0;
  for (let level = fromLevel; level < toLevel; level++) gold += levelUpCost(heroId, level) ?? 0;
  for (let level = toLevel; level < fromLevel; level++) gold -= levelUpCost(heroId, level) ?? 0;
  return gold;
}

/** Whether a team with `gold` can buy this hero's next level. False at
 * the max level. */
export function canAffordLevelUp(heroId: HeroId, gold: number, level: number): boolean {
  const cost = levelUpCost(heroId, level);
  return cost !== null && gold >= cost;
}
```

- **The discount is the only per-hero price** (intent's Scope). It lives
  in this module as an owner constant, the way `ARENA_OWNER`
  (`arena.ts`) and `ICE_WALL_OWNER` (`iceWall.ts`) do, rather than as a
  field on every `Hero` in `heroes.ts`.
- His +1 Attack at level 4 isn't applied (intent's Out of Scope).

Cases, per intent's Scope and Proposed Outcome:

| Gold before | Level change | Gold after | Why |
|---|---|---|---|
| 5 | 1 → 2 | 3 | Pays 2 |
| 3 | 2 → 3 | 0 | Pays 3: exactly enough |
| 0 | 3 → 4 | 0, level stays 3 | Can't afford 4: no-op |
| 0 | 3 → 2 | 3 | Refunds 3 |
| 9 | 1 → 4 (jump) | 0 | 2 + 3 + 4, each level paid |
| 2 | 1 → 2, hero at 0 HP | 0 | Defeated heroes pay, HP stays 0 |
| any | 4 → 4 | same | No change, no cost |
| 1 | Ken Obi 1 → 2 | 0 | His discount: pays 1 |
| 6 | Ken Obi 1 → 4 (jump) | 0 | 1 + 2 + 3 |
| 0 | Ken Obi 3 → 2 | 2 | Refunds his price, 2 |

## Read-Only Level
- **`NumberStepper` (`components/NumberStepper/NumberStepper.tsx`)**
  gains:
  ```ts
  /** Shows the value as plain text instead of a typed input; it changes
   * only through − and + (intent/22's read-only level). */
  readOnly?: boolean;
  /** Disables + for a reason other than `max`, e.g. a level-up the team
   * can't afford (intent/22). */
  increaseDisabled?: boolean;
  ```
  - With `readOnly`, the `<input>` is replaced by a plain element with
    the same box and the same `aria-label` (e.g. "Felix level"), so it
    keeps its size in the row and its accessible name. The text buffer
    and commit logic are skipped.
  - + is disabled when `atMax || increaseDisabled`. − is unaffected:
    a refund is always allowed.
  - `NumberStepper` stays domain-agnostic: it doesn't know about gold,
    it's only told + is off.
- **Only the level uses them** (intent's Scope). Gold, HP, structure HP,
  token counts and gold piles keep their typed input.

## Layout
- **`HeroCard` (`components/HeroCard/HeroCard.tsx`):** the editable
  branch (when `onLevelChange` is passed, i.e. the Battle Board) gets a
  new optional prop, `canAffordLevelUp?: boolean`, defaulting to true.
  - The level `NumberStepper` gets `readOnly` and
    `increaseDisabled={!canAffordLevelUp}`.
  - **The next cost** shows in the level row, after the stepper: the
    gold icon (`/structures/gold.png`, the one the team gold badge uses)
    and `levelUpCost(hero.id, level)`, so Ken Obi shows his discounted
    price. At level 4 it's not rendered (intent's
    Scope). Its accessible name is e.g. "Next level costs 3 gold". When
    the team can't afford it, it's dimmed to match the disabled +, so
    the cost reads as the reason (intent's Scope: no separate message).
  - The read-only branch (pips and "n/4", used outside the Board) shows
    no cost.
- **`BattleTeamPanel`** computes `canAffordLevelUp(hero.id, team.gold, hero.level)`
  per hero and passes it to each `HeroCard`. Changing gold by hand
  updates every hero's + at once.
- **Fit at 1280x800.** The level row already holds "Lv" and the
  stepper. The cost adds an icon and one digit to that row, and the
  read-only value is no wider than the input it replaces. It must not
  wrap the row or grow the card's height, since the Board's four hero
  cards per side have no spare vertical room. Checked in the browser
  before shipping (Open Items).
- Nothing changes on the Battle Map: it shows team level, not hero
  levels or costs (intent 20).

## UI Design Reference
On the same canvas as intents 01-21 ("BfbHelper — App Flow"):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

**Not drawn yet for this feature.** The "Battle Board" artboard's hero
cards show the level stepper with a typed input and no cost. The read-only
level, the next-cost element and the dimmed unaffordable state should be
drawn there and signed off before they're built (Open Items). Until then,
the Layout section above is the direction.

This is a prototype for visual direction only, the same caveat as earlier
intents' references. If a revised canvas supersedes these choices, it
wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- Draw the read-only level, the next cost and its unaffordable state on
  the canvas's "Battle Board" artboard, and get sign-off before building
  the UI.
- Check in the browser at 1280x800 that the level row doesn't wrap or
  grow the hero card with the cost added.
- Tests:
  - `levelUp.test.ts`: `levelUpCost`, `goldForLevelChange` and
    `canAffordLevelUp`, covering the table above.
  - `useBattle.test.tsx`: a `setHeroLevel (intent/22)` block: a level-up
    pays, a level-down refunds, exactly enough gold works, an
    unaffordable level-up returns the same state (no level, HP or gold
    change, nothing saved), a defeated hero pays and stays at 0 HP, and a
    jump pays each level. Ken Obi pays 1, 2 and 3, refunds the same,
    and levels up from 1 gold. The existing `setHeroLevel (intent/19)` tests
    start at 0 gold, so they need gold set first or they'll hit the
    guard.
  - `NumberStepper` tests: `readOnly` renders no `spinbutton` and keeps
    the label, `increaseDisabled` disables only +.
  - `HeroCard` / `BattleTeamPanel` tests: the cost shows and matches the
    level (and Ken Obi's discount), is hidden at level 4, and + is disabled when the team can't
    afford it.
  - e2e: a new `level-up-gold.spec.ts` following the intent's Proposed
    Outcome, including a reload. The existing `level-up-hp.spec.ts`,
    `arena.spec.ts` and `team-level.spec.ts` level heroes up from 0 gold
    and find the level by its `spinbutton` role, so they need gold set
    first and a new locator for the read-only level.
