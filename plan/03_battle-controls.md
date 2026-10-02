# Plan: BfbHelper v3 — Battle Controls

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/03_battle-controls.md](../intent/03_battle-controls.md) and
> [../specs/03_battle-controls.md](../specs/03_battle-controls.md). Written
> before implementation starts — every milestone below is unchecked; check
> items off in the PR(s) that do the actual work, same convention as
> [02_battle-board.md](02_battle-board.md).

## Context

Intent and spec are done and merged (PR #18/#19), plus a reviewed UI
mockup (the "Battle Board — Controls" and "Win Screen" artboards on the
shared "BfbHelper — App Flow" design artifact, right after the static
Battle Board). This plan turns that into a concrete build checklist for
`frontend/`, extending the v2 Battle Board codebase rather than starting
anything new.

No new tooling decisions — same stack as v1/v2 (Next.js static export,
CSS Modules, Vitest + RTL, Playwright for e2e). See
[01_hero-draft-picker.md](01_hero-draft-picker.md)'s Tooling Decisions.

Work proceeds bottom-up: pure logic (`lib/battle/`) → persistence →
`useBattle` hook → leaf components (`NumberStepper`, `ConfirmDialog`,
`OverflowMenu`) → composed components (`HeroCard`, `StructureSlot`,
`BattleTeamPanel`, `BattleBoardScreen`) → new `WinScreen` → `page.tsx`
wiring, with tests added alongside each layer rather than at the end.

One gap the spec's prose glosses over, caught while tracing
`lib/draft/sequence.ts`'s `STEP_SEQUENCE = [1,2,2,2,1]`: both players'
pick arrays become non-empty after only the 2nd overall pick — mid-draft,
long before the draft is "done." A literal "inactive whenever either
heroes array is empty" reading of `useBattle`'s activation rule would make
it activate and start persisting a throwaway `BattleState` partway through
drafting. **Resolution:** gate what `page.tsx` passes into `useBattle` on
`draft.phase === "done"`, not the hook's own emptiness check (see M14).

## Architecture

```
frontend/
  src/
    lib/
      battle/
        types.ts         # new: StructuresState, BattleTeamState, BattleState
        constants.ts      # + HERO_HP_CEILING = 15
        bounds.ts           # new: clamp, clampGold, clampHeroHp, clampHeroLevel, clampStructureHp
        selectors.ts         # new: getBattleWinner
        reducer.ts             # new: battleReducer, createInitialBattleState
      persistence/
        schema.ts               # + BATTLE_STATE_STORAGE_KEY, PersistedBattleStateV1, View type
        storage.ts                # + saveBattleState/loadBattleState; loadBattleView/saveBattleView
                                    #   generalized to loadView/saveView; clearDraft() += battle-state key
      useBattle.ts                  # new: hook mirroring useDraft (hydrate/persist/mutators/winner)
    components/
      NumberStepper/                  # new: -/+ buttons + always-editable number input
      ConfirmDialog/                   # new: framework-free modal (title/body/Cancel/Confirm)
      OverflowMenu/                     # new: ⋯ trigger + generic {label,onSelect,disabled?}[] dropdown
      HeroCard/                          # "battle" variant += hp, onHpChange?, onLevelChange?, defeated styling
      StructureSlot/                      # += onHpChange?, max?, reactiveStyling? (destroyed styling)
      BattleTeamPanel/                      # static props -> team: BattleTeamState + 4 change callbacks
      screens/
        BattleBoardScreen/                   # += battleState/winner/mutators/onEndBattle; footer -> OverflowMenu
        WinScreen/                             # new: two-panel read-only, winner emphasis, "<- New Draft" only
    app/
      page.tsx                                  # view: "results"|"battle"|"win"; useBattle wiring
    e2e/
      draft-to-battle.spec.ts                      # fix: "0 Gold" text assertion, New Draft now in menu
      battle-controls.spec.ts                        # new: Bit-to-0 -> End Battle -> confirm -> Win Screen
```

Key decisions made while planning (spec left these open, or didn't
surface them at all):
- **`lib/battle/` gets its own pure `reducer.ts`**, mirroring
  `lib/draft/reducer.ts` exactly (a `BattleAction` union, no-op-on-
  unchanged-value via reference equality), even though the spec only
  requires "pure clamp-and-replace mutators" and doesn't mandate a
  reducer shape. Matches this codebase's existing taste (pure/testable
  logic decoupled from React) and keeps `useBattle` as thin as `useDraft`.
- **`useBattle`'s hydrate effect depends on derived primitive keys**
  (`p1Heroes.map(h => h.id).join(",")`), not `[p1Heroes, p2Heroes]` by
  reference — `page.tsx` recomputes those arrays fresh every render, so a
  reference-keyed effect would thrash (reset/rehydrate every render).
- **`page.tsx` gates `useBattle`'s inputs on `draft.phase === "done"`**
  rather than passing raw picks arrays — see Context above. Resolves a
  real bug the spec's prose doesn't address, found while planning.
- **`ConfirmDialog` styling** (spec's own open item) — reuse the existing
  bordered-button look (`newDraftLink`) for Cancel and the gold-filled
  look (`startBattleButton`) for Confirm; panel styled like other panels
  (`--color-panel-bg`/`--color-border`); no new design tokens.
- **`NumberStepper` clamps on commit only, no live keystroke blocking**
  (spec's other open item) — out-of-range characters are freely typable;
  only the committed value is constrained, matching the spec's own
  example ("typing '99' settles at 15, not silently rejected").
- **No new RTL test files for already-untested presentational components**
  (`HeroCard`, `StructureSlot`, `BattleTeamPanel`, `BattleBoardScreen`) —
  matches v2's convention of leaning on e2e + a thin `page.test.tsx` for
  screen-level behavior; pure logic and the new interactive leaf
  components (`NumberStepper`/`ConfirmDialog`/`OverflowMenu`) get real
  unit tests instead (see Test Scenarios).

## Milestone Checklist

- [x] M0. `lib/battle/types.ts` (new): `StructuresState`, `BattleTeamState`,
      `BattleState`. `lib/battle/constants.ts`: add `HERO_HP_CEILING = 15`.
- [x] M1. `lib/battle/bounds.ts` (new): `clamp`, `clampGold`,
      `clampHeroHp`, `clampHeroLevel`, `clampStructureHp(value, ceiling)` —
      every mutator and every direct-entry field funnels through these;
      non-finite input falls back to `min`.
- [x] M2. `lib/battle/selectors.ts` (new): `getBattleWinner(state)` —
      `null` unless a side's Bit is at 0, `"draw"` if both are, else the
      side whose Bit is not at 0.
- [x] M3. `lib/battle/reducer.ts` (new): `BattleAction` union
      (`SET_GOLD`/`SET_HERO_HP`/`SET_HERO_LEVEL`/`SET_STRUCTURE_HP`),
      `battleReducer` (clamp-and-replace, no-op on unchanged/unknown
      `heroId`), `createInitialBattleState(p1Heroes, p2Heroes)` (seeds
      each hero's `hp` from `baseHp`, not a flat default).
- [x] M4. `lib/persistence/schema.ts`: add `BATTLE_STATE_STORAGE_KEY`,
      `PersistedBattleStateV1`, and the generalized `View = "results" |
      "battle" | "win"` type.
- [x] M5. `lib/persistence/storage.ts`: `saveBattleState`/
      `loadBattleState` (same parse -> schemaVersion check -> migrate-or-
      reject -> structural-validate -> clear-on-failure pipeline as
      `loadDraft`/`saveDraft`; generic validation only, no hero-id-*set*
      check against a specific draft); parameterize
      `readRaw`/`removeRaw`/`clearAndReturnNull` by key; `clearDraft()`
      additionally removes `BATTLE_STATE_STORAGE_KEY`; replace
      `loadBattleView`/`saveBattleView` with `loadView`/`saveView`
      (3-way, same absence-means-default mechanics).
- [x] M6. `lib/useBattle.ts` (new): hook mirroring `useDraft` — hydrate-
      on-mount/reset-on-empty effect (keyed on derived hero-id-key
      strings, not array references; `eslint-disable-next-line
      react-hooks/exhaustive-deps` with an explanatory comment),
      persist-on-change effect, four mutators (`setGold`/`setHeroHp`/
      `setHeroLevel`/`setStructureHp`), derived `winner`, and a
      standalone exported `heroIdSetsMatch` helper.
- [x] M7. `components/NumberStepper/` (new): `-`/`+` buttons (disable at
      `min`/`max`) + always-editable `<input type="number">` (commit on
      blur/Enter, clamp valid input, revert invalid/empty input without
      calling `onChange`).
- [x] M8. `components/ConfirmDialog/` (new): framework-free modal
      (`role="dialog"` + `aria-modal`), Escape + backdrop-click both act
      as Cancel, default focus on Cancel.
- [x] M9. `components/OverflowMenu/` (new): generic `{label, onSelect,
      disabled?}[]` dropdown behind a ⋯ trigger; closes on Escape,
      outside click, or item selection (closing before firing `onSelect`).
- [x] M10. `components/HeroCard/` `"battle"` variant: `hp`/`onHpChange?`/
      `onLevelChange?` props replace the direct `hero.baseHp` read;
      renders `NumberStepper`s when handlers are present, static
      text/pips otherwise; `hp === 0` always adds "defeated" styling
      (desaturated token + tag).
- [x] M11. `components/StructureSlot/`: `onHpChange?`/`max?`/
      `reactiveStyling?` props; `NumberStepper` when `onHpChange` is
      present; "destroyed" styling (desaturated icon + tag) when
      `reactiveStyling && hp === 0`.
- [x] M12. `components/BattleTeamPanel/`: static-constant props replaced
      with a `team: BattleTeamState` prop + 4 change callbacks
      (`onGoldChange`, `onHeroHpChange`, `onHeroLevelChange`,
      `onStructureHpChange`); gold badge becomes a `NumberStepper`; Tower
      slots get `reactiveStyling`, the Bit slot doesn't (its zero-HP
      state drives the win condition, not a cosmetic class).
- [x] M13. `components/screens/BattleBoardScreen/`: props grow to include
      `battleState`/`winner`/the four mutators/`onEndBattle`; **footer
      removed entirely**, replaced with a corner `OverflowMenu`
      ("New Draft" always, "End Battle" only when `winner !== null`,
      opening a `ConfirmDialog` that calls `onEndBattle` on confirm).
- [x] M14. `components/screens/WinScreen/` (new): two-panel layout
      reusing `BattleBoardScreen`'s grid (not `ResultsScreen`'s
      equal-weight one); read-only `HeroCard`s (no change handlers), no
      Structures section; winning panel gets a gold-glow + "Winner"
      ribbon, losing panel dimmed, neither on a draw; footer has only
      "← New Draft".
- [x] M15. Wire into `app/page.tsx`: move `p1Picks`/`p2Picks` computation
      to unconditional (before any early return); call `useBattle` gated
      on `draft.phase === "done"` (see Context); widen `view` to the new
      3-way `View` type via `loadView`/`saveView`; add the `view ===
      "win"` render branch for `WinScreen`; `BattleBoardScreen`'s
      `onEndBattle` sets+persists `view = "win"`.
- [x] M16. `tsc --noEmit`, `eslint --max-warnings=0`, and the full Vitest
      suite green.
- [x] M17. Update `e2e/draft-to-battle.spec.ts` (the `"0 Gold"` text
      assertion and the "← New Draft" location both break under this
      feature regardless of anything else — required, not optional) and
      add `e2e/battle-controls.spec.ts` (drive a Bit to 0 via its
      stepper, confirm "End Battle" appears in the menu, confirm the
      dialog, assert the Win Screen renders with the right heading).
      `npm run test:e2e` green.
- [ ] M18. Manual click-through at the 13.3" baseline (1280×800 logical
      px, per CLAUDE.md): full flow — draft → results → battle → bump
      HP/level/gold via both tap and typed entry → defeated/destroyed
      styling appears and clears correctly → drive a Bit to 0 → End
      Battle → confirm → Win Screen shows the right winner/draw treatment
      → "New Draft" returns to Start with no stale battle state on the
      next draft. Final visual sign-off against the mockup.

## Test Scenarios

Pure logic (no React):
1. `lib/battle/bounds.test.ts` — floor/ceiling boundaries per clamp
   function; gold has no ceiling; non-finite input falls back to `min`.
2. `lib/battle/selectors.test.ts` — `getBattleWinner`'s `null`/each
   side's win/`"draw"` cases.
3. `lib/battle/reducer.test.ts` — one valid-clamp + one no-op
   (reference-equality) case per action type, including an unknown
   `heroId`; `createInitialBattleState` seeds HP from `baseHp`.

Persistence (`lib/persistence/storage.test.ts`, extended):
4. `saveBattleState`/`loadBattleState` round-trip; corrupt JSON / bad
   `schemaVersion` / out-of-roster hero id / out-of-bounds field all
   clear-and-return-`null`.
5. `clearDraft()` also removes the battle-state key.
6. `loadView`/`saveView` (renamed from `loadBattleView`/`saveBattleView`):
   the new `"win"` case round-trips the same way `"battle"` does;
   `"results"` still clears the key.

Hook (`lib/useBattle.test.tsx`):
7. Inactive (`state === null`) when either heroes array is empty.
8. Fresh-default branch builds from each hero's `baseHp` and persists
   immediately; hydrate branch loads a matching persisted state verbatim
   (a previously-mutated `hp` survives); a hero-id-set mismatch rejects
   the persisted state and rebuilds fresh; transition to empty resets to
   `null`; each mutator persists its result.

New interactive components:
9. `NumberStepper.test.tsx` — ±1 clamped + disabled at bounds; typed
   commit clamps (99 → 15, not rejected); invalid/empty commit reverts
   with zero `onChange` calls.
10. `ConfirmDialog.test.tsx` — Escape and backdrop click both call
    `onCancel`; a click inside the panel doesn't; Confirm/Cancel each
    fire exactly once.
11. `OverflowMenu.test.tsx` — open/close on trigger; selecting an item
    closes the menu and fires `onSelect`; Escape/outside click close
    without firing anything.

`app/page.test.tsx` (extended):
12. The `WinScreen` branch renders when `loadView()` returns `"win"` on
    mount (localStorage pre-seeded), mirroring the existing Start-screen
    test's style.

Existing v1/v2 suites (draft logic, persistence, `useDraft`,
`page.test.tsx`'s Start-screen test) are unaffected except where M4/M5/M15
above touch shared code (`schema.ts`, `storage.ts`, `page.tsx`) — those
changes must not break any already-passing assertion.

## Follow-ups / Open Items

- **M0–M17 done.** `tsc --noEmit`, `eslint --max-warnings=0`, the full
  Vitest suite (144 tests), `next build`'s production typecheck/export,
  and both `e2e/draft-to-battle.spec.ts` (fixed) and the new
  `e2e/battle-controls.spec.ts` all pass.
- **M18 — still open.** Final manual click-through at the 13.3" baseline
  and visual sign-off against the mockup needs a human (or a
  screenshot-capable agent) in an actual browser; not done from this
  session. e2e coverage exercises the same user-facing path
  (draft → battle → drive a Bit to 0 → End Battle → Win Screen) but isn't
  a substitute for eyeballing the real layout/visual treatment.
- **No new deploy step.** Same Vercel static export as v1/v2.
- Per intent 03's own Out of Scope section: no automation beyond the win
  condition (no gold-on-level-up, no HP-from-level, no Tower-to-Bit chip
  damage, no gating logic), no undo/redo or change history, no 3-4 player
  layouts — all deferred to a later intent, same as before.
