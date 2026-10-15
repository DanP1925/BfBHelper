# Plan: BfbHelper v9 — Death Mark and token row

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/09_death-mark.md](../intent/09_death-mark.md)
> and [../specs/09_death-mark.md](../specs/09_death-mark.md).
> Check items off in the PR(s) that do the work, same convention as
> [08_immobilize.md](08_immobilize.md).

## Context

The intent and spec are merged (intent in PR #58, spec in PR #60). The
canvas ("BfbHelper — App Flow") has Death Mark on the "Battle Board" and
"Battle Map" artboards (version 62: crimson `#d04a7a`, diagonal dagger
icon) and the redrawn token row with the "+" picker (version 64). This plan
turns them into a build checklist that extends the v8 codebase
(`BattleState` schema 6, `battleReducer`'s `setHeroField`,
`addHeroFieldsStep`, `TokenChip`, `TokenToggle`, `useDismiss`,
`openTokenKey`). There's no new tooling and no new screen.

**Structure: several PRs.** Unlike 07 and 08, this is two changes in one
intent: a new per-hero token (schema bump, reducer, registry, icon, Map)
and a redesign of every hero card's token row (a new `TokenPicker`
popover, held-only chips). Together they're too big to review as one PR,
and the redesign has its own risks (popover clipping, Board height) that
are easier to judge without Death Mark mixed in. Following 04's order:

- **PR A, this plan** (`docs:`), on its own.
- **PR B, data & state layer:** schema 7, `SET_HERO_DEATH_MARKED`,
  `setHeroDeathMarked`, and `heroSpecificTokens.ts`. Nothing visible
  changes yet. Patch bump (→ 0.8.1).
- **PR C, token row redesign** for the three tokens that exist today:
  held-only chips, the "+" and `TokenPicker`. This is the tracer slice: it
  proves the new row end to end (picker, `openTokenKey`, positioning, Board
  height) before Death Mark depends on it. Patch bump (→ 0.8.2).
- **PR D, Death Mark UI:** icon, color, `HeroCard`/Board wiring, the Map
  icon, the e2e test and the intent-closing minor bump (→ 0.9.0).

**Parallel-safe split.** PR B only touches `lib/`, and PR C only touches
`components/` (plus their tests and e2e specs). Neither imports
anything the other adds, so B and C can be built side by side and merged
in either order. Inside PR D, `DeathMarkIcon` and `--color-death-mark`
(M19-M20) import nothing and can be built alongside the wiring, which
needs both B and C.

## Architecture

```
frontend/src/
  app/globals.css               # += --color-death-mark: #d04a7a                        (D)
  app/page.tsx                  # passes battle.setHeroDeathMarked                      (D)
  lib/
    battle/types.ts             # HeroBattleState += deathMarked: boolean; schemaVersion 7 (B)
    battle/reducer.ts           # += SET_HERO_DEATH_MARKED (one setHeroField call);
                                #   createInitialHeroState → deathMarked: false        (B)
    battle/heroSpecificTokens.ts  # new: HERO_SPECIFIC_TOKENS { deathMark }, heroSpecificTokenSide (B)
    persistence/schema.ts       # CURRENT_BATTLE_SCHEMA_VERSION = 7; += LegacyBattleTeamStateV6,
                                #   PersistedBattleStateV7; V4/V5 legacy omit deathMarked (B)
    persistence/storage.ts      # += upgradeV6ToV7 = addHeroFieldsStep(7, { deathMarked: false }),
                                #   battleMigrations[6]; validate typeof deathMarked    (B)
    useBattle.ts                # += setHeroDeathMarked                                 (B)
  components/
    TokenPicker/TokenPicker.tsx   # new: "+" pill + position: fixed popover, useDismiss (C)
    TokenPicker/TokenPicker.module.css  # new                                          (C)
    TokenChip/                  # rendered only while count > 0 || expanded; muted 0 look deleted (C)
    TokenToggle/                # rendered only while on; "off" styles deleted          (C)
    TokenToggle/DeathMarkIcon.tsx # new: diagonal dagger + drop, 16px stroke SVG       (D)
    HeroCard/                   # battle variant: += tokenPicker (C), deathMarked (D);
                                #   one ordered token list builds chips + options     (C)
    BattleTeamPanel/            # += tokenPicker per hero, key `${side}:${id}:picker` (C);
                                #   += showDeathMark, onHeroDeathMarkedChange          (D)
    MapTeamStatusPanel/         # .tokenLine += deathMarked, flex-wrap; += .deathMarked span (D)
    screens/BattleBoardScreen/  # += deathMarkSide, setHeroDeathMarked forwarded per side (D)
frontend/e2e/
  token-row.spec.ts             # new                                                   (C)
  death-mark.spec.ts            # new                                                   (D)
```

## Milestone Checklist

### PR B — Data & state layer

- [ ] M1. `lib/battle/types.ts`: `HeroBattleState` += `deathMarked: boolean`
      (with the spec's doc comment), `BattleState.schemaVersion: 7`.
- [ ] M2. `lib/battle/reducer.ts`: += `SET_HERO_DEATH_MARKED { side, heroId,
      value: boolean }`, one `setHeroField(..., "deathMarked", value)` call
      with a manual-only comment like the Confuse and Immobilize branches.
      No visibility check. `createInitialHeroState` returns
      `deathMarked: false` (doc comment adds "unmarked"),
      `createInitialBattleState` writes `schemaVersion: 7`. `SET_HERO_HP`
      (including to 0), `SET_HERO_POSITION`, `SET_HERO_ATTACK_TOKENS`,
      `SET_HERO_CONFUSED`, `SET_HERO_IMMOBILIZED` and `PASS_INITIATIVE`
      leave the flag alone.
- [ ] M3. `lib/persistence/schema.ts`: `CURRENT_BATTLE_SCHEMA_VERSION = 7`.
      += `LegacyBattleTeamStateV6` (heroes without `deathMarked`);
      `PersistedBattleStateV6.p1/p2` use it, doc comment says it's only the
      source for `battleMigrations[6]`. `LegacyBattleTeamStateV4` omits
      `"confused" | "immobilized" | "deathMarked"`, `LegacyBattleTeamStateV5`
      omits `"immobilized" | "deathMarked"`. += `PersistedBattleStateV7`.
- [ ] M4. `lib/persistence/storage.ts`: += `upgradeV6ToV7 =
      addHeroFieldsStep<PersistedBattleStateV7>(7, { deathMarked: false })`;
      `battleMigrations` += `6: upgradeV6ToV7`. `saveBattleState` writes
      `PersistedBattleStateV7`.
- [ ] M5. `storage.ts` validation: `hasValidBattleTeamShape` requires
      `typeof deathMarked === "boolean"` on every hero (doc comment lists
      it), and doesn't check who's marked. `loadBattleState` returns
      `schemaVersion: 7`.
- [ ] M6. `lib/useBattle.ts`: += `setHeroDeathMarked(side, heroId, value)`,
      same shape as `setHeroImmobilized`.
- [ ] M7. `lib/battle/heroSpecificTokens.ts` (new): `HeroSpecificTarget`,
      `HERO_SPECIFIC_TOKENS = { deathMark: { owner: "kunoichi", targets:
      "enemies" } }` (`as const satisfies …`), `HeroSpecificTokenId`, and
      `heroSpecificTokenSide(token, rosters)`: the owner's side from the
      rosters, `otherPlayer` of it for `"enemies"`, the side itself for
      `"allies"`, `null` when the owner wasn't drafted. Pure, reusing
      `otherPlayer` from `lib/draft/selectors.ts`.
- [ ] M8. Fixtures bumped to schema 7 with `deathMarked: false`
      (`storage.test.ts`, `selectors.test.ts`, `useBattle.test.tsx`,
      `BattleMapScreen.test.tsx`, `WinScreen.test.tsx`, `reducer.test.ts`'s
      `createInitialHeroState` expectations, and any other test that builds
      a `HeroBattleState`). New tests for:
      - reducer `SET_HERO_DEATH_MARKED`: on and off, unknown-hero and
        same-value no-ops, marking an ally of Kunoichi still works (no
        visibility check); `SET_HERO_HP` to 0, `SET_HERO_POSITION`,
        `SET_HERO_CONFUSED`, `SET_HERO_IMMOBILIZED` and `PASS_INITIATIVE`
        keep the flag
      - storage: v7 round-trip; v6→v7, v5→v7, v4→v7, v3→v7, v2→v7 and
        v1→v7 migrations (every hero unmarked, everything else unchanged,
        Immobilize and Confuse flags and attack tokens kept on v6→v7);
        rejects missing and non-boolean (`0`, `"true"`) `deathMarked`
      - `useBattle`: `setHeroDeathMarked` updates and persists; reload
        keeps it
      - `heroSpecificTokens.test.ts` (new): Kunoichi on p1 → `"p2"`, on p2
        → `"p1"`, not drafted → `null`; an `"allies"` row (test-only
        table or a cast) returns the owner's side
- [ ] M9. PR B checks: `tsc --noEmit`, ESLint, full Vitest and Playwright
      green (no UI change, so existing e2e must pass untouched). Patch bump
      (→ 0.8.1).

### PR C — Token row redesign

- [ ] M10. `components/TokenPicker/TokenPicker.tsx` (new) and its CSS
      module, with the spec's `TokenPickerOption` / `TokenPickerProps`:
      - the "+" is a 20px dashed pill, muted until hover or open, with
        `aria-expanded`, `aria-haspopup="true"`, `aria-label`
        `` `Add a token to ${heroName}` `` and title "Add a token". Always
        rendered
      - the popover lists one `<button>` row per option (14px icon in the
        option's accent, then the label), min 160px wide, 32px rows,
        `--color-panel-bg`, border and shadow, as on canvas v64
      - a pick calls `onPick` and the popover stays open
      - `useDismiss` closes it on an outside tap, a second "+" tap or
        Escape, with focus back on "+"
      - `position: fixed` from the "+" rect at open: below, flipped above
        when there's no room, clamped to the viewport, z-index above the
        Board panels; closes on scroll or resize
      Generic: no token names in the component.
- [ ] M11. `TokenChip`: rendered only while `count > 0 || expanded` (stays
      while its stepper is open at 0, gone once it closes at 0). Delete the
      muted "0, collapsed" styles.
- [ ] M12. `TokenToggle`: only ever rendered lit; a tap calls
      `onChange(false)`. Props, `aria-pressed` and label unchanged; tooltip
      gains "(tap to remove)" as on the canvas, if the label tests allow
      it without changing accessible names. Delete the "off" look and its
      hover styles.
- [ ] M13. `HeroCard` battle variant: += `tokenPicker?: { expanded,
      onExpandedChange }`. `.tokenRow` renders when `tokenPicker` is
      provided. One ordered list of token entries (+1 Attack, Confuse,
      Immobilize) builds both the held chips and the picker options:
      +1 Attack always an option, label "+1 Attack ×N" once held, disabled
      at `HERO_ATTACK_TOKEN_CEILING`, adding 1 per tap; on/off tokens an
      option only while off. "+" last. `.tokenRow` wraps. `WinScreen`
      passes neither prop and stays unchanged.
- [ ] M14. `BattleTeamPanel`: passes `tokenPicker` per hero, keyed
      `` `${side}:${hero.id}:picker` `` against `openTokenKey`, next to
      `attackTokenKey`, so one picker or chip is open across both panels.
      `BattleBoardScreen` and `page.tsx` don't change in this PR.
- [ ] M15. Spec open item: the picker isn't clipped and doesn't scroll the
      Board at 1280x800, including on a bottom-row card, where it flips
      above the "+". Also check that no ancestor's `transform` or `filter`
      breaks `position: fixed` (`HeroCard`'s `.tokenDefeated` filter is on
      the portrait; confirm it stays off the row's ancestors), and add a
      portal only if one does. Decide in the browser.
- [ ] M16. Spec open item: Board height at 1280x800 with one card holding
      all three of today's tokens plus an open ×9 stepper in each panel.
      Does that row wrap, and does the Board still fit without scrolling?
      If even one wrap scrolls the Board, rethink the row (e.g. "+" as an
      icon alone) before PR D, and update the spec.
- [ ] M17. Tests:
      - `TokenPicker.test.tsx` (new): "+" always rendered with its
        aria-label; opening lists the options in order; a pick calls
        `onPick` and stays open; a disabled option doesn't fire; Escape,
        an outside click and a second "+" click close it and return focus
      - `TokenChip`: hidden at 0 when collapsed, kept at 0 while expanded;
        the muted-zero case removed
      - `TokenToggle`: the "off" rendering case removed; a tap sends
        `false`
      - `HeroCard`: an empty row shows only "+"; held chips in the fixed
        order whatever order they were set; on/off options drop out once
        held; +1 Attack option shows "×N" and disables at 9; no row without
        `tokenPicker` (`WinScreen`)
      - Board wiring (`page.test.tsx`): add each token through "+", remove
        an on/off chip in one tap, step +1 Attack to 0 and the chip goes;
        opening a picker closes an open chip or another picker
      - existing `attack-tokens`, `confuse-tokens` and `immobilize` e2e
        specs updated to add tokens through "+" instead of tapping a muted
        control
      - `e2e/token-row.spec.ts` (new): a fresh hero shows only "+"; add
        three +1 Attack in one open (picker stays open), Confuse and
        Immobilize; the row survives a Board⇄Map switch and a reload;
        tap Confuse off; Escape and an outside tap close the picker
- [ ] M18. PR C checks: `tsc --noEmit`, ESLint, full Vitest and Playwright
      green; manual QA at 1280x800 (`/qa-screens`):
      - empty card shows just "+", typical 0-3-token rows stay one line
      - picker opens over the Board on top-row and bottom-row cards
        (M15), stays open across picks, closes three ways
      - Board height with wrapped cards (M16)
      - hover and focus outlines on "+", picker rows and the lit chips
      - Win Screen cards unchanged
      Patch bump (→ 0.8.2).

### PR D — Death Mark UI

- [ ] M19. `app/globals.css`: += `--color-death-mark: #d04a7a`.
- [ ] M20. `components/TokenToggle/DeathMarkIcon.tsx` (new): the diagonal
      dagger (blade up and right, short crossguard, handle down-left) with
      one drop under the tip, 16px-viewBox stroke SVG in `currentColor`,
      `aria-hidden`, `size` prop (12px on the Board, 13px on the Map). Copy
      the canvas's drawing (v62).
- [ ] M21. `HeroCard` battle variant: += optional
      `deathMarked?: HeroCardToggleProps`, as the fourth entry in the
      ordered token list (after Immobilize), with `DeathMarkIcon`,
      `label="Death Mark token"` and `accent="var(--color-death-mark)"`.
      Only listed when the prop is passed.
- [ ] M22. `BattleTeamPanel`: += `showDeathMark: boolean` and
      `onHeroDeathMarkedChange(heroId, value)`; passes
      `deathMarked={{ on, onChange }}` only when `showDeathMark`.
- [ ] M23. `BattleBoardScreen`: `const deathMarkSide =
      heroSpecificTokenSide("deathMark", { p1: p1Heroes, p2: p2Heroes })`,
      `showDeathMark={deathMarkSide === team.side}` per panel; +=
      `setHeroDeathMarked` prop, forwarded per side. `app/page.tsx` passes
      `battle.setHeroDeathMarked`. Map props unchanged.
- [ ] M24. `MapTeamStatusPanel`: `.tokenLine` renders when
      `attackTokens > 0 || confused || immobilized || deathMarked`, gains
      `flex-wrap: wrap` with a 2px row gap. New span after Immobilize: the
      13px `DeathMarkIcon` alone, `aria-label="Death Mark"`,
      `title="Death Mark token"`, new `.deathMarked` class
      (`color: var(--color-death-mark)`). Inside the row, so `.dimmed`
      covers it. No roster logic.
- [ ] M25. Spec open item: is the dagger legible at 12px on the Board and
      13px on the Map? Check in the browser at 1280x800; simplify the
      drawing (e.g. drop the drop) if it blurs, and update the spec.
- [ ] M26. Spec open item: Map at 1280x800 with every hero holding
      +1 Attack ×9, Confuse and Immobilize, and
      every enemy of Kunoichi also marked. Every token line should stay
      one line in the 170px panel and the page shouldn't scroll. Decide in
      the browser.
- [ ] M27. Tests:
      - `HeroCard`: Death Mark option only when `deathMarked` is passed,
        after Immobilize; chip shown when on, a tap sends `false`
      - Board wiring (`page.test.tsx`): with Kunoichi on p1, only p2's
        pickers offer Death Mark, and with her on p2 only p1's; without
        Kunoichi no picker offers it; marking one hero leaves the others
        and its other tokens alone; Kunoichi at 0 HP still allows marks
      - `BattleMapScreen`: Death Mark icon only while marked; token line
        shown for a hero with the Death Mark alone
      - `WinScreen`: no Death Mark on the cards
      - `e2e/death-mark.spec.ts` (new): draft Kunoichi, mark an enemy
        through "+", the icon survives a Board⇄Map switch (shown in the
        Map panel) and a reload; the mark stays when the marked hero's HP
        and Kunoichi's HP go to 0; Kunoichi's allies' pickers have no
        Death Mark; tapping the chip clears it on both screens
- [ ] M28. `tsc --noEmit`, ESLint, full Vitest and Playwright suites green.
- [ ] M29. Manual QA at 1280x800 (`/qa-screens`):
      - Death Mark offered only on Kunoichi's enemies, crimson pill reads
        apart from the HP red, the P1 color and the purple Confuse pill;
        hover and focus outline in crimson
      - dagger readable at 12px and 13px (M25)
      - Board still fits with Death Mark held on a heavy card (M16 again)
      - Map panel Death Mark icons, dimmed on a defeated hero, fit (M26)
      - Win Screen cards unchanged
      - an existing schema-6 battle upgrades in place with no hero marked
        and its Immobilize, Confuse and +1 Attack values kept
      - New Draft resets every mark
- [ ] M30. `npm version minor --no-git-tag-version` (→ 0.9.0) in the same
      PR. In `BACKLOG.md`, mark Death Mark done in Kunoichi's entry and the
      hero-specific table (it has no checkbox), linking intent 09 and
      v0.9.0, as `4b88f58` did for Immobilize.
