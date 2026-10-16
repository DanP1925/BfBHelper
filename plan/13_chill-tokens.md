# Plan 13: Chill Tokens

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/13_chill-tokens.md](../intent/13_chill-tokens.md)
> and [../specs/13_chill-tokens.md](../specs/13_chill-tokens.md).
> Check items off in the PR(s) that do the work, same convention as
> [12_stone-tokens.md](12_stone-tokens.md).

## Context

The intent and spec are merged (intent in PR #78, spec in PR #79). The
canvas ("BfbHelper — App Flow") has Chill on the "Battle Board" and
"Battle Map" artboards (version 76: Dazeem replaces Sterling on Player 2,
frost cyan `#5ccfe6` (provisional), a snowflake icon, a "+1 Chill" picker
row after "+1 Stone"). This plan turns them into a build checklist that
extends the v0.12.0 codebase (`BattleState` schema 9, `battleReducer`'s
`setHeroField`, `addHeroFieldsStep`, `HERO_SPECIFIC_TOKENS`,
`BATTLE_TOKENS` and the table-driven wiring in `HeroCard`,
`BattleTeamPanel`, `BattleBoardScreen` and `MapTeamStatusPanel`). There's
no new tooling and no new screen.

**Structure: one build PR**, like 12, after this plan ships as its own
`docs:` PR. Per the spec (decided 2026-10-17), the build PR does two
things in order:
1. **The shared counted-token path** (M1-M7): one ceiling table, one
   clamp, one reducer action and one `useBattle` mutator replace the
   per-token copies for +1 Attack, Shield and Stone. This is behavior-
   preserving: the suite should stay green with only renamed calls in the
   tests.
2. **Chill on top** (M8-M24): its stored field, schema bump, table rows,
   icon and tests.

Both land in one `feat:` PR, with one minor bump (→ 0.13.0) at the end.
Doing the refactor first means Chill's own data-layer milestones are a
table entry each, and a failing test after M7 points at the refactor,
not at Chill.

**Parallel-safe split.** The refactor and Chill's data layer (M1-M14)
only touch `lib/` and `page.tsx`, and they must go in order. The
snowflake icon and `--color-chill` (M15-M16) import nothing from them,
so they can be built side by side. The `BATTLE_TOKENS` row (M17) needs
both.

## Architecture

```
frontend/src/
  app/globals.css               # += --color-chill: #5ccfe6
  app/page.tsx                  # setHeroToken's counted entries bind their field to
                                #   battle.setHeroCountedToken; += chillTokens
  lib/
    battle/types.ts             # += CountedTokenField (moved from battleTokens.ts);
                                #   HeroBattleState += chillTokens: number; schemaVersion 10
    battle/constants.ts         # HERO_{ATTACK,SHIELD,STONE}_TOKEN_CEILING →
                                #   HERO_COUNTED_TOKEN_CEILINGS { ..., chillTokens: 5 }
    battle/bounds.ts            # clampHero{Attack,Shield,Stone}Tokens → clampHeroCountedToken
    battle/reducer.ts           # SET_HERO_{ATTACK,SHIELD,STONE}_TOKENS → SET_HERO_COUNTED_TOKEN;
                                #   createInitialHeroState → chillTokens: 0
    battle/heroSpecificTokens.ts  # HERO_SPECIFIC_TOKENS += chill { dazeem, enemies }
    persistence/schema.ts       # CURRENT_BATTLE_SCHEMA_VERSION = 10; += LegacyHeroBattleStateV9,
                                #   LegacyBattleTeamStateV9, PersistedBattleStateV10
    persistence/storage.ts      # counted-token checks → one loop over the ceilings table;
                                #   += upgradeV9ToV10 = addHeroFieldsStep(10, { chillTokens: 0 })
    useBattle.ts                # setHero{Attack,Shield,Stone}Tokens → setHeroCountedToken
  components/
    battleTokens.ts             # CountedTokenField imported from lib; rows' max from the table;
                                #   BATTLE_TOKENS += +1 Chill row after +1 Stone
    TokenChip/ChillTokenIcon.tsx  # new: snowflake, 16px stroke SVG
    HeroCard/, BattleTeamPanel/,  # no code change: table-driven since v0.11.1
    screens/BattleBoardScreen/,
    MapTeamStatusPanel/
frontend/e2e/
  chill-tokens.spec.ts          # new
```

## Milestone Checklist

### Shared counted-token path (refactor, no behavior change)

- [ ] M1. `lib/battle/types.ts`: += `CountedTokenField` (`"attackTokens" |
      "shieldTokens" | "stoneTokens"` for now), moved from
      `components/battleTokens.ts`, which imports it from here.
- [ ] M2. `lib/battle/constants.ts`: replace `HERO_ATTACK_TOKEN_CEILING`,
      `HERO_SHIELD_TOKEN_CEILING` and `HERO_STONE_TOKEN_CEILING` with
      `HERO_COUNTED_TOKEN_CEILINGS` (`as const satisfies
      Record<CountedTokenField, number>`), each entry keeping its old
      comment. `types.ts`'s field doc comments point at the table.
- [ ] M3. `lib/battle/bounds.ts`: replace the three `clampHero…Tokens`
      with `clampHeroCountedToken(field, value)`.
- [ ] M4. `lib/battle/reducer.ts`: replace `SET_HERO_ATTACK_TOKENS`,
      `SET_HERO_SHIELD_TOKENS` and `SET_HERO_STONE_TOKENS` with
      `SET_HERO_COUNTED_TOKEN { side, heroId, field, value }`, one
      `setHeroField(..., field, clampHeroCountedToken(field, value))` call.
      One manual-only comment keeps each token's specifics (Shield never
      spent on damage, 3 Stone doesn't defeat).
- [ ] M5. `lib/useBattle.ts`: replace `setHeroAttackTokens`,
      `setHeroShieldTokens` and `setHeroStoneTokens` with
      `setHeroCountedToken(side, heroId, field, value)`. `app/page.tsx`:
      `setHeroToken`'s counted entries bind their field to it.
- [ ] M6. `lib/persistence/storage.ts`: `hasValidBattleTeamShape`
      replaces its three counted-token checks with one loop over
      `HERO_COUNTED_TOKEN_CEILINGS`; its doc comment says so.
      `components/battleTokens.ts`: each counted row's `max` reads from
      the table.
- [ ] M7. Tests follow the renames, with no behavior change:
      `bounds.test.ts` (one `describe.each` over the table for
      `clampHeroCountedToken`), `reducer.test.ts` (the counted-token
      `describe.each` dispatches `SET_HERO_COUNTED_TOKEN` with its
      `field`), `useBattle.test.tsx` (`setHeroCountedToken`),
      `storage.test.ts` (ceilings from the table). `tsc`, ESLint and the
      full Vitest suite green before Chill starts.

### Chill data & state layer

- [ ] M8. `lib/battle/types.ts`: `HeroBattleState` += `chillTokens:
      number` (with the spec's doc comment), `CountedTokenField` +=
      `"chillTokens"`, `BattleState.schemaVersion: 10`.
- [ ] M9. `lib/battle/constants.ts`: `HERO_COUNTED_TOKEN_CEILINGS` +=
      `chillTokens: 5`, citing intent 13's Value Bounds (the box's 5).
      No new clamp, action or setter: M3-M5 cover it.
- [ ] M10. `lib/battle/reducer.ts`: `createInitialHeroState` returns
      `chillTokens: 0` (doc comment adds "no Chill tokens"),
      `createInitialBattleState` writes `schemaVersion: 10`. The shared
      comment adds "Chill isn't cleared at the end of an action".
- [ ] M11. `lib/persistence/schema.ts`: `CURRENT_BATTLE_SCHEMA_VERSION =
      10`. += `LegacyHeroBattleStateV9 = Omit<HeroBattleState,
      "chillTokens">`, and `LegacyHeroBattleStateV8` derives from it. +=
      `LegacyBattleTeamStateV9`; `PersistedBattleStateV9.p1/p2` use it,
      doc comment says it's only the source for `battleMigrations[9]`. +=
      `PersistedBattleStateV10`.
- [ ] M12. `lib/persistence/storage.ts`: += `upgradeV9ToV10 =
      addHeroFieldsStep<PersistedBattleStateV10>(10, { chillTokens: 0 })`;
      `battleMigrations` += `9: upgradeV9ToV10`. `saveBattleState`,
      `isValidPersistedBattleState` and the import use
      `PersistedBattleStateV10`. M6's loop validates `chillTokens` with no
      extra line, and doesn't check who holds Chill.
- [ ] M13. `lib/battle/heroSpecificTokens.ts`: `HERO_SPECIFIC_TOKENS` +=
      `chill: { owner: "dazeem", targets: "enemies" }`.
- [ ] M14. Fixtures and tests:
      - every hand-written `HeroBattleState` gains `chillTokens: 0`
        (`reducer.test.ts`, `storage.test.ts`, `useBattle.test.tsx`,
        `HeroCard.test.tsx`, `BattleMapScreen.test.tsx`,
        `WinScreen.test.tsx`, plus any `tsc` finds); `storage.test.ts`'s
        older-schema `withoutHeroFields` calls also strip `"chillTokens"`
      - reducer: the counted-token `describe.each` gains `chillTokens`
        (up and down, clamped at 0 and 5, unknown-hero and same-value
        no-ops, Chill on an ally of Dazeem still works); a Chill write
        leaves `attackTokens` alone and the reverse (never netted);
        `SET_HERO_HP` to 0, `SET_HERO_POSITION`, the on/off actions and
        `PASS_INITIATIVE` keep the count
      - storage: v10 round-trip; v9→v10, v8→v10, v7→v10, v6→v10,
        v5→v10, v4→v10, v3→v10, v2→v10 and v1→v10 migrations (every hero
        at 0, everything else unchanged, Stone, Shield, Death Mark,
        Immobilize, Confuse and +1 Attack kept on v9→v10); rejects
        missing, negative, 6 and non-number `chillTokens`
      - `useBattle`: `setHeroCountedToken(…, "chillTokens", …)` updates
        and persists; reload keeps it
      - `heroSpecificTokens.test.ts`: Dazeem on p1 → `"p2"`, on p2 →
        `"p1"`, not drafted → `null`

### Chill UI

- [ ] M15. `app/globals.css`: += `--color-chill: #5ccfe6`, with a comment
      like `--color-stone`'s (the rulebook token's blue, as a frost cyan
      brighter and greener than `--color-immobilize`).
- [ ] M16. `components/TokenChip/ChillTokenIcon.tsx` (new): the canvas's
      snowflake (the spec's one path: three crossing strokes with a V
      near each tip), 16px viewBox stroke SVG in `currentColor`,
      `aria-hidden`, `size` prop (12px on the Board, 14px in the picker,
      13px on the Map).
- [ ] M17. `components/battleTokens.ts`: `BATTLE_TOKENS` += the
      `"+1 Chill"` row after Stone (`kind: "counted"`,
      `field: "chillTokens"`, `ChillTokenIcon`, `label` "+1 Chill",
      `var(--color-chill)`, `HERO_COUNTED_TOKEN_CEILINGS.chillTokens`,
      `heroSpecific: "chill"`). The table's doc comment adds Chill to the
      order list and says counted tokens share one action and setter.
      `app/page.tsx`: `setHeroToken` += `chillTokens`. Check that
      `HeroCard`, `BattleTeamPanel`, `BattleBoardScreen` and
      `MapTeamStatusPanel` need no edit (the spec's claim); note any that
      did.
- [ ] M18. Spec open item: does `--color-chill` `#5ccfe6` read apart from
      Immobilize's ice blue on the same card, and from P2's teal, at
      1280x800? Decide in the browser; adjust on the canvas and in the
      spec if not.
- [ ] M19. Spec open item: is `ChillTokenIcon` legible at 12px on the
      Board and 13px on the Map? If the six V tips blur at 12px, drop
      them and keep the three strokes. Update the spec.
- [ ] M20. Spec open item: Board at 1280x800 with the seven-token case
      (an ally of Cyrus who's an enemy of Kunoichi, Sedusa and Dazeem)
      holding +1 Attack ×9, Confuse, Immobilize, Death Mark, Shield ×9,
      Stone ×3 and Chill ×5: the card wraps to two lines, not three, and
      the Board doesn't scroll, with any stepper open. Also the Map's
      token line for that hero in the 170px panel. Decide in the
      browser, and update the spec.

### Tests & verification

- [ ] M21. Tests:
      - `HeroCard`: "+1 Chill" option only when `tokens.chillTokens` is
        passed, after "+1 Stone", disabled at 5; chip shown while held
        or open, its + disabled at 5
      - Board wiring (`page.test.tsx`): with Dazeem on p1, only p2's
        pickers offer "+1 Chill", and with him on p2 only p1's; Dazeem's
        own card never does; without Dazeem no picker offers it; Dazeem
        at 0 HP still allows Chill
      - `BattleMapScreen`: Chill icon and count only while above 0, after
        Stone, in frost cyan; token line shown for a hero holding only
        Chill
      - `WinScreen`: no Chill on the cards
      - `e2e/chill-tokens.spec.ts` (new): draft Dazeem, add five "+1
        Chill" to an enemy in one picker open (the row is disabled after
        the fifth), the count survives a Board⇄Map switch (shown in the
        Map panel) and a reload; it stays when that hero's HP goes to 0
        and when Dazeem's does; adding +1 Attack to the same hero leaves
        Chill unchanged; Dazeem's team's pickers have no "+1 Chill";
        stepping to 0 removes the chip on both screens
- [ ] M22. `tsc --noEmit`, ESLint, full Vitest and Playwright suites green
      (the existing attack, shield and stone e2e specs too, since their
      setters changed underneath).
- [ ] M23. Manual QA at 1280x800 (`/qa-screens`):
      - "+1 Chill" offered only on Dazeem's enemies, never on his own
        team; the cyan chip reads apart from Immobilize and P2's teal
        (M18); hover and focus outline in cyan
      - icon readable at 12px and 13px (M19)
      - Board and Map fit with the seven-token card (M20)
      - +1 Attack, Shield and Stone steppers still work after the
        refactor
      - Map Chill icons dimmed on a defeated hero
      - Win Screen cards unchanged
      - an existing schema-9 battle upgrades in place with every hero at
        0 Chill and its Stone, Shield, Death Mark, Immobilize, Confuse and
        +1 Attack values kept
      - New Draft resets every count
- [ ] M24. `npm version minor --no-git-tag-version` (→ 0.13.0). In
      `BACKLOG.md`, mark Chill done in Dazeem's entry and the
      hero-specific table, linking intent 13 and v0.13.0, as intent 12
      did for Stone. Mark spec 13 **BUILT**.
