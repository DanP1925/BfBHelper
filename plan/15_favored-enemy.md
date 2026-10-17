# Plan 15: Favored Enemy

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/15_favored-enemy.md](../intent/15_favored-enemy.md)
> and [../specs/15_favored-enemy.md](../specs/15_favored-enemy.md).
> Check items off in the PR(s) that do the work, same convention as
> [13_chill-tokens.md](13_chill-tokens.md).

## Context

The intent and spec are merged (intent in PR #83, spec in PR #89). The
canvas ("BfbHelper — App Flow", version 82) has Favored Enemy on the
"Battle Board" and "Battle Map" artboards: an emerald `#3fcf86`
(provisional) crosshair chip on Vladiator, Dazeem's open picker with no
Favored Enemy row because Vladiator holds it, and the icon on Vladiator's
Map status line. This plan turns them into a build checklist that extends
the v0.14.1 codebase (`BattleState` schema 11, `battleReducer`'s
`setHeroField`, `addHeroFieldsStep`, `HERO_SPECIFIC_TOKENS`,
`BATTLE_TOKENS` and the table-driven wiring in `HeroCard`,
`BattleTeamPanel`, `BattleBoardScreen` and `MapTeamStatusPanel`). There's
no new tooling and no new screen.

**Spec drift fixed in this PR.** Intent 14's Arena was built before this
plan (v0.14.0) and took battle schema 11. Spec 15 now says 11 → 12
(`PersistedBattleStateV12`, `upgradeV11ToV12`), and its legacy type chain
adds a `LegacyHeroBattleStateV11` / `LegacyBattleTeamStateV11` link,
because schema 11's team type reads its heroes from the current
`HeroBattleState`.

**Structure: one build PR**, like 13, after this plan ships as its own
`docs:` PR. Per the spec (decided 2026-10-17), the build PR does two
things in order:
1. **The shared on/off-token path** (M1-M6): one field list, one reducer
   action and one `useBattle` mutator replace the per-token copies for
   Confuse, Immobilize and Death Mark. This doesn't change behavior: the
   suite should stay green with only renamed calls in the tests.
2. **Favored Enemy on top** (M7-M24): its stored field, schema bump,
   table rows, the one-holder rule, the icon and tests.

Both land in one `feat:` PR, with one minor bump (→ 0.15.0) at the end.
Doing the refactor first means Favored Enemy's own data-layer milestones
are a table entry each, and a failing test after M6 points at the
refactor, not at Favored Enemy.

**Parallel-safe split.** The refactor and Favored Enemy's data layer
(M1-M13) touch `lib/`, `page.tsx` and `BattleBoardScreen`, and must go in
order. The crosshair icon and `--color-favored-enemy` (M14-M15) import
nothing from them, so they can be built side by side. The `BATTLE_TOKENS`
row and the one-holder skip (M16-M17) need both.

## Architecture

```
frontend/src/
  app/globals.css               # += --color-favored-enemy: #3fcf86
  app/page.tsx                  # setHeroToken = { counted, onOff: battle.setHeroOnOffToken }
  lib/
    battle/types.ts             # += OnOffTokenField (moved from battleTokens.ts);
                                #   HeroBattleState += favoredEnemy: boolean; schemaVersion 12
    battle/constants.ts         # += ON_OFF_TOKEN_FIELDS [confused, immobilized,
                                #   deathMarked, favoredEnemy]
    battle/reducer.ts           # SET_HERO_{CONFUSED,IMMOBILIZED,DEATH_MARKED} →
                                #   SET_HERO_ON_OFF_TOKEN; createInitialHeroState → favoredEnemy: false
    battle/heroSpecificTokens.ts  # HERO_SPECIFIC_TOKENS += favoredEnemy { boreas, enemies }
    persistence/schema.ts       # CURRENT_BATTLE_SCHEMA_VERSION = 12; += LegacyHeroBattleStateV11,
                                #   LegacyBattleTeamStateV11, PersistedBattleStateV12
    persistence/storage.ts      # on/off checks → one loop over ON_OFF_TOKEN_FIELDS;
                                #   += upgradeV11ToV12 = addHeroFieldsStep(12, { favoredEnemy: false })
    useBattle.ts                # setHero{Confused,Immobilized,DeathMarked} → setHeroOnOffToken
  components/
    battleTokens.ts             # OnOffTokenField imported from lib; OnOffToken += oneHolder?: true;
                                #   BATTLE_TOKENS += Favored Enemy row after +1 Chill
    TokenToggle/FavoredEnemyIcon.tsx  # new: crosshair, 16px stroke SVG
    BattleTeamPanel/BattleTeamPanel.tsx  # heroTokens takes the side's heroes; skips a
                                #   oneHolder token another hero holds
    screens/BattleBoardScreen/  # BoardTokenSetters = { counted, onOff }; teamTokenSetters
                                #   binds each on/off row's field
    HeroCard/, MapTeamStatusPanel/  # no code change: table-driven
frontend/e2e/
  favored-enemy.spec.ts         # new
```

## Milestone Checklist

### Shared on/off-token path (refactor, no behavior change)

- [ ] M1. `lib/battle/types.ts`: += `OnOffTokenField` (`"confused" |
      "immobilized" | "deathMarked"` for now), moved from
      `components/battleTokens.ts`, which imports it from here.
- [ ] M2. `lib/battle/constants.ts`: += `ON_OFF_TOKEN_FIELDS` (`as const
      satisfies readonly OnOffTokenField[]`), next to
      `HERO_COUNTED_TOKEN_CEILINGS`. A type test (`expectTypeOf`) checks
      that its element type equals `OnOffTokenField`, so a field can't be
      left out of validation (spec Open Item).
- [ ] M3. `lib/battle/reducer.ts`: replace `SET_HERO_CONFUSED`,
      `SET_HERO_IMMOBILIZED` and `SET_HERO_DEATH_MARKED` with
      `SET_HERO_ON_OFF_TOKEN { side, heroId, field, value }`, one
      `setHeroField(..., field, value)` call. One manual-only comment
      keeps each token's specifics (Immobilize never blocks a move).
- [ ] M4. `lib/useBattle.ts`: replace `setHeroConfused`,
      `setHeroImmobilized` and `setHeroDeathMarked` with
      `setHeroOnOffToken(side, heroId, field, value)`. `app/page.tsx`:
      `setHeroToken` becomes `{ counted, onOff }`.
      `screens/BattleBoardScreen`: `BoardTokenSetters` is
      `{ counted, onOff }`, and `teamTokenSetters` binds each on/off row's
      `field` to `setters.onOff`, like the counted rows.
- [ ] M5. `lib/persistence/storage.ts`: `hasValidBattleTeamShape`
      replaces its three boolean checks with one loop over
      `ON_OFF_TOKEN_FIELDS`; its doc comment says so.
- [ ] M6. Tests follow the renames, with no behavior change:
      `reducer.test.ts` (one `describe.each` over the on/off fields
      dispatching `SET_HERO_ON_OFF_TOKEN`), `useBattle.test.tsx`
      (`setHeroOnOffToken`), `page.test.tsx` and any Board test that
      builds `BoardTokenSetters`. `tsc`, ESLint and the full Vitest suite
      green before Favored Enemy starts.

### Favored Enemy data & state layer

- [ ] M7. `lib/battle/types.ts`: `HeroBattleState` += `favoredEnemy:
      boolean` (with the spec's doc comment), `OnOffTokenField` +=
      `"favoredEnemy"`, `BattleState.schemaVersion: 12`.
- [ ] M8. `lib/battle/constants.ts`: `ON_OFF_TOKEN_FIELDS` +=
      `"favoredEnemy"`. No new action or setter: M3-M4 cover it.
- [ ] M9. `lib/battle/reducer.ts`: `createInitialHeroState` returns
      `favoredEnemy: false` (doc comment adds "no Favored Enemy"),
      `createInitialBattleState` writes `schemaVersion: 12`. The shared
      comment adds "Favored Enemy is never moved to another hero", and
      that neither visibility nor the one-holder rule is checked here.
- [ ] M10. `lib/persistence/schema.ts`: `CURRENT_BATTLE_SCHEMA_VERSION =
      12`. += `LegacyHeroBattleStateV11 = Omit<HeroBattleState,
      "favoredEnemy">`, and `LegacyHeroBattleStateV9` derives from it. +=
      `LegacyBattleTeamStateV11` (heroes: `LegacyHeroBattleStateV11`);
      `LegacyBattleTeamStateV10` derives from it instead of
      `BattleTeamState`. `PersistedBattleStateV11.p1/p2` use
      `LegacyBattleTeamStateV11`, doc comment says it's only the source
      for `battleMigrations[11]`. += `PersistedBattleStateV12`.
- [ ] M11. `lib/persistence/storage.ts`: += `upgradeV11ToV12 =
      addHeroFieldsStep<PersistedBattleStateV12>(12, { favoredEnemy:
      false })`; `battleMigrations` += `11: upgradeV11ToV12`.
      `saveBattleState`, `isValidPersistedBattleState` and the import use
      `PersistedBattleStateV12`. M5's loop validates `favoredEnemy` with
      no extra line, and checks neither who holds it nor how many do.
- [ ] M12. `lib/battle/heroSpecificTokens.ts`: `HERO_SPECIFIC_TOKENS` +=
      `favoredEnemy: { owner: "boreas", targets: "enemies" }`.
- [ ] M13. Fixtures and tests:
      - `src/test/heroState.ts`'s `NO_TOKENS` gains `favoredEnemy: false`;
        every other hand-written `HeroBattleState` too (`tsc` finds
        them); `storage.test.ts`'s older-schema `withoutHeroFields` calls
        also strip `"favoredEnemy"`
      - reducer: the on/off `describe.each` gains `favoredEnemy` (on and
        off, unknown-hero and same-value no-ops, on an ally of Boreas
        still works); setting it on a second hero leaves the first one's
        alone (never moved); `SET_HERO_HP` to 0, `SET_HERO_POSITION`
        (including the Arena), the counted action and `PASS_INITIATIVE`
        keep the flag
      - storage: v12 round-trip; v11→v12, v10→v12, v9→v12 … v1→v12
        migrations (every hero `false`, everything else unchanged, Chill,
        Stone, Shield, Death Mark, Immobilize, Confuse, +1 Attack and an
        Arena position kept on v11→v12); rejects missing and non-boolean
        `favoredEnemy`; accepts two heroes holding it (shape, not rules)
      - `useBattle`: `setHeroOnOffToken(…, "favoredEnemy", …)` updates and
        persists; reload keeps it
      - `heroSpecificTokens.test.ts`: Boreas on p1 → `"p2"`, on p2 →
        `"p1"`, not drafted → `null`

### Favored Enemy UI

- [ ] M14. `app/globals.css`: += `--color-favored-enemy: #3fcf86`, with a
      comment like `--color-chill`'s (the rulebook token's green, as an
      emerald bluer than `--color-shield` and greener than
      `--color-chill`).
- [ ] M15. `components/TokenToggle/FavoredEnemyIcon.tsx` (new): the
      canvas's crosshair (ring r=4.5, four ticks crossing it, a 0.75
      center dot), 16px viewBox stroke SVG in `currentColor`,
      `aria-hidden`, `size` prop (12px on the Board, 14px in the picker,
      13px on the Map).
- [ ] M16. `components/battleTokens.ts`: `OnOffToken` += `oneHolder?:
      true` with the spec's doc comment. `BATTLE_TOKENS` += the Favored
      Enemy row after Chill (`kind: "onOff"`, `field: "favoredEnemy"`,
      `FavoredEnemyIcon`, `chipLabel` "Favored Enemy token", `optionLabel`
      and `mapLabel` "Favored Enemy", `var(--color-favored-enemy)`,
      `heroSpecific: "favoredEnemy"`, `oneHolder: true`). The table's doc
      comment adds Favored Enemy to the order list and says on/off tokens
      share one action and setter too.
- [ ] M17. `components/BattleTeamPanel/BattleTeamPanel.tsx`: `heroTokens`
      takes the side's `team.heroes` and skips a `oneHolder` token for a
      hero who doesn't hold it while another hero on the side does (the
      spec's snippet). Check that `HeroCard` and `MapTeamStatusPanel` need
      no edit (the spec's claim); note any that did.
- [ ] M18. Spec Open Item: does `--color-favored-enemy` `#3fcf86` read
      apart from Shield's yellow-green, Chill's cyan and P2's teal at
      1280x800? Decide in the browser; adjust on the canvas and in the
      spec if not.
- [ ] M19. Spec Open Item: is `FavoredEnemyIcon` legible at 12px on the
      Board and 13px on the Map? If the center dot muddies at 12px, drop
      it. Update the spec.
- [ ] M20. Spec Open Item: Board at 1280x800 with the eight-token case (an
      ally of Cyrus who's an enemy of Kunoichi, Sedusa, Dazeem and Boreas)
      holding +1 Attack ×9, Confuse, Immobilize, Death Mark, Shield ×9,
      Stone ×3, Chill ×5 and Favored Enemy: the card wraps to three lines
      at most, and the Board doesn't scroll, with any stepper open. Also
      the Map's token line for that hero in the 170px panel. Decide in
      the browser, and update the spec.

### Tests & verification

- [ ] M21. Tests:
      - `HeroCard`: "Favored Enemy" option only when `tokens.favoredEnemy`
        is passed and off, after "+1 Chill"; the lit chip while on, and a
        tap calls `onChange(false)`
      - Board wiring (`page.test.tsx`): with Boreas on p1, only p2's
        pickers offer "Favored Enemy", and with him on p2 only p1's;
        Boreas's own card never does; without Boreas no picker offers it;
        once one enemy holds it, no other enemy's picker offers it, and
        the holder's chip still shows; tapping it off brings the option
        back to every enemy; Boreas at 0 HP still allows it
      - `BattleMapScreen`: Favored Enemy icon only while held, after
        Chill, in emerald; token line shown for a hero holding only
        Favored Enemy
      - `WinScreen`: no Favored Enemy on the cards
      - `e2e/favored-enemy.spec.ts` (new): draft Boreas, give an enemy
        Favored Enemy from "+"; another enemy's picker doesn't list it;
        it survives a Board⇄Map switch (shown in the Map panel) and a
        reload; it stays when that hero's HP goes to 0 and when Boreas's
        does; Boreas's team's pickers have no "Favored Enemy"; tapping the
        chip removes it on both screens, and then a different enemy can
        take it
- [ ] M22. `tsc --noEmit`, ESLint, full Vitest and Playwright suites green
      (the existing confuse, immobilize, death-mark and token-row e2e
      specs too, since their setters changed underneath).
- [ ] M23. Manual QA at 1280x800 (`/qa-screens`):
      - "Favored Enemy" offered only on Boreas's enemies, never on his own
        team, and only while no enemy holds it; the emerald chip reads
        apart from Shield, Chill and P2's teal (M18); focus outline in
        emerald
      - icon readable at 12px and 13px (M19)
      - Board and Map fit with the eight-token card (M20)
      - Confuse, Immobilize and Death Mark still add and remove after the
        refactor
      - Map Favored Enemy icon dimmed on a defeated hero
      - Win Screen cards unchanged
      - an existing schema-11 battle upgrades in place with no hero
        holding Favored Enemy and its other tokens and Arena positions
        kept
      - New Draft clears it
- [ ] M24. `npm version minor --no-git-tag-version` (→ 0.15.0). In
      `BACKLOG.md`, mark Favored Enemy done in Boreas's entry and the
      hero-specific table, linking intent 15 and v0.15.0, as intent 13
      did for Chill (Bear Trap stays open). Mark spec 15 **BUILT**.
