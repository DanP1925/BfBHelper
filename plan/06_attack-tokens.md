# Plan: BfbHelper v6 — +1 Attack Tokens

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/06_attack-tokens.md](../intent/06_attack-tokens.md)
> and [../specs/06_attack-tokens.md](../specs/06_attack-tokens.md).
> Check items off in the PR(s) that do the work, same convention as
> [05_initiative-indicator.md](05_initiative-indicator.md).

## Context

The intent and spec are done and merged (spec in `a994106`). The token chip
and the Map's token line are on the shared "BfbHelper — App Flow" design
artifact's "Battle Board" and "Battle Map" artboards (version 55). This plan
turns them into a build checklist that extends the v5 codebase (`BattleState`
schema 3, `useBattle`, `battleReducer`). There's no new tooling and no new
screen.

**Structure: one PR.** Like 05, it's one state change (a per-hero count, one
reducer action, one mutator) plus one new component and its wiring into two
screens. This plan doc ships in the same PR as the code.

**Parallel-safe split.** `TokenChip/` (M8-M9) imports nothing from the data
layer, so it can be built alongside M1-M7. The Board wiring (M10-M12) needs
both. The Map line (M13) only needs M1's type and M9's icon.

## Architecture

```
frontend/src/
  lib/
    battle/types.ts           # += HeroBattleState { hp, level, attackTokens };
                              #   BattleTeamState.heroes uses it; schemaVersion 4
    battle/constants.ts       # += HERO_ATTACK_TOKEN_CEILING = 9
    battle/bounds.ts          # += clampHeroAttackTokens
    battle/reducer.ts         # += SET_HERO_ATTACK_TOKENS; createInitialHeroState → attackTokens: 0
    persistence/schema.ts     # CURRENT_BATTLE_SCHEMA_VERSION = 4; += LegacyBattleTeamStateV2,
                              #   PersistedBattleStateV4; V2/V3 use the legacy team type
    persistence/storage.ts    # += upgradeV3ToV4; [1]/[2]/[3] all land on 4;
                              #   validate attackTokens 0..9
    useBattle.ts              # += setHeroAttackTokens
  components/
    TokenChip/                # new: { count, max, onChange, icon, label, heroName,
                              #   expanded, onExpandedChange } — collapsible pill with − / +
    TokenChip/AttackTokenIcon.tsx  # new: inline crossed-swords SVG, size prop
    HeroCard/                 # battle variant += .tokenRow under the level row
    BattleTeamPanel/          # += onHeroAttackTokensChange, openTokenKey passthrough
    MapTeamStatusPanel/       # += read-only .tokenLine under a hero's name when > 0
    screens/BattleBoardScreen # += setHeroAttackTokens, openTokenKey state
  app/page.tsx                # passes battle.setHeroAttackTokens
e2e/attack-tokens.spec.ts     # new
```

## Milestone Checklist

### Data & state layer
- [x] M1. `lib/battle/types.ts`: += `HeroBattleState` (`hp`, `level`,
      `attackTokens`). `BattleTeamState.heroes` uses it,
      `BattleState.schemaVersion: 4`. Replace the inline
      `{ hp: number; level: number }` in `reducer.ts` with it. (`HeroCard.tsx`
      takes `hp` and `level` as separate props, so it had nothing to replace.)
- [x] M2. `lib/battle/constants.ts`: += `HERO_ATTACK_TOKEN_CEILING = 9`.
      `lib/battle/bounds.ts`: += `clampHeroAttackTokens` (0..9).
- [x] M3. `lib/battle/reducer.ts`: += `SET_HERO_ATTACK_TOKENS` (copy of
      `SET_HERO_LEVEL`: clamp-and-replace, same reference on unknown hero or
      unchanged value). `createInitialHeroState` returns
      `attackTokens: 0`. `SET_HERO_HP`, `SET_HERO_POSITION` and
      `PASS_INITIATIVE` leave tokens alone.
- [x] M4. `lib/persistence/schema.ts`: `CURRENT_BATTLE_SCHEMA_VERSION = 4`.
      += `LegacyBattleTeamStateV2` (heroes without `attackTokens`);
      `PersistedBattleStateV2.p1/p2` use it, V3 inherits it.
      += `PersistedBattleStateV4`.
- [x] M5. `lib/persistence/storage.ts`: `upgradeV1ToV2`'s `upgradeTeam`
      returns `LegacyBattleTeamStateV2` (type only). += `upgradeV3ToV4`
      (every hero gets `attackTokens: 0`, `null` if `p1`/`p2`/`heroes`
      aren't objects). `battleMigrations`: `[1]` = v1→v2→v3→v4,
      `[2]` = v2→v3→v4, `[3]` = v3→v4, typed `PersistedBattleStateV4 | null`.
      Optional `chain` helper. (Ended up simpler: `loadPersisted` now
      chains one-step migrations itself, so the table is just
      `1: upgradeV1ToV2, 2: upgradeV2ToV3, 3: upgradeV3ToV4`; spec updated.)
- [x] M6. `storage.ts` validation: `hasValidBattleTeamShape` requires
      `attackTokens` in 0..9 on every hero. `hasValidLegacyBattleTeamShape`
      is unchanged. `loadBattleState` returns `schemaVersion: 4`.
- [x] M7. `lib/useBattle.ts`: += `setHeroAttackTokens(side, heroId, value)`,
      same shape as `setHeroLevel`.

### UI
- [x] M8. `components/TokenChip/AttackTokenIcon.tsx` (new): inline
      crossed-swords SVG, `aria-hidden`, `size` prop (12px on the chip,
      13px in the Map panel).
- [x] M9. `components/TokenChip/` (new, `.module.css`): collapsed toggle
      (muted icon at 0, gold pill "×N" from 1 up), expanded − / + in an
      animated `.controls` wrapper (~150ms `max-width`/`opacity`,
      `visibility: hidden` while collapsed, off under
      `prefers-reduced-motion`). − disabled at 0, + at `max`. A tap on − / +
      leaves it open. Closes on toggle, outside `mousedown`, or Escape
      (focus back to the toggle), using `OverflowMenu`'s listener pattern.
      `aria-expanded`/`aria-controls`/`aria-label`s and `title` as in the
      spec. 18px buttons, 20px pill.
- [x] M10. `HeroCard` battle variant: += `attackTokens`,
      `onAttackTokensChange`, `attackTokensExpanded`,
      `onAttackTokensExpandedChange`. A `.tokenRow` (flex, wrap, 4px gap)
      as the last child of `.battleInfo`, rendered only when
      `onAttackTokensChange` is passed, so `WinScreen` is unchanged.
      (The four props ended up grouped into one optional
      `attackTokens: HeroCardTokenProps` object; spec updated to match.)
- [x] M11. `BattleTeamPanel`: += `onHeroAttackTokensChange`, `openTokenKey`,
      `onOpenTokenKeyChange`; builds each chip's key as
      `` `${side}:${heroId}:attack` `` and passes `expanded` /
      `onExpandedChange` to `HeroCard`.
- [x] M12. `BattleBoardScreen`: += `setHeroAttackTokens` prop and
      `openTokenKey` state (not persisted), forwarded per side.
      `app/page.tsx` passes `battle.setHeroAttackTokens`.
- [x] M13. `MapTeamStatusPanel`: when `attackTokens > 0`, a `.tokenLine`
      (`flex-basis: 100%`, slightly indented) under the hero's name with the
      icon and count, inside the row so `.dimmed` covers it. Display only,
      no new props.
- [x] M14. Spec open item: Board fit at 1280x800 with every hero holding
      tokens and one chip expanded (estimate ~616px of ~670px). If it
      scrolls, tighten `.battleInfo`'s gap (8px → 6px) or card padding
      first. Decide in the browser. **Fits as specced**, both teams fully
      tokened with one chip open, no gap change needed.
- [x] M15. Spec open item: Map fit at 1280x800 with all four heroes on one
      team holding tokens (~68px taller panel). Passes if the board area
      keeps its size and the page doesn't scroll. If not, tighten the token
      line; drop the Map entry only as a last resort. Decide in the browser.
      **Fits as specced** with all eight heroes tokened: the panels stay
      above the respawn strips and the page doesn't scroll.
- [x] M16. Spec open item: pill accent, gold border/tint or neutral like the
      ⋯ button, next to the red HP badge. Decide in the browser at 1280x800.
      **Decided: gold**, as specced.
- [x] M17. Spec open item: animation feel. Is 150ms too slow for three
      taps on + (Cynthia), or too fast to read? Check that
      `prefers-reduced-motion` turns it off. Decide in the browser.
      **Decided: keep 150ms**, checked by hand. Reduced motion drops the
      transition (`TokenChip.module.css`).

### Tests & verification
- [x] M18. Fixtures bumped to schema 4 (`storage.test.ts`,
      `selectors.test.ts`, `BattleMapScreen.test.tsx`, `WinScreen.test.tsx`,
      `reducer.test.ts`'s `createInitialHeroState` expectations). New tests
      for:
      - `clampHeroAttackTokens` bounds
      - reducer `SET_HERO_ATTACK_TOKENS`: clamp, unknown-hero and
        same-value no-ops; `SET_HERO_HP` to 0 keeps tokens
      - storage: v4 round-trip; v3→v4, v2→v4 and v1→v4 migrations (every
        hero at 0, everything else unchanged); rejects missing, negative,
        above-9 and non-numeric `attackTokens`
      - `useBattle`: `setHeroAttackTokens` updates and persists; reload
        keeps the count
      - `TokenChip`: collapsed at 0 / at N, expand, − / + call `onChange`
        and stay open, bounds disabled, close on toggle / outside click /
        Escape (focus returns)
      - Board wiring (`page.test.tsx`): opening one hero's chip closes
        another's, including across teams
      - `BattleMapScreen`: token line shown only above 0
- [x] M19. `e2e/attack-tokens.spec.ts` (new): add three tokens to a hero,
      remove one, the count survives a Board⇄Map switch (shown in the Map
      panel) and a reload; tokens stay when the hero's HP goes to 0.
- [x] M20. `tsc --noEmit`, ESLint, full Vitest and Playwright suites green.
- [x] M21. Manual QA at 1280x800 (`/qa-screens`):
      - chip collapsed/expanded on every hero card, nothing else on the
        card moves while it animates
      - Board still fits without scrolling (M14)
      - Map panel token lines, dimmed on a defeated hero, fit (M15)
      - Win Screen cards unchanged
      - an existing schema-3 battle upgrades in place with every count at 0
      - New Draft resets every count
- [x] M22. `npm version minor --no-git-tag-version` (→ 0.6.0) in the same
      PR, and check off +1 Attack tokens in `BACKLOG.md`.
