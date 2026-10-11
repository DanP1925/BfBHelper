# Spec: BfbHelper v5 — Initiative Indicator

> **DRAFT.** Architecture for intent 05's scope. Build-out has not started
> yet. See [../intent/05_initiative-indicator.md](../intent/05_initiative-indicator.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as v1-v4: React + TypeScript, Next.js,
  static build, no backend.
- No new screen. One new component, `InitiativeBadge`, goes in the top
  bar that `BattleBoardScreen` and `BattleMapScreen` already share
  (`ViewToggle` + `OverflowMenu`).
- No new store or storage key. Per intent's Affected Systems, the
  initiative holder is one new field on the same persisted `BattleState`
  intents 03-04 already read, write and reload. That makes this a battle
  schema bump (2 → 3) with an in-place migration, the same approach
  intent 04 used.

## State Management
- `useBattle` (`frontend/src/lib/useBattle.ts`) gains a third parameter:
  `useBattle(p1Heroes, p2Heroes, startingInitiative: PlayerId | null)`.
  `page.tsx` passes `draft.initiative` when `draft.phase === "done"` and
  `null` otherwise, the same gating it already applies to the heroes
  arrays. It's only read when a **fresh** battle is built
  (`createInitialBattleState`). A persisted battle that loads keeps its
  own stored `initiative`, so passing initiative mid-battle and reloading
  never snaps it back to the coin-flip winner.
  - `draft.initiative` can't change while a draft is `"done"` (only a new
    draft changes it, and that clears battle state), so it's not added
    to the hydrate effect's dependency keys.
- One new mutator on `UseBattleResult`: `passInitiative: () => void`.
  No arguments: per intent's Rules section, initiative always goes to
  the other player, so there's no "set to p1/p2" form. A plain
  `useCallback` dispatching `PASS_INITIATIVE` into `battleReducer`, same
  shape as the existing mutators.
- `clearDraft()` already removes the persisted `BattleState`, so a new
  draft resets initiative with everything else (intent's Session
  Lifecycle). No change needed there.

## Data Model
- `frontend/src/lib/battle/types.ts`: `BattleState` goes to schema
  version 3 with one new top-level field:
  ```ts
  export type BattleState = {
    schemaVersion: 3;
    p1: BattleTeamState;
    p2: BattleTeamState;
    goldPiles: Record<GoldPileSpaceId, number>;
    /** Who holds the initiative marker right now. Starts on the draft's
     * coin-flip winner and flips on every PASS_INITIATIVE. */
    initiative: PlayerId;
  };
  ```
  Top-level rather than per-team, since it's one marker shared between
  the two players, like `goldPiles`.
- `frontend/src/lib/persistence/schema.ts`:
  `CURRENT_BATTLE_SCHEMA_VERSION = 3`. New `PersistedBattleStateV3`
  (`PersistedBattleStateV2` plus `initiative: PlayerId`, with
  `schemaVersion: 3`). `PersistedBattleStateV2` stays as the source shape
  for the new migration, the same way `LegacyBattleTeamStateV1` stays
  for `battleMigrations[1]`. `CURRENT_DRAFT_SCHEMA_VERSION` doesn't
  change (the split from specs/04 is what makes that possible).
- `createInitialBattleState(p1Heroes, p2Heroes, initiative)`
  (`frontend/src/lib/battle/reducer.ts`) takes the starting holder and
  sets `initiative` on the fresh state.
- `saveBattleState` / `loadBattleState` (`storage.ts`) write and copy
  `initiative` alongside `p1`/`p2`/`goldPiles`.
- **Validation:** `isValidPersistedBattleState` additionally requires
  `initiative` to be `"p1"` or `"p2"`. Anything else fails the whole
  payload, same clear-on-failure convention as today.
- **Migration.** `loadPersisted` runs exactly **one** migration step
  (`migrations[schemaVersion]`, then validates against the current
  shape). It doesn't chain. So:
  - New `battleMigrations[2]`: upgrades a schema-2 payload to schema 3
    by adding `initiative`.
  - `battleMigrations[1]` now has to land on schema 3 too: it runs its
    existing v1 → v2 upgrade, then passes the result through the v2 → v3
    step. Pull both steps out as named functions (`upgradeV1ToV2`,
    `upgradeV2ToV3`) so `[1]` composes them and `[2]` is just the second.
  - **Where the default comes from.** Intent's Constraints default the
    new field to `draft.initiative`, which is persisted next to the
    battle under its own key. `upgradeV2ToV3` reads it with the existing
    `loadDraft()` and uses `loadDraft()?.initiative`. If there's no valid
    draft, it returns `null`, and the battle is cleared as unmigratable.
    That case can't happen in practice: `useBattle` only loads battle
    state once the draft is `"done"`, and `clearDraft` removes both keys
    together.
  - Everything else (`p1`, `p2`, `goldPiles`) passes through unchanged.
    If the default is wrong for a battle already a few rounds in,
    players fix it with one tap on the badge (intent's Constraints).

## Initiative Logic
- New `BattleAction` variant in `battleReducer`:
  `{ type: "PASS_INITIATIVE" }`. Returns a new state with `initiative`
  set to the other player and every other field untouched. Reuse
  `otherPlayer` from `lib/draft/selectors.ts` (currently module-private,
  so export it) rather than writing a second copy.
- No other action reads or changes `initiative`, and `PASS_INITIATIVE`
  changes nothing else. No gold income, level-ups, token expiry or round
  counting, per intent's Out of Scope ("Passing initiative changes only
  the initiative holder").
- No confirm dialog, undo stack or cooldown. A wrong tap is fixed with a
  second tap, since passing twice returns to the starting state.

## Layout
- **`InitiativeBadge`** (new, `frontend/src/components/InitiativeBadge/`,
  with a `.module.css` and a test file like `ViewToggle`):
  - Props: `holder: PlayerId`, `onPass: () => void`.
  - One `<button type="button">`. It reads as a control, not a label,
    which the intent requires since there's no separate pass button:
    - no visible "Initiative" caption, to keep the badge compact. The
      word is still in the `aria-label`, and a `title` tooltip with the
      same text shows it on hover,
    - the holder's name, "Player 1" or "Player 2" (same strings as
      `DraftBoardScreen`'s `initiativeLabel`), in `--color-p1` or
      `--color-p2`, bold,
    - a two-arrow swap icon after the name (inline SVG, `aria-hidden`,
      as in the mockup),
    - a border tinted with the holder's team color, plus the same hover
      style as `ViewToggle`'s buttons so it matches the controls next to
      it, and a visible `:focus-visible` outline.
  - `aria-label`: "Initiative: Player 1. Pass to Player 2." (or the
    reverse), so screen readers hear both who holds it and what tapping
    does.
  - Clicking calls `onPass`. The badge has no internal state; it
    re-renders from `holder`.
  - Fixed at 32px tall, the same as the ⋯ button and no taller than
    `ViewToggle`, so the top bar's height doesn't change,
    and the Map's board area and the Board's team panels keep the
    vertical space they have on the 13.3" laptop (1280x800 CSS px).
- **Placement:** both screens' `.topBar` is a `space-between` flex row
  with `ViewToggle` on the left and `OverflowMenu` on the right. Put
  the badge top right: wrap `InitiativeBadge` and `OverflowMenu` in one
  right-hand group (a flex row with a small gap), with the badge just
  left of the ⋯ button. `ViewToggle` stays alone on the left. Same
  position on both screens, so switching Board ⇄ Map doesn't move it.
  The menu's dropdown is anchored to the top bar's right edge, so it
  still opens under the ⋯ button.
- **Screen props:** `BattleBoardScreen` and `BattleMapScreen` each gain
  `onPassInitiative: () => void`, which `page.tsx` wires to
  `battle.passInitiative`. The holder comes from the `battleState` prop
  they already take (`battleState.initiative`), so there's no separate
  `initiative` prop.
- **Not shown** on `ResultsScreen` (before the battle starts) or
  `WinScreen` (after it ends). `DraftBoardScreen`'s own initiative
  subtitle doesn't change (intent's Affected Systems).

## UI Design Reference
No new artboard. The badge was added to the two existing battle
artboards in the same Claude design artifact as intents 01-04
("BfbHelper — App Flow"):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK
- **"Battle Board — Controls"** and **"Battle Map"**: each top bar now
  has the initiative badge at the top right, just left of the ⋯ menu
  button. It's a
  pill the same height as the toggle, with the holder's name in their
  team color (no visible "Initiative" caption, only a hover tooltip), a
  two-arrow swap icon (inline SVG), and a border in the holder's color.
  Clicking it passes initiative, so the flip can be tried in the
  prototype.
- Each artboard keeps its own prototype state, so initiative doesn't
  carry over when you follow the Board/Map links between them. The app
  shares one value across both screens (State Management above).

This is a prototype for visual direction only, same caveat as earlier
intents' references. It settles the swap-icon open question in favor of
an inline SVG. If a revised mockup supersedes these choices, it wins over
what's written here.

## Deployment
No change from v1-v4: same static Vercel deployment, no new infra.

## Open Items for Implementation
- ~~Whether the badge also gets a team-color background tint on top of
  the border.~~ **Decided: no tint.** Checked in the browser at
  1280x800: the team-color border and name already read clearly, and an
  unfilled pill matches the ⋯ button next to it.
