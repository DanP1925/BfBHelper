# Plan 11: Shield Tokens

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/11_shield-tokens.md](../intent/11_shield-tokens.md)
> and [../specs/11_shield-tokens.md](../specs/11_shield-tokens.md).
> Check items off in the PR(s) that do the work, same convention as
> [09_death-mark.md](09_death-mark.md).

## Context

The intent and spec are merged (intent in PR #70, spec in PR #71). The
canvas ("BfbHelper — App Flow") has Shield on the "Battle Board" and
"Battle Map" artboards (version 72: leaf green `#84c25e`, heater-shield
icon, "+1 Shield" picker row, no count on any picker row). This plan turns
them into a build checklist that extends the v0.10.0 codebase
(`BattleState` schema 7, `battleReducer`'s `setHeroField`,
`addHeroFieldsStep`, `HERO_SPECIFIC_TOKENS`, `ON_OFF_TOKENS`, `TokenChip`,
`TokenPicker`, `openTokenKey`). There's no new tooling and no new screen.

**Structure: one PR**, like 05. Shield is one counted token, and most of
the diff is the display refactor it needs (`BATTLE_TOKENS`, `TokenChip`'s
accent, no count in the picker). Split by layer, the first PR would ship
nothing to try at the table, so the plan, the data layer, the refactor and
the Shield UI all land together, with one minor bump (→ 0.11.0) at the end
(decided 2026-10-16).

**Parallel-safe split.** The data layer (M1-M8) only touches `lib/`, and
the refactor (M9-M13) only touches `components/` (plus their tests and e2e
specs). Neither imports anything the other adds, so they can be built side
by side. `ShieldTokenIcon` and `--color-shield` (M15-M16) import nothing
either. The Shield wiring (M17-M20) needs all three.

## Architecture

```
frontend/src/
  app/globals.css               # += --color-shield: #84c25e
  app/page.tsx                  # passes battle.setHeroShieldTokens
  lib/
    battle/types.ts             # HeroBattleState += shieldTokens: number; schemaVersion 8
    battle/constants.ts         # += HERO_SHIELD_TOKEN_CEILING = 9
    battle/bounds.ts            # += clampHeroShieldTokens
    battle/reducer.ts           # += SET_HERO_SHIELD_TOKENS (one setHeroField call);
                                #   createInitialHeroState → shieldTokens: 0
    battle/heroSpecificTokens.ts  # HERO_SPECIFIC_TOKENS += shield { cyrus, allies }
    persistence/schema.ts       # CURRENT_BATTLE_SCHEMA_VERSION = 8; += LegacyHeroBattleStateV7,
                                #   LegacyBattleTeamStateV7, PersistedBattleStateV8
    persistence/storage.ts      # += upgradeV7ToV8 = addHeroFieldsStep(8, { shieldTokens: 0 }),
                                #   battleMigrations[7]; validate shieldTokens 0..9
    useBattle.ts                # += setHeroShieldTokens
  components/
    battleTokens.ts             # new: BATTLE_TOKENS (counted + onOff, fixed order)
                                #   += +1 Shield row (M17)
    TokenToggle/onOffTokens.ts  # deleted, replaced by battleTokens.ts
    TokenChip/TokenChip.tsx     # += accent prop → --token-accent
    TokenChip/TokenChip.module.css  # gold → var(--token-accent)
    TokenChip/ShieldTokenIcon.tsx # new: heater shield + diamond, 16px stroke SVG
    TokenPicker/                # TokenPickerOption loses count; "×N" span + CSS deleted
    HeroCard/                   # one loop over BATTLE_TOKENS, countedEntry;
                                #   += shieldTokens?: HeroCardTokenProps
    BattleTeamPanel/            # += onHeroShieldTokensChange?, key `${side}:${id}:shield`
    MapTeamStatusPanel/         # token line loops over BATTLE_TOKENS; .attackTokens →
                                #   .countedToken with --token-accent
    screens/BattleBoardScreen/  # += shieldSide, setHeroShieldTokens forwarded per side
frontend/e2e/
  attack-tokens.spec.ts         # "Add +1 Attack, 3 held" → "Add +1 Attack"
  token-row.spec.ts             # same
  shield-tokens.spec.ts         # new
```

## Milestone Checklist

### Data & state layer

- [x] M1. `lib/battle/types.ts`: `HeroBattleState` += `shieldTokens: number`
      (with the spec's doc comment), `BattleState.schemaVersion: 8`.
- [x] M2. `lib/battle/constants.ts`: += `HERO_SHIELD_TOKEN_CEILING = 9`,
      citing intent 11's Value Bounds. `lib/battle/bounds.ts`: +=
      `clampHeroShieldTokens(value)`, next to `clampHeroAttackTokens`.
- [x] M3. `lib/battle/reducer.ts`: += `SET_HERO_SHIELD_TOKENS { side, heroId,
      value: number }`, one `setHeroField(..., "shieldTokens",
      clampHeroShieldTokens(value))` call with a manual-only comment ("never
      spent on damage, never cleared on defeat"). No visibility check.
      `createInitialHeroState` returns `shieldTokens: 0` (doc comment adds
      "no Shield tokens"), `createInitialBattleState` writes
      `schemaVersion: 8`. `SET_HERO_HP` (including to 0),
      `SET_HERO_POSITION`, every other token action and `PASS_INITIATIVE`
      leave the count alone.
- [x] M4. `lib/persistence/schema.ts`: `CURRENT_BATTLE_SCHEMA_VERSION = 8`.
      += `LegacyHeroBattleStateV7 = Omit<HeroBattleState, "shieldTokens">`,
      and `LegacyHeroBattleStateV6` derives from it. += `LegacyBattleTeamStateV7`;
      `PersistedBattleStateV7.p1/p2` use it, doc comment says it's only the
      source for `battleMigrations[7]`. += `PersistedBattleStateV8`.
- [x] M5. `lib/persistence/storage.ts`: += `upgradeV7ToV8 =
      addHeroFieldsStep<PersistedBattleStateV8>(8, { shieldTokens: 0 })`;
      `battleMigrations` += `7: upgradeV7ToV8`. `saveBattleState`,
      `isValidPersistedBattleState` and the import use
      `PersistedBattleStateV8`. `hasValidBattleTeamShape` requires
      `isNumberInRange(hv.shieldTokens, 0, HERO_SHIELD_TOKEN_CEILING)` (doc
      comment lists it) and doesn't check who's shielded.
      `loadBattleState` returns `schemaVersion: 8`.
- [x] M6. `lib/useBattle.ts`: += `setHeroShieldTokens(side, heroId, value)`,
      same shape as `setHeroAttackTokens`.
- [x] M7. `lib/battle/heroSpecificTokens.ts`: `HERO_SPECIFIC_TOKENS` +=
      `shield: { owner: "cyrus", targets: "allies" }`.
- [x] M8. Fixtures and tests:
      - every hand-written `HeroBattleState` gains `shieldTokens: 0`
        (`reducer.test.ts`, `selectors.test.ts`, `storage.test.ts`,
        `useBattle.test.tsx`, `HeroCard.test.tsx`, `BattleMapScreen.test.tsx`,
        `WinScreen.test.tsx`, plus any `tsc` finds); `storage.test.ts`'s
        older-schema `withoutHeroFields` calls also strip `"shieldTokens"`
      - reducer `SET_HERO_SHIELD_TOKENS`: up and down, clamped at 0 and 9,
        unknown-hero and same-value no-ops, shielding an enemy of Cyrus
        still works (no visibility check); `SET_HERO_HP` to 0,
        `SET_HERO_POSITION`, the other token actions and `PASS_INITIATIVE`
        keep the count
      - storage: v8 round-trip; v7→v8, v6→v8, v5→v8, v4→v8, v3→v8, v2→v8
        and v1→v8 migrations (every hero at 0, everything else unchanged,
        Death Mark, Immobilize, Confuse and +1 Attack kept on v7→v8);
        rejects missing, negative, 10 and non-number `shieldTokens`
      - `useBattle`: `setHeroShieldTokens` updates and persists; reload
        keeps it
      - `heroSpecificTokens.test.ts`: Cyrus on p1 → `"p1"`, on p2 →
        `"p2"`, not drafted → `null`
      - data layer checks: `tsc --noEmit`, ESLint, full Vitest and
        Playwright green (no UI change from M1-M8)
      (No fractional case: `isNumberInRange` doesn't check integers, and
      `attackTokens` accepts a fraction too, so tightening validation was
      left out of scope. Playwright ran once, at the end (M24), not after
      the data layer. Also: a `setHeroHp` to 0 + `passInitiative` test in
      `useBattle`, and a Cyrus-on-either-side test in
      `heroSpecificTokens.test.ts`.)

### Display refactor

- [x] M9. `components/battleTokens.ts` (new): the spec's
      `CountedTokenField`, `OnOffTokenField`, `BattleToken` union and
      `BATTLE_TOKENS`, holding today's four tokens in the fixed order
      (+1 Attack with `AttackTokenIcon`, `var(--color-gold)` and
      `HERO_ATTACK_TOKEN_CEILING`; then Confuse, Immobilize, Death Mark as
      in `ON_OFF_TOKENS`). Delete `components/TokenToggle/onOffTokens.ts`
      and repoint its importers.
- [x] M10. `TokenChip`: += `accent: string`, set inline as `--token-accent`;
      `TokenChip.module.css` reads `var(--token-accent)` for the border,
      fill, icon color and focus ring, like `TokenToggle`. The "×N" stays
      `--color-text`.
- [x] M11. `TokenPicker`: `TokenPickerOption` loses `count`; the "×N" span
      and `.optionCount` CSS are deleted; each row's accessible name is
      always "Add {label}". `disabled` stays.
- [x] M12. `HeroCard` battle variant: `tokenEntries` built by one loop over
      `BATTLE_TOKENS`. A `"counted"` row reads `{ attackTokens }[field]` and
      makes a `countedEntry` (today's +1 Attack code moved into a function
      beside `toggleEntry`, using the row's `Icon`, `label`, `accent`, `max`).
      An `"onOff"` row calls `toggleEntry` as now. A row whose prop is
      absent is skipped. Keys are `field` (`"attack"` → `"attackTokens"`,
      React keys only; `BattleTeamPanel`'s `:attack` open key unchanged).
- [x] M13. `MapTeamStatusPanel`: the token line is one loop over
      `BATTLE_TOKENS`, keeping held ones. A counted token renders as today's
      +1 Attack span (13px icon, count, `aria-label` from
      `tokenCountLabel(n, label)`, `` title={`${label} tokens`} ``), an
      on/off one as today's icon span. `.attackTokens` becomes
      `.countedToken`, colored by `--token-accent` set inline from the
      row's `accent`.
- [x] M14. Tests and checks:
      - `TokenChip`: renders in the passed accent
      - `TokenPicker.test.tsx`: "shows a held count and disables an option
        at its ceiling" keeps only the disabled check; no row shows "×N"
      - `HeroCard`, `BattleMapScreen` and `page.test.tsx`: the existing
        tests pass with only label edits (no "×N" or ", N held" in the
        picker)
      - `e2e/attack-tokens.spec.ts` and `e2e/token-row.spec.ts` look for
        "Add +1 Attack" instead of "Add +1 Attack, 3 held"
      - spec open item: confirm the refactor leaves +1 Attack, Confuse,
        Immobilize and Death Mark unchanged on the Board and the Map
        (same look, labels and order), apart from the picker count
      - `tsc --noEmit`, ESLint, full Vitest and Playwright green before
        Shield is added; manual QA at 1280x800 (`/qa-screens`): the four
        tokens' chips, picker rows and Map icons look as before, the
        +1 Attack chip still gold, picker rows without counts
      Vitest and ESLint were green after the refactor and before Shield;
      Playwright ran at the end (M24). The four existing tokens look and
      read as before at 1280x800; the only change is that no picker row
      shows a count. The +1 Attack chip's `"attack"` React key is now
      `"attackTokens"`; no test selected on it.

### Shield UI

- [x] M15. `app/globals.css`: += `--color-shield: #84c25e`.
- [x] M16. `components/TokenChip/ShieldTokenIcon.tsx` (new): the canvas's
      heater shield with a diamond emblem (the spec's two paths), 16px
      viewBox stroke SVG in `currentColor`, `aria-hidden`, `size` prop
      (12px on the Board, 14px in the picker, 13px on the Map).
- [x] M17. `components/battleTokens.ts`: += the `"+1 Shield"` row after
      Death Mark (`kind: "counted"`, `field: "shieldTokens"`,
      `ShieldTokenIcon`, `label` and `optionLabel` "+1 Shield",
      `var(--color-shield)`, `HERO_SHIELD_TOKEN_CEILING`).
- [x] M18. `HeroCard` battle variant: += optional
      `shieldTokens?: HeroCardTokenProps`, read by the counted loop. Only
      listed when the prop is passed.
- [x] M19. `BattleTeamPanel`: += optional `onHeroShieldTokensChange?(heroId,
      value)`; when present, passes `shieldTokens={{ count, onChange,
      expanded, onExpandedChange }}`, keyed `` `${side}:${hero.id}:shield` ``
      against `openTokenKey`.
- [x] M20. `BattleBoardScreen`: `const shieldSide =
      heroSpecificTokenSide("shield", { p1: p1Heroes, p2: p2Heroes })`; +=
      `setHeroShieldTokens` prop, passed as `onHeroShieldTokensChange` only
      to the panel where `shieldSide === team.side`. `app/page.tsx` passes
      `battle.setHeroShieldTokens`. Map props unchanged.
- [x] M21. Spec open item: is `ShieldTokenIcon` legible at 12px on the
      Board and 13px on the Map, apart from the swords? Check in the
      browser at 1280x800; simplify the drawing (e.g. drop the diamond) if
      it blurs, and update the spec.
      **Reads fine.** At 12px on the Board and 13px on the Map it's a
      distinct green shield, apart from the swords. Canvas drawing kept.
- [x] M22. Spec open item: Board at 1280x800 with an ally of Cyrus who's
      also an enemy of Kunoichi holding all five tokens (×9 on both counted
      ones): the card wraps to two lines and the Board doesn't scroll. Also
      the Map's token line for that hero. Decide in the browser, and
      update the spec.
      **Fits.** Baldwin holding ×9, Confuse, Immobilize, Death Mark and
      ×9 Shield wraps to two lines (row 44px), and the Board doesn't scroll
      at 1280x800 or 2560x1440, including with either ×9 stepper open (the
      Attack stepper pushes Death Mark to the second line). The Map's token
      line for him stays one line in the 170px panel, and the Map fits.
- [x] M23. Tests:
      - `HeroCard`: "+1 Shield" option only when `shieldTokens` is passed,
        after Death Mark, disabled at 9; chip shown while held or open
      - Board wiring (`page.test.tsx`): with Cyrus on p1, only p1's
        pickers offer "+1 Shield" (Cyrus's own included), and with him on
        p2 only p2's; without Cyrus no picker offers it; Cyrus at 0 HP
        still allows Shield; opening the Shield stepper closes an open
        picker or chip
      - `BattleMapScreen`: Shield icon and count only while above 0, after
        Death Mark, in green; token line shown for a hero holding only
        Shield
      - `WinScreen`: no Shield on the cards
      - `e2e/shield-tokens.spec.ts` (new): draft Cyrus, add three "+1
        Shield" to an ally in one picker open, the count survives a
        Board⇄Map switch (shown in the Map panel) and a reload; it stays
        when the ally's HP and Cyrus's HP go to 0; Cyrus's enemies'
        pickers have no "+1 Shield"; stepping to 0 removes the chip on both
        screens
- [x] M24. `tsc --noEmit`, ESLint, full Vitest and Playwright suites green.
- [x] M25. Manual QA at 1280x800 (`/qa-screens`):
      - "+1 Shield" offered only on Cyrus's team, Cyrus included; the green
        chip reads apart from the gold +1 Attack chip, the ice-blue
        Immobilize and the P2 teal; hover and focus outline in green
      - icon readable at 12px and 13px (M21)
      - Board and Map fit with the five-token card (M22)
      - Map Shield icons dimmed on a defeated hero
      - Win Screen cards unchanged
      - an existing schema-7 battle upgrades in place with every hero at
        0 Shield and its Death Mark, Immobilize, Confuse and +1 Attack
        values kept
      - New Draft resets every count
      Checked by script at 1280x800 and 2560x1440: offered on exactly
      Cyrus's 4 heroes (Cyrus included); the green chip reads apart from
      gold, ice blue and the P2 teal; icon legible (M21); Board and Map fit
      (M22); Boreas's Shield dims with his row on the Map at 0 HP; a
      schema-7 save upgrades to 8 with every hero at 0 Shield and Death
      Mark, Immobilize, Confuse and ×9 kept. Not screenshotted: the green
      hover/focus outline (the shared `--token-accent` rule) and New Draft
      (`clearDraft` already clears the stored battle, unchanged here). Win
      Screen covered by `WinScreen.test.tsx`.
- [x] M26. `npm version minor --no-git-tag-version` (→ 0.11.0). In
      `BACKLOG.md`, mark Shield done in Cyrus's entry and the
      hero-specific table (it has no checkbox), linking intent 11 and
      v0.11.0, as intent 09 did for Death Mark.

## Follow-ups / Open Items

- Spec 09 still describes `ON_OFF_TOKENS` and the picker's "×N" count.
  Spec 11 supersedes both, and spec 09 is left as written.
