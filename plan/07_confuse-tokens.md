# Plan: BfbHelper v7 — Confuse Tokens

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/07_confuse-tokens.md](../intent/07_confuse-tokens.md)
> and [../specs/07_confuse-tokens.md](../specs/07_confuse-tokens.md).
> Check items off in the PR(s) that do the work, same convention as
> [06_attack-tokens.md](06_attack-tokens.md).

## Context

The intent and spec are merged (intent in PR #50, spec in PR #51). The
Confuse toggle and its Map entry are on the shared "BfbHelper — App Flow"
design artifact's "Battle Board" and "Battle Map" artboards (version 57,
purple `#c06ad0`). This plan turns them into a build checklist that extends
the v6 codebase (`BattleState` schema 4, `useBattle`, `battleReducer`,
`TokenChip`). There's no new tooling and no new screen.

**Structure: one PR.** Like 05 and 06, it's one state change (a per-hero
boolean, one reducer action, one mutator) plus one new component and its
wiring into two screens. This plan doc ships in the same PR as the code.

**Parallel-safe split.** `TokenToggle/` and `ConfuseTokenIcon` (M8-M9) and
the `--color-confuse` token (M7) import nothing from the data layer, so
they can be built alongside M1-M6. The Board wiring (M10-M12) needs both
halves. The Map line (M13) only needs M1's type and M8's icon.

## Architecture

```
frontend/src/
  app/globals.css             # += --color-confuse: #c06ad0
  app/page.tsx                # passes battle.setHeroConfused
  lib/
    battle/types.ts           # HeroBattleState += confused: boolean; schemaVersion 5
    battle/reducer.ts         # += SET_HERO_CONFUSED; setHeroField generic over the field;
                              #   createInitialHeroState → confused: false
    persistence/schema.ts     # CURRENT_BATTLE_SCHEMA_VERSION = 5; += LegacyBattleTeamStateV4,
                              #   PersistedBattleStateV5; V4 uses the legacy team type
    persistence/storage.ts    # += upgradeV4ToV5, battleMigrations[4];
                              #   validate typeof confused === "boolean"
    useBattle.ts              # += setHeroConfused
  components/
    TokenToggle/              # new: { on, onChange, icon, label, heroName, accent }
                              #   one aria-pressed button, muted off / accent pill on
    TokenToggle/ConfuseTokenIcon.tsx  # new: "?" + three sparkles, 16px stroke SVG, size prop
    TokenChip/                # maybe: pill rules move to a shared tokenPill.module.css (M15)
    HeroCard/                 # battle variant += confused?: HeroCardToggleProps in .tokenRow
    BattleTeamPanel/          # += onHeroConfusedChange
    MapTeamStatusPanel/       # .tokenLine becomes a container: attack span + Confuse span
    screens/BattleBoardScreen # += setHeroConfused, forwarded per side
frontend/e2e/confuse-tokens.spec.ts  # new
```

## Milestone Checklist

### Data & state layer
- [x] M1. `lib/battle/types.ts`: `HeroBattleState` += `confused: boolean`
      (with the spec's doc comment), `BattleState.schemaVersion: 5`.
- [x] M2. `lib/battle/reducer.ts`: += `SET_HERO_CONFUSED { side, heroId,
      value: boolean }`. `setHeroField` becomes generic
      (`<K extends keyof HeroBattleState>`, `value: HeroBattleState[K]`), and
      the new branch reuses it: same reference on unknown hero or unchanged
      value. `createInitialHeroState` returns `confused: false`,
      `createInitialBattleState` writes `schemaVersion: 5`. `SET_HERO_HP`,
      `SET_HERO_POSITION`, `SET_HERO_ATTACK_TOKENS` and `PASS_INITIATIVE`
      leave the flag alone.
- [x] M3. `lib/persistence/schema.ts`: `CURRENT_BATTLE_SCHEMA_VERSION = 5`.
      += `LegacyBattleTeamStateV4` (heroes without `confused`);
      `PersistedBattleStateV4.p1/p2` use it. += `PersistedBattleStateV5`.
- [x] M4. `lib/persistence/storage.ts`: `upgradeV3ToV4`'s `upgradeTeam`
      returns `LegacyBattleTeamStateV4` (type only). += `upgradeV4ToV5`
      (copy of `upgradeV3ToV4`: every hero gets `confused: false`, `null`
      if `p1`/`p2`/`heroes` aren't objects, fresh `updatedAt`).
      `battleMigrations` += `4: upgradeV4ToV5`. (After `/simplify`, both
      steps come from one `addHeroFieldsStep(version, defaults)` helper,
      so `LegacyBattleTeamStateV4` is only used by the schema types.)
- [x] M5. `storage.ts` validation: `hasValidBattleTeamShape` requires
      `typeof confused === "boolean"` on every hero.
      `loadBattleState` returns `schemaVersion: 5`.
- [x] M6. `lib/useBattle.ts`: += `setHeroConfused(side, heroId, value)`,
      same shape as `setHeroAttackTokens`.

### UI
- [x] M7. `app/globals.css`: += `--color-confuse: #c06ad0`.
- [x] M8. `components/TokenToggle/ConfuseTokenIcon.tsx` (new): a "?" with
      three small sparkles, 16px-viewBox stroke SVG in `currentColor`,
      `aria-hidden`, `size` prop (12px on the Board, 13px on the Map).
      Copy the mockup's drawing.
- [x] M9. `components/TokenToggle/` (new, `.module.css`): one `<button>`
      with `aria-pressed={on}`, fixed `aria-label`
      (`` `${label} token on ${heroName}` ``) and `title`
      (`` `${label} token` ``). A tap calls `onChange(!on)`. `accent` is set
      as `--token-accent` on the button. Off: muted icon, no border,
      accent on hover. On: the chip's 20px lit pill (accent border,
      `color-mix` accent background, accent icon), icon only.
      `:focus-visible` outline in the accent. No state of its own.
- [x] M10. `HeroCard` battle variant: += optional
      `confused?: HeroCardToggleProps` (`{ on, onChange }`). `.tokenRow`
      renders when either token prop is passed, Confuse after the chip,
      so `WinScreen` stays unchanged.
- [x] M11. `BattleTeamPanel`: += `onHeroConfusedChange(heroId, value)`;
      passes `heroState.confused` and the handler to each `HeroCard`, with
      `ConfuseTokenIcon` and `accent="var(--color-confuse)"`.
- [x] M12. `BattleBoardScreen`: += `setHeroConfused` prop, forwarded per
      side. No `openTokenKey` entry. `app/page.tsx` passes
      `battle.setHeroConfused`.
- [x] M13. `MapTeamStatusPanel`: `.tokenLine` becomes a container,
      rendered when `attackTokens > 0 || confused`, inside the row so
      `.dimmed` covers it. The attack span keeps its icon, count,
      aria-label and title. The Confuse span is the 13px icon alone in
      `--color-confuse`, `aria-label="Confused"`, `title="Confuse token"`,
      ~6px after the attack span. Display only, no new props.
- [x] M14. Spec open item: does the "?" with sparkles read at 12px? Check
      in the browser at 1280x800; simplify the sparkles if they blur.
      **Reads fine** at 12px and 13px, mockup drawing kept as is.
- [x] M15. Spec open item: shared `tokenPill.module.css` (read by both
      `TokenChip` and `TokenToggle`, the chip setting `--token-accent` to
      gold) vs a copy of the chip's pill rules in `TokenToggle.module.css`.
      Prefer the shared file if it stays small. Decide in the build; if
      shared, `TokenChip` must look identical afterward.
      **Decided: a copy.** ~6 declarations overlap, and the chip's
      structure (a `div` around a button plus animated controls) differs
      from the one-button toggle. `TokenChip` untouched; spec updated.
- [x] M16. Spec open item: Board fit at 1280x800 with a chip expanded next
      to a lit toggle on every hero. The token row should stay one line
      (~116px of ~145px) and no card gets taller. Decide in the browser.
      **Fits.** The lit toggle is ~24px, not ~22px; a ×9 chip expanded
      next to it uses ~105px of 144px. No Board scroll. Spec updated.
- [x] M17. Spec open item: Map fit at 1280x800 with all eight heroes
      holding both +1 Attack and Confuse. The token line should stay one
      line in the 170px panel and the page shouldn't scroll. Decide in the
      browser.
      **Fits**, all eight lines one line, no page scroll.

### Tests & verification
- [x] M18. Fixtures bumped to schema 5 with `confused: false`
      (`storage.test.ts`, `selectors.test.ts`, `useBattle.test.tsx`,
      `BattleMapScreen.test.tsx`, `WinScreen.test.tsx`, `reducer.test.ts`'s
      `createInitialHeroState` expectations). New tests for:
      - reducer `SET_HERO_CONFUSED`: on and off, unknown-hero and
        same-value no-ops; `SET_HERO_HP` to 0, `SET_HERO_POSITION` and
        `PASS_INITIATIVE` keep the flag
      - storage: v5 round-trip; v4→v5, v3→v5, v2→v5 and v1→v5 migrations
        (every hero off, everything else unchanged, attack tokens kept on
        v4→v5); rejects missing and non-boolean (`0`, `"true"`) `confused`
      - `useBattle`: `setHeroConfused` updates and persists; reload keeps it
      - `TokenToggle`: `aria-pressed` off/on, tap calls `onChange` with the
        opposite value, fixed label and title, accent set as
        `--token-accent`
      - Board wiring (`page.test.tsx`): toggling one hero leaves the others;
        tapping a toggle while a chip is open closes the chip and toggles
      - `BattleMapScreen`: Confuse icon shown only while confused, token
        line shown for a hero with Confuse but no +1 Attack tokens
      - `WinScreen`: no toggle on the cards
- [x] M19. `e2e/confuse-tokens.spec.ts` (new): confuse a hero, the icon
      survives a Board⇄Map switch (shown in the Map panel) and a reload;
      the flag stays when the hero's HP goes to 0; tapping again turns it
      off on both screens.
- [x] M20. `tsc --noEmit`, ESLint, full Vitest and Playwright suites green.
- [x] M21. Manual QA at 1280x800 (`/qa-screens`):
      - toggle off/on on every hero card, purple pill reads apart from
        the gold chip, hover and focus outline in purple
      - icon readable at 12px (M14)
      - `TokenChip` unchanged if the pill CSS was shared (M15)
      - Board still fits without scrolling (M16)
      - Map panel Confuse icons, dimmed on a defeated hero, fit (M17)
      - Win Screen cards unchanged
      - an existing schema-4 battle upgrades in place with every hero
        off and its +1 Attack counts kept
      - New Draft resets every flag
      Checked by script at 1280x800: Board/Map fit, icon, Map dimming,
      Win Screen, the schema-4 upgrade (all off, counts kept), purple
      hover, purple `:focus-visible` outline on Tab, Space toggles, and
      New Draft clears the stored battle so every toggle starts off.
- [x] M22. `npm version minor --no-git-tag-version` (→ 0.7.0) in the same
      PR, and check off Confuse tokens in `BACKLOG.md`.
