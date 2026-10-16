# Plan 12: Stone Tokens

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/12_stone-tokens.md](../intent/12_stone-tokens.md)
> and [../specs/12_stone-tokens.md](../specs/12_stone-tokens.md).
> Check items off in the PR(s) that do the work, same convention as
> [11_shield-tokens.md](11_shield-tokens.md).

## Context

The intent and spec are merged (intent in PR #74, spec in PR #75). The
canvas ("BfbHelper — App Flow") has Stone on the "Battle Board" and
"Battle Map" artboards (version 74: Sedusa replaces Runika on Player 2,
cool stone grey `#a3adb8` (provisional), a coiled-snake icon, a "+1 Stone"
picker row after "+1 Shield"). This plan turns them into a build
checklist that extends the v0.11.1 codebase (`BattleState` schema 8,
`battleReducer`'s `setHeroField`, `addHeroFieldsStep`,
`HERO_SPECIFIC_TOKENS`, `BATTLE_TOKENS` and the table-driven wiring in
`HeroCard`, `BattleTeamPanel`, `BattleBoardScreen` and
`MapTeamStatusPanel`). There's no new tooling and no new screen.

**Structure: one PR**, like 11. Since v0.11.1's token-wiring refactor,
Stone is one stored field plus table rows: no component changes, no
refactor. This plan ships first as its own `docs:` PR, then the data
layer and the Stone UI land together in one build PR, with one minor
bump (→ 0.12.0) at the end.

**Parallel-safe split.** The data layer (M1-M7) only touches `lib/`.
`StoneTokenIcon` and `--color-stone` (M9-M10) import nothing from it, so
they can be built side by side. The `BATTLE_TOKENS` row and `page.tsx`
wiring (M11-M12) need both: `CountedTokenField` widens through
`HeroBattleState`'s new field.

## Architecture

```
frontend/src/
  app/globals.css               # += --color-stone: #a3adb8
  app/page.tsx                  # setHeroToken += stoneTokens: battle.setHeroStoneTokens
  lib/
    battle/types.ts             # HeroBattleState += stoneTokens: number; schemaVersion 9
    battle/constants.ts         # += HERO_STONE_TOKEN_CEILING = 3
    battle/bounds.ts            # += clampHeroStoneTokens
    battle/reducer.ts           # += SET_HERO_STONE_TOKENS (one setHeroField call);
                                #   createInitialHeroState → stoneTokens: 0
    battle/heroSpecificTokens.ts  # HERO_SPECIFIC_TOKENS += stone { sedusa, enemies }
    persistence/schema.ts       # CURRENT_BATTLE_SCHEMA_VERSION = 9; += LegacyHeroBattleStateV8,
                                #   LegacyBattleTeamStateV8, PersistedBattleStateV9
    persistence/storage.ts      # += upgradeV8ToV9 = addHeroFieldsStep(9, { stoneTokens: 0 }),
                                #   battleMigrations[8]; validate stoneTokens 0..3
    useBattle.ts                # += setHeroStoneTokens
  components/
    battleTokens.ts             # CountedTokenField += "stoneTokens";
                                #   BATTLE_TOKENS += +1 Stone row after +1 Shield
    TokenChip/StoneTokenIcon.tsx  # new: coiled snake, 16px stroke SVG
    HeroCard/, BattleTeamPanel/,  # no code change: table-driven since v0.11.1
    screens/BattleBoardScreen/,
    MapTeamStatusPanel/
frontend/e2e/
  stone-tokens.spec.ts          # new
```

## Milestone Checklist

### Data & state layer

- [x] M1. `lib/battle/types.ts`: `HeroBattleState` += `stoneTokens: number`
      (with the spec's doc comment), `BattleState.schemaVersion: 9`.
- [x] M2. `lib/battle/constants.ts`: += `HERO_STONE_TOKEN_CEILING = 3`,
      citing intent 12's Value Bounds (a hero at 3 is defeated and their
      tokens are discarded). `lib/battle/bounds.ts`: +=
      `clampHeroStoneTokens(value)`, next to `clampHeroShieldTokens`.
- [x] M3. `lib/battle/reducer.ts`: += `SET_HERO_STONE_TOKENS { side, heroId,
      value: number }`, one `setHeroField(..., "stoneTokens",
      clampHeroStoneTokens(value))` call with a manual-only comment
      ("reaching 3 doesn't defeat, never cleared on defeat"). No visibility
      check. `createInitialHeroState` returns `stoneTokens: 0` (doc comment
      adds "no Stone tokens"), `createInitialBattleState` writes
      `schemaVersion: 9`. `SET_HERO_HP` (including to 0),
      `SET_HERO_POSITION`, every other token action and `PASS_INITIATIVE`
      leave the count alone.
- [x] M4. `lib/persistence/schema.ts`: `CURRENT_BATTLE_SCHEMA_VERSION = 9`.
      += `LegacyHeroBattleStateV8 = Omit<HeroBattleState, "stoneTokens">`,
      and `LegacyHeroBattleStateV7` derives from it. += `LegacyBattleTeamStateV8`;
      `PersistedBattleStateV8.p1/p2` use it, doc comment says it's only the
      source for `battleMigrations[8]`. += `PersistedBattleStateV9`.
- [x] M5. `lib/persistence/storage.ts`: += `upgradeV8ToV9 =
      addHeroFieldsStep<PersistedBattleStateV9>(9, { stoneTokens: 0 })`;
      `battleMigrations` += `8: upgradeV8ToV9`. `saveBattleState`,
      `isValidPersistedBattleState` and the import use
      `PersistedBattleStateV9`. `hasValidBattleTeamShape` requires
      `isNumberInRange(hv.stoneTokens, 0, HERO_STONE_TOKEN_CEILING)` (doc
      comment lists it) and doesn't check who holds Stone.
      `loadBattleState` returns `schemaVersion: 9`.
- [x] M6. `lib/useBattle.ts`: += `setHeroStoneTokens(side, heroId, value)`,
      same shape as `setHeroShieldTokens`.
- [x] M7. `lib/battle/heroSpecificTokens.ts`: `HERO_SPECIFIC_TOKENS` +=
      `stone: { owner: "sedusa", targets: "enemies" }`.
- [x] M8. Fixtures and tests:
      - every hand-written `HeroBattleState` gains `stoneTokens: 0`
        (`reducer.test.ts`, `storage.test.ts`, `useBattle.test.tsx`,
        `HeroCard.test.tsx`, `BattleMapScreen.test.tsx`,
        `WinScreen.test.tsx`, plus any `tsc` finds); `storage.test.ts`'s
        older-schema `withoutHeroFields` calls also strip `"stoneTokens"`
      - reducer `SET_HERO_STONE_TOKENS`: up and down, clamped at 0 and 3,
        unknown-hero and same-value no-ops, Stone on an ally of Sedusa
        still works (no visibility check); reaching 3 leaves HP and
        position alone; `SET_HERO_HP` to 0, `SET_HERO_POSITION`, the other
        token actions and `PASS_INITIATIVE` keep the count
      - storage: v9 round-trip; v8→v9, v7→v9, v6→v9, v5→v9, v4→v9,
        v3→v9, v2→v9 and v1→v9 migrations (every hero at 0, everything
        else unchanged, Shield, Death Mark, Immobilize, Confuse and +1
        Attack kept on v8→v9); rejects missing, negative, 4 and
        non-number `stoneTokens`
      - `useBattle`: `setHeroStoneTokens` updates and persists; reload
        keeps it
      - `heroSpecificTokens.test.ts`: Sedusa on p1 → `"p2"`, on p2 →
        `"p1"`, not drafted → `null`

### Stone UI

- [x] M9. `app/globals.css`: += `--color-stone: #a3adb8`, with a comment
      like `--color-shield`'s (the rulebook token's stone grey, cooler and
      lighter than `--color-muted`).
- [x] M10. `components/TokenChip/StoneTokenIcon.tsx` (new): the canvas's
      coiled snake (the spec's two paths: oval head, S-shaped body), 16px
      viewBox stroke SVG in `currentColor`, `aria-hidden`, `size` prop
      (12px on the Board, 14px in the picker, 13px on the Map).
- [x] M11. `components/battleTokens.ts`: `CountedTokenField` +=
      `"stoneTokens"` (doc comment cites intent 12). `BATTLE_TOKENS` += the
      `"+1 Stone"` row after Shield (`kind: "counted"`,
      `field: "stoneTokens"`, `StoneTokenIcon`, `label` "+1 Stone",
      `var(--color-stone)`, `HERO_STONE_TOKEN_CEILING`,
      `heroSpecific: "stone"`). The table's doc comment adds Stone to the
      order list.
- [x] M12. `app/page.tsx`: `setHeroToken` += `stoneTokens:
      battle.setHeroStoneTokens`. Check that `HeroCard`, `BattleTeamPanel`,
      `BattleBoardScreen` and `MapTeamStatusPanel` need no edit (the
      spec's claim); note any that did.
      **None did:** `tsc` flagged only test fixtures, and the table-driven
      wiring picked Stone up from its `BATTLE_TOKENS` row.
- [x] M13. Spec open item: does `--color-stone` `#a3adb8` read as a held
      token at 1280x800, not as disabled or muted next to a defeated
      hero's dimming, and apart from Immobilize's ice blue? Decide in the
      browser; adjust on the canvas and in the spec if not.
      **Reads fine, kept.** The grey chip has the same tinted fill and
      border as every held chip, so it reads as held. It sits clearly apart
      from Immobilize's ice blue beside it, and from a defeated hero's
      greyscale portrait.
- [x] M14. Spec open item: is `StoneTokenIcon` legible at 12px on the
      Board and 13px on the Map, apart from the swords and the shield?
      Check in the browser at 1280x800; simplify the snake if it blurs,
      and update the spec.
      **Legible, kept.** It doesn't blur at 12px or 13px and reads apart
      from the swords and the shield. At that size it reads more like a
      script "S" than a snake; the BACKLOG's "Review every token's
      display" item can look at it again with the other icons.
- [x] M15. Spec open item: Board at 1280x800 with the six-token case (an
      ally of Cyrus who's an enemy of both Kunoichi and Sedusa) holding
      +1 Attack ×9, Confuse, Immobilize, Death Mark, Shield ×9 and
      Stone ×3: the card wraps to two lines and the Board doesn't scroll,
      with any stepper open. Also the Map's token line for that hero in
      the 170px panel. Decide in the browser, and update the spec.
      **Fits.** Baldwin with all six wraps to two lines (row 44px: +1
      Attack to Death Mark, then Shield, Stone and "+"), and the Board
      doesn't scroll at 1280x800 or 2560x1440 with the Attack or the Stone
      stepper open. His Map token line stays one line (14px) in the panel.

### Tests & verification

- [x] M16. Tests:
      - `HeroCard`: "+1 Stone" option only when `tokens.stoneTokens` is
        passed, after "+1 Shield", disabled at 3; chip shown while held
        or open, its + disabled at 3
      - Board wiring (`page.test.tsx`): with Sedusa on p1, only p2's
        pickers offer "+1 Stone", and with her on p2 only p1's; Sedusa's
        own card never does; without Sedusa no picker offers it; Sedusa at
        0 HP still allows Stone
      - `BattleMapScreen`: Stone icon and count only while above 0, after
        Shield, in stone grey; token line shown for a hero holding only
        Stone
      - `WinScreen`: no Stone on the cards
      - `e2e/stone-tokens.spec.ts` (new): draft Sedusa, add three "+1
        Stone" to an enemy in one picker open (the row is disabled after
        the third), the count survives a Board⇄Map switch (shown in the
        Map panel) and a reload; it stays when that hero's HP goes to 0
        and when Sedusa's does; Sedusa's team's pickers have no "+1
        Stone"; stepping to 0 removes the chip on both screens
- [x] M17. `tsc --noEmit`, ESLint, full Vitest and Playwright suites green.
      (421 unit tests, 14 e2e specs. A fresh worktree first needs
      `next typegen` for `layout.tsx`'s `LayoutProps`, unrelated to Stone.)
- [x] M18. Manual QA at 1280x800 (`/qa-screens`):
      - "+1 Stone" offered only on Sedusa's enemies, never on her own
        team; the grey chip reads as held, apart from the muted text,
        the defeated dimming and the ice-blue Immobilize (M13); hover and
        focus outline in grey
      - icon readable at 12px and 13px (M14)
      - Board and Map fit with the six-token card (M15)
      - Map Stone icons dimmed on a defeated hero
      - Win Screen cards unchanged
      - an existing schema-8 battle upgrades in place with every hero at
        0 Stone and its Shield, Death Mark, Immobilize, Confuse and +1
        Attack values kept
      - New Draft resets every count
      Checked by a seeded script at 1280x800 and 2560x1440: offered on
      exactly Sedusa's enemies (not Sedusa or Kunoichi, yes on Cyrus);
      color and icon (M13, M14); Board and Map fit (M15); Boreas's Stone
      dims with his row on the Map at 0 HP; a schema-8 save upgrades to 9
      with every hero at 0 Stone and Baldwin's ×9 Attack, Confuse,
      Immobilize, Death Mark and ×9 Shield kept. Not screenshotted: the
      grey hover/focus outline (the shared `--token-accent` rule) and New
      Draft (`clearDraft` already clears the stored battle, unchanged
      here). Win Screen covered by `WinScreen.test.tsx`.
- [x] M19. `npm version minor --no-git-tag-version` (→ 0.12.0). In
      `BACKLOG.md`, mark Stone done in Sedusa's entry and the
      hero-specific table, linking intent 12 and v0.12.0, as intent 11
      did for Shield.
