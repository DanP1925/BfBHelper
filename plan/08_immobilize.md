# Plan: BfbHelper v8 — Immobilize

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/08_immobilize.md](../intent/08_immobilize.md)
> and [../specs/08_immobilize.md](../specs/08_immobilize.md).
> Check items off in the PR(s) that do the work, same convention as
> [07_confuse-tokens.md](07_confuse-tokens.md).

## Context

The intent and spec are merged (intent in PR #54, spec in PR #55). The
Immobilize toggle and its Map entry are on the shared "BfbHelper — App
Flow" design artifact's "Battle Board" and "Battle Map" artboards (version
60: ice blue `#8fb4e0`, three-link chain icon). This plan turns them into a
build checklist that extends the v7 codebase (`BattleState` schema 5,
`useBattle`, `battleReducer`'s generic `setHeroField`, `addHeroFieldsStep`,
`TokenToggle`). There's no new tooling and no new screen.

**Structure: one PR.** It's smaller than 07: one per-hero boolean, one
reducer action, one mutator, one new icon, and wiring that copies the
Confuse toggle's path. `TokenToggle` already exists and only its label
format changes. This plan doc ships in the same PR as the code.

**Parallel-safe split.** `ImmobilizeIcon` (M8), the `--color-immobilize`
token (M7) and the `TokenToggle` label change (M9) import nothing from the
data layer, so they can be built alongside M1-M6. The Board wiring
(M10-M12) needs both halves. The Map line (M13) only needs M1's type and
M8's icon.

## Architecture

```
frontend/src/
  app/globals.css             # += --color-immobilize: #8fb4e0
  app/page.tsx                # passes battle.setHeroImmobilized
  lib/
    battle/types.ts           # HeroBattleState += immobilized: boolean; schemaVersion 6
    battle/reducer.ts         # += SET_HERO_IMMOBILIZED (one setHeroField call);
                              #   createInitialHeroState → immobilized: false
    persistence/schema.ts     # CURRENT_BATTLE_SCHEMA_VERSION = 6; += LegacyBattleTeamStateV5,
                              #   PersistedBattleStateV6; V4 legacy omits both flags
    persistence/storage.ts    # += upgradeV5ToV6 = addHeroFieldsStep(6, { immobilized: false }),
                              #   battleMigrations[5]; validate typeof immobilized === "boolean"
    useBattle.ts              # += setHeroImmobilized
  components/
    TokenToggle/              # label used verbatim: aria `${label} on ${heroName}`, title label
    TokenToggle/ImmobilizeIcon.tsx  # new: three-link chain, 16px stroke SVG, size prop
    HeroCard/                 # battle variant += immobilized?: HeroCardToggleProps, after Confuse
    BattleTeamPanel/          # += onHeroImmobilizedChange; Confuse label → "Confuse token"
    MapTeamStatusPanel/       # .tokenLine += Immobilize span after Confuse; += .immobilized class
    screens/BattleBoardScreen # += setHeroImmobilized, forwarded per side
frontend/e2e/immobilize.spec.ts  # new
```

## Milestone Checklist

### Data & state layer
- [x] M1. `lib/battle/types.ts`: `HeroBattleState` += `immobilized: boolean`
      (with the spec's doc comment), `BattleState.schemaVersion: 6`.
- [x] M2. `lib/battle/reducer.ts`: += `SET_HERO_IMMOBILIZED { side, heroId,
      value: boolean }`, one `setHeroField(..., "immobilized", value)` call
      with a manual-only comment like the Confuse branch.
      `createInitialHeroState` returns `immobilized: false` (doc comment:
      every hero starts standing), `createInitialBattleState` writes
      `schemaVersion: 6`. `SET_HERO_HP`, `SET_HERO_POSITION`,
      `SET_HERO_ATTACK_TOKENS`, `SET_HERO_CONFUSED` and `PASS_INITIATIVE`
      leave the flag alone.
- [x] M3. `lib/persistence/schema.ts`: `CURRENT_BATTLE_SCHEMA_VERSION = 6`.
      += `LegacyBattleTeamStateV5` (heroes without `immobilized`);
      `PersistedBattleStateV5.p1/p2` use it, doc comment says it's only the
      source for `battleMigrations[5]`. `LegacyBattleTeamStateV4` omits
      both `confused` and `immobilized`. += `PersistedBattleStateV6`.
- [x] M4. `lib/persistence/storage.ts`: += `upgradeV5ToV6 =
      addHeroFieldsStep<PersistedBattleStateV6>(6, { immobilized: false })`;
      `battleMigrations` += `5: upgradeV5ToV6`. `saveBattleState` writes
      `PersistedBattleStateV6`.
- [x] M5. `storage.ts` validation: `hasValidBattleTeamShape` requires
      `typeof immobilized === "boolean"` on every hero (doc comment lists
      it). `loadBattleState` returns `schemaVersion: 6`.
- [x] M6. `lib/useBattle.ts`: += `setHeroImmobilized(side, heroId, value)`,
      same shape as `setHeroConfused`.

### UI
- [x] M7. `app/globals.css`: += `--color-immobilize: #8fb4e0`.
- [x] M8. `components/TokenToggle/ImmobilizeIcon.tsx` (new): a horizontal
      three-link chain (two face-on oval links, flat edge-on middle link),
      16px-viewBox stroke SVG in `currentColor`, `aria-hidden`, `size`
      prop (12px on the Board, 13px on the Map). Copy the mockup's
      drawing (v60).
- [x] M9. `TokenToggle`: `label` is used verbatim, aria-label
      `` `${label} on ${heroName}` ``, title `label`. Prop doc comment
      updated. `BattleTeamPanel`'s Confuse toggle passes
      `label="Confuse token"`, so its accessible text doesn't change.
- [x] M10. `HeroCard` battle variant: += optional
      `immobilized?: HeroCardToggleProps`. `.tokenRow` renders when any of
      the three token props is passed, Immobilize after Confuse.
      `WinScreen` stays unchanged.
- [x] M11. `BattleTeamPanel`: += `onHeroImmobilizedChange(heroId, value)`;
      passes `heroState.immobilized` and the handler to each `HeroCard`,
      with `ImmobilizeIcon`, `label="Immobilized"` and
      `accent="var(--color-immobilize)"`.
      (Built as for Confuse: the icon, label and accent are set in
      `HeroCard`, so `BattleTeamPanel` only passes `{ on, onChange }`.)
- [x] M12. `BattleBoardScreen`: += `setHeroImmobilized` prop, forwarded per
      side. No `openTokenKey` entry. `app/page.tsx` passes
      `battle.setHeroImmobilized`.
- [x] M13. `MapTeamStatusPanel`: `.tokenLine` renders when
      `attackTokens > 0 || confused || immobilized`. The new span is the
      13px `ImmobilizeIcon` alone after the Confuse span,
      `aria-label="Immobilized"`, `title="Immobilized"`, new `.immobilized`
      class (`color: var(--color-immobilize)`). Inside the row, so
      `.dimmed` covers it. No drag guard: `BattleMapScreen` and `MapToken`
      don't read the flag.
- [x] M14. Spec open item: does the chain read at 12px on the Board and
      13px on the Map? Check in the browser at 1280x800; thicken or
      simplify the links if they blur.
      **Reads fine** at 12px and 13px, mockup drawing kept as is.
- [x] M15. Spec open item: Board fit at 1280x800 with a ×9 chip expanded
      next to lit Confuse and Immobilize toggles on every hero. The token
      row should stay one line (~133px of 144px on paper) and no card gets
      taller. Decide in the browser; if it wraps, tighten the row's gap
      before anything else, and update the spec.
      **Fits.** The worst row (a ×9 chip expanded) uses ~119px of 144px,
      not ~133px; every row stays 20px tall, no Board scroll. Spec updated.
- [x] M16. Spec open item: Map fit at 1280x800 with all eight heroes
      holding +1 Attack, Confuse and Immobilize. Every token line should
      stay one line in the 170px panel and the page shouldn't scroll.
      Decide in the browser.
      **Fits**, all eight lines one line (14px tall), no page scroll.

### Tests & verification
- [x] M17. Fixtures bumped to schema 6 with `immobilized: false`
      (`storage.test.ts`, `selectors.test.ts`, `useBattle.test.tsx`,
      `BattleMapScreen.test.tsx`, `WinScreen.test.tsx`, `reducer.test.ts`'s
      `createInitialHeroState` expectations). New tests for:
      - reducer `SET_HERO_IMMOBILIZED`: on and off, unknown-hero and
        same-value no-ops; `SET_HERO_POSITION`, `SET_HERO_HP` to 0,
        `SET_HERO_CONFUSED` and `PASS_INITIATIVE` keep the flag
      - storage: v6 round-trip; v5→v6, v4→v6, v3→v6, v2→v6 and v1→v6
        migrations (every hero off, everything else unchanged, Confuse
        flags and attack tokens kept on v5→v6); rejects missing and
        non-boolean (`0`, `"true"`) `immobilized`
      - `useBattle`: `setHeroImmobilized` updates and persists; reload
        keeps it
      - `TokenToggle`: label used verbatim (`"Immobilized on Boreas"`,
        title `"Immobilized"`); existing tests updated for the new format
      - Board wiring (`page.test.tsx`): toggling one hero leaves the
        others and leaves that hero's Confuse alone; Confuse keeps its
        "Confuse token on …" label
      - `BattleMapScreen`: Immobilize icon shown only while immobilized,
        token line shown for a hero with Immobilize alone
      - `WinScreen`: no Immobilize toggle on the cards
- [x] M18. `e2e/immobilize.spec.ts` (new): immobilize a hero, the icon
      survives a Board⇄Map switch (shown in the Map panel) and a reload;
      the hero can still be dragged to another space on the Map and stays
      immobilized; the flag stays when its HP goes to 0; tapping again
      turns it off on both screens.
- [x] M19. `tsc --noEmit`, ESLint, full Vitest and Playwright suites green.
- [x] M20. Manual QA at 1280x800 (`/qa-screens`):
      - toggle off/on on every hero card, ice-blue pill reads apart from
        the gold chip, the purple Confuse pill and the teal P2 color;
        hover and focus outline in ice blue
      - chain icon readable at 12px and 13px (M14)
      - Board still fits without scrolling (M15)
      - Map panel Immobilize icons, dimmed on a defeated hero, fit (M16)
      - dragging an immobilized hero on the Map works as usual
      - Win Screen cards unchanged
      - an existing schema-5 battle upgrades in place with every hero
        off and its Confuse flags and +1 Attack counts kept
      - New Draft resets every flag
      Checked by script at 1280x800: Board/Map fit, icon, Map dimming,
      ice-blue hover and `:focus-visible` outline, Space toggles, Win
      Screen without toggles, the schema-5 upgrade (all off, Confuse and
      ×9 counts kept), and New Draft clears the stored battle. The drag of
      an immobilized hero is covered by `e2e/immobilize.spec.ts`.
- [x] M21. `npm version minor --no-git-tag-version` (→ 0.8.0) in the same
      PR, and check off Immobilize status in `BACKLOG.md`.
