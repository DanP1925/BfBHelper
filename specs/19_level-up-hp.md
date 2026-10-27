# Spec 19: Level-Up HP

> **DRAFT.** Architecture for intent 19's scope. Build-out has not started
> yet. See [../intent/19_level-up-hp.md](../intent/19_level-up-hp.md) for
> the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-18: React + TypeScript,
  Next.js, static build, no backend.
- **The bump lives in `useBattle.setHeroLevel`, not in the reducer.**
  The mutator dispatches `SET_HERO_LEVEL`, then `SET_HERO_HP` with the
  bumped value, in the same `setState` update. This is the pattern
  `setHeroHp` already uses for a defeat: two single-field reducer
  actions triggered together by one user action, not a combined reducer
  action (intent/04). `battleReducer` keeps one field per action.
- **One new pure rules module, `lib/battle/levelUp.ts`,** holding the HP
  rule, like `iceWall.ts` and `bearTrap.ts` hold theirs. The mutator only
  composes it.
- **No persisted shape changes** (intent's Constraints). The bumped HP is
  ordinary `hp`, and the battle schema stays at 15.
- **What doesn't change:** `battleReducer`'s actions and clamps,
  `HERO_HP_CEILING` (still 15, intent's Scope), the persistence schema
  and validation, `HeroCard` and its `NumberStepper`s, `BattleTeamPanel`,
  `BattleBoardScreen`, `page.tsx`, the Battle Map, `ResultsScreen`,
  `WinScreen`, and `setHeroHp` (HP stays editable by hand, intent's
  Scope).

## State Management
- **`useBattle` (`frontend/src/lib/useBattle.ts`):** `setHeroLevel`
  keeps its signature, `(side, heroId, value) => void`. Its body becomes:
  ```ts
  setState((prev) => {
    if (prev === null) return prev;
    const before = prev[side].heroes[heroId];
    const afterLevel = battleReducer(prev, { type: "SET_HERO_LEVEL", side, heroId, value });
    if (afterLevel === prev || !before) return afterLevel;
    const levelDelta = afterLevel[side].heroes[heroId].level - before.level;
    const hp = hpAfterLevelChange(before.hp, levelDelta);
    return battleReducer(afterLevel, { type: "SET_HERO_HP", side, heroId, value: hp });
  });
  ```
  - **The delta is measured after the level clamp.** Typing 9 into the
    level input of a level-3 hero lands on 4, so it's +1 level and +1 HP,
    not +6. Typing 4 into a level-1 hero is +3 levels and +3 HP (intent's
    Scope: "One step, one HP" per level moved).
  - **A no-op stays a no-op.** If the level doesn't change (already at
    the bound, or an unknown hero), the state reference is returned
    unchanged, so nothing is saved.
  - **It dispatches the reducer's `SET_HERO_HP`, not the `setHeroHp`
    mutator,** so the defeat move (HP at 0 → respawn area) can't fire
    from a level change. `hpAfterLevelChange` never returns 0 for a
    living hero anyway.
- **Nothing else changes HP from level.** `setHeroHp` doesn't change
  level, and no other mutator reads level.
- `page.tsx` and the screens already pass `battle.setHeroLevel` through,
  so no wiring changes.

## Data Model
- No new types, fields or reducer actions.
- **No schema change** (intent's Constraints). `CURRENT_BATTLE_SCHEMA_VERSION`
  stays 15, and existing saved battles load as they are. A saved hero's
  HP that wasn't bumped before this ships stays as saved: the app doesn't
  backfill old level-ups.
- **Doc comments that go stale:**
  - `battleReducer`'s comment (`reducer.ts`) says no mutator changes a
    second field, "no HP-from-level". The reducer still holds to that,
    so the comment should say the HP-from-level bump is composed in
    `useBattle.setHeroLevel` (intent/19), like the defeat move.
  - `HERO_HP_CEILING`'s comment (`constants.ts`) says "level and HP stay
    independently adjustable". It becomes: the flat ceiling doesn't
    recalculate off level (intent/19 keeps it), though a level change
    now moves HP.

## Level-Up HP Logic
In `frontend/src/lib/battle/levelUp.ts`, pure and unit-tested in
`levelUp.test.ts`:

```ts
/** A hero's HP after their level moves by `levelDelta` (intent/19).
 * +1 HP per level gained and -1 per level lost. A defeated hero (0 HP)
 * stays at 0 either way, and a level-down never takes a living hero
 * below 1 HP: it's a correction, not damage, so it never defeats them.
 * The flat HERO_HP_CEILING is applied by the reducer's SET_HERO_HP. */
export function hpAfterLevelChange(hp: number, levelDelta: number): number {
  if (hp === 0) return 0;
  return Math.max(1, hp + levelDelta);
}
```

Cases, per intent's Scope and Proposed Outcome:

| HP before | Level change | HP after | Why |
|---|---|---|---|
| 6 | 1 → 2 | 7 | Level up, HP up |
| 7 | 2 → 1 | 6 | Level down undoes it |
| 6 | 1 → 4 (typed) | 9 | One HP per level moved |
| 0 | 1 → 2 | 0 | Defeated: no bump |
| 0 | 2 → 1 | 0 | Defeated: no bump |
| 1 | 2 → 1 | 1 | Level-down never defeats |
| 15 | 3 → 4 | 15 | Ceiling, clamped by the reducer |
| 15 | 4 → 3 | 14 | Not an exact undo at the ceiling |

The last row is accepted: only a hero healed past their real max
(base + level) can reach 15, since the largest real max is 14 (intent's
Scope).

## Layout
- **No layout change.** The level stepper and the HP badge already sit
  together on each `HeroCard`, so the HP number changing next to the
  level is the feedback. No highlight or animation (intent's
  Constraints left this to the spec/design, and nothing is needed to
  notice a number one row above the control just used).
- Nothing changes on the Battle Map: its status panels read the same
  `hp`.

## UI Design Reference
On the same canvas as intents 01-18 ("BfbHelper — App Flow", version
94): https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

- **The "Battle Board" artboard,** whose hero cards already show the HP
  badge and level stepper this feature drives. Nothing new is drawn.
- **Its prototype now applies the bump** (version 94). The artboard's
  level buttons and level input move HP by the levels actually moved,
  leave a 0-HP hero at 0, and never take a living hero below 1 on a
  level-down, matching Level-Up HP Logic. HP's own controls are
  unchanged.
- If visual feedback for the bump is wanted later, it's drawn there
  first.

This is a prototype for visual direction only, the same caveat as earlier
intents' references. If a revised canvas supersedes these choices, it
wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- Check in the browser that the HP change is noticeable enough without
  feedback, on the 1280x800 Board. If it isn't, draw a highlight on the
  canvas before building one.
- Tests: `levelUp.test.ts` covers the table above. `useBattle.test.tsx`
  gains a `setHeroLevel (intent/19)` block: level up and down move HP, a
  typed jump moves HP by the clamped delta, a no-op level write returns
  the same state, a 0-HP hero stays put in its respawn area, and a 1-HP
  level-down leaves the hero alive on its space. The existing "setHeroLevel
  … leave Arena positions alone" test must still pass.
