# Plan: BfbHelper v5 — Initiative Indicator

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/05_initiative-indicator.md](../intent/05_initiative-indicator.md)
> and [../specs/05_initiative-indicator.md](../specs/05_initiative-indicator.md).
> Check items off in the PR(s) that do the work, same convention as
> [04_battle-map.md](04_battle-map.md).

## Context

The intent and spec are done and merged (PRs #35, #37). The badge mockup is
on the shared "BfbHelper — App Flow" design artifact's "Battle Board —
Controls" and "Battle Map" artboards. This plan turns them into a build
checklist that extends the v4 codebase (`BattleState`, `useBattle`,
`battleReducer`). There's no new tooling and no new screen.

**Structure: one PR.** The feature is small: one new state field, one
reducer action, one component and two screen wirings. This plan doc ships
in the same PR as the code, not ahead of it the way 03 and 04 did.

## Architecture

```
frontend/src/
  lib/
    draft/selectors.ts        # export otherPlayer (was module-private)
    battle/types.ts           # BattleState: schemaVersion 3, += initiative: PlayerId
    battle/reducer.ts         # += PASS_INITIATIVE; createInitialBattleState(p1, p2, initiative)
    persistence/schema.ts     # CURRENT_BATTLE_SCHEMA_VERSION = 3; += PersistedBattleStateV3
    persistence/storage.ts    # upgradeV1ToV2 / upgradeV2ToV3; [1] composes both, [2] = second;
                              #   validate + save/load initiative
    useBattle.ts              # 3rd param startingInitiative; += passInitiative
  components/
    InitiativeBadge/          # new: { holder, onPass } — one <button>, team-color pill + swap icon
    screens/BattleBoardScreen # += onPassInitiative; badge left of ⋯
    screens/BattleMapScreen   # same
  app/page.tsx                # passes draft.initiative into useBattle; wires both screens
e2e/initiative.spec.ts        # new
```

## Milestone Checklist

### Data & state layer
- [x] M1. `lib/draft/selectors.ts`: export `otherPlayer`.
- [x] M2. `lib/battle/types.ts`: `BattleState.schemaVersion: 3`, += top-level
      `initiative: PlayerId`.
- [x] M3. `lib/persistence/schema.ts`: `CURRENT_BATTLE_SCHEMA_VERSION = 3`,
      += `PersistedBattleStateV3`. `PersistedBattleStateV2` stays as the
      migration source shape.
- [x] M4. `lib/persistence/storage.ts`: pull `upgradeV1ToV2` out of
      `battleMigrations[1]` and add `upgradeV2ToV3`, which defaults
      `initiative` to `loadDraft()?.initiative` and returns `null` if
      there's no draft. `[1]` composes both (`loadPersisted` runs only one
      step) and `[2]` is just the second. Validation requires `initiative`
      to be `"p1"` or `"p2"`. Save/load copy it.
- [x] M5. `lib/battle/reducer.ts`: += `PASS_INITIATIVE` (flips via
      `otherPlayer`, touches nothing else).
      `createInitialBattleState(p1, p2, initiative)`.
- [x] M6. `lib/useBattle.ts`: third param `startingInitiative: PlayerId | null`
      (read only when building a fresh battle) and the `passInitiative`
      mutator.

### UI
- [x] M7. `components/InitiativeBadge/` (new): button with the holder's name
      in team color, inline-SVG swap icon, team-color border, `aria-label`
      and `title` "Initiative: Player N. Pass to Player M.". Fixed 32px
      tall like the ⋯ button: matching `ViewToggle`'s padding came out at
      38px and would have made the top bar 5px taller.
- [x] M8. `BattleBoardScreen` / `BattleMapScreen`: += `onPassInitiative`
      prop. The holder is read from the existing `battleState` prop, so
      there's no separate `initiative` prop (spec updated to match). Badge and `OverflowMenu` grouped on the
      right of `.topBar`.
- [x] M9. `app/page.tsx`: pass `draft.initiative` (gated on
      `phase === "done"`) into `useBattle` and wire both screens.
- [x] M10. Spec open item: decide whether to add a team-color background
      tint, in the browser at 1280x800. **Decided: no tint.** The border
      and name in team color read clearly, and an unfilled pill matches
      the ⋯ button.

### Tests & verification
- [x] M11. Fixtures bumped to schema 3. New tests for: reducer
      `PASS_INITIATIVE`; storage v3 round-trip, v2→v3 and v1→v3 migrations,
      no-draft clear, invalid-`initiative` reject; `useBattle` starting
      holder, pass, and reload keeping the stored holder; `InitiativeBadge`;
      badge on both screens.
- [x] M12. `e2e/initiative.spec.ts`: badge matches the draft's coin-flip
      winner, a tap flips it, and the flip survives a Board⇄Map switch and
      a reload.
- [x] M13. `tsc --noEmit`, ESLint, full Vitest and Playwright suites green.
- [x] M14. Manual QA at 1280x800:
      - badge top right on both screens, not moving on a switch
      - top bar height unchanged
      - ⋯ dropdown still under ⋯
      - an existing v2 battle upgrades in place
      - New Draft resets initiative
- [x] M15. `npm version minor --no-git-tag-version` (→ 0.5.0) in the same PR.
