# Plan 14: The Arena

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/14_to-the-pain-arena.md](../intent/14_to-the-pain-arena.md)
> and [../specs/14_to-the-pain-arena.md](../specs/14_to-the-pain-arena.md).
> Check items off in the PR(s) that do the work, same convention as
> [13_chill-tokens.md](13_chill-tokens.md).

## Context

The intent and spec are merged (intent in PR #82, spec in PR #84). The
canvas ("BfbHelper — App Flow", version 80) has a separate "Battle Map —
Arena" artboard below "Battle Map": Felix in place of Vladiator on Player
2, and the Arena beside the gold piles under the board, a gold dashed box
with a small "The Arena" label on top. Its "Arena" tweak switches between
Duel (Felix and Agatha Trunch inside) and Empty. "Battle Map" and "Battle
Board" are unchanged. This plan turns them into a build checklist that
extends the v0.13.0 codebase (`BattleState` schema 10,
`heroPositions: Record<HeroId, MapSpaceId | null>`, `SET_HERO_POSITION`,
`setHeroHp`'s 0-HP → respawn side effect, `RespawnAreaStrip`,
`MapToken`, `parseHeroDragPayload` and `BattleMapScreen`'s `teams`
loop). There's no new tooling, no new screen and no new art.

**Structure: one build PR**, like 12 and 13, after this plan ships as its
own `docs:` PR. The feature is a widened type, one rules module, one
version-only migration and one Map component: a vertical slice small
enough for one `feat:` PR, with one minor bump (→ 0.14.0) at the end.

**Schema number.** Intent 15 (Favored Enemy) is scoped and also needs a
battle schema bump. Whichever builds first takes 11; the other rebases
onto it and takes 12. The milestones below assume the Arena goes first.

**Parallel-safe split.** The data layer (M1-M6) and the rules module
(M7-M8) touch only `lib/` and `data/`, and M7 needs M1's type.
`ArenaPanel` (M10) imports only `MapToken`, `parseHeroDragPayload` and
the `Hero`/`PlayerId` types, none of which change, so it can be built
side by side with M1-M8. `BattleMapScreen`'s wiring (M11) needs both.

## Architecture

```
frontend/src/
  data/mapSpaces.ts             # seedHeroPositions returns Record<HeroId, HeroPosition>
  lib/
    map/constants.ts            # += ARENA_POSITION = "arena"
    battle/types.ts             # += HeroPosition = MapSpaceId | "arena" | null;
                                #   heroPositions: Record<HeroId, HeroPosition>; schemaVersion 11
    battle/reducer.ts           # SET_HERO_POSITION.spaceId: HeroPosition; casts → HeroPosition;
                                #   createInitialBattleState writes schemaVersion 11
    battle/arena.ts             # new: ARENA_OWNER, ARENA_UNLOCK_LEVEL, arenaOwnerSide,
                                #   arenaOccupants, isArenaShown, canEnterArena
    persistence/schema.ts       # CURRENT_BATTLE_SCHEMA_VERSION = 11; += LegacyBattleTeamStateV10
                                #   (old positions), PersistedBattleStateV11
    persistence/storage.ts      # positions accept ARENA_POSITION; += upgradeV10ToV11
                                #   (version only); V10 → V11 payload types
    useBattle.ts                # setHeroPosition(…, position: HeroPosition)
  components/
    ArenaPanel/ArenaPanel.tsx   # new: { occupants, canDrop, onDrop }, "The Arena" label
    ArenaPanel/ArenaPanel.module.css  # new: gold dashed box, small label on top
    screens/BattleMapScreen/    # teams loop += arena list; bottom row = GoldPilesBar + ArenaPanel
      BattleMapScreen.tsx       #   (only while isArenaShown); setHeroPosition prop widens
      BattleMapScreen.module.css
    RespawnAreaStrip/, MapSpace, MapToken,   # no code change
    MapTeamStatusPanel/, Board components
frontend/e2e/
  arena.spec.ts                 # new
```

## Milestone Checklist

### Data & state layer

- [x] M1. `lib/map/constants.ts`: += `ARENA_POSITION = "arena" as const`.
      `lib/battle/types.ts`: += `HeroPosition = MapSpaceId | typeof
      ARENA_POSITION | null` with the spec's doc comment;
      `BattleTeamState.heroPositions: Record<HeroId, HeroPosition>` (its
      comment points at `HeroPosition`); `BattleState.schemaVersion: 11`.
- [x] M2. `lib/battle/reducer.ts`: `SET_HERO_POSITION`'s `spaceId:
      HeroPosition` (branch unchanged, no Arena rule);
      `createInitialBattleState`'s cast → `HeroPosition`, writes
      `schemaVersion: 11`. `data/mapSpaces.ts`: `seedHeroPositions`'s
      return type → `Record<HeroId, HeroPosition>` if that drops the
      casts, else leave it. **Left as is:** its `MapSpaceId | null` return
      already fits `HeroPosition`, so `createInitialTeamState` just drops
      its cast (and the schema-1 migration keeps the narrow type).
- [x] M3. `lib/useBattle.ts`: `setHeroPosition`'s last parameter →
      `HeroPosition`, in the type and the callback. `setHeroHp` unchanged.
- [x] M4. `lib/persistence/schema.ts`: `CURRENT_BATTLE_SCHEMA_VERSION =
      11`. += `LegacyHeroPositions` and `LegacyBattleTeamStateV10`
      (`BattleTeamState` with the old positions);
      `LegacyBattleTeamStateV9` builds on it instead of
      `BattleTeamState`; `PersistedBattleStateV10.p1/p2` use it, doc
      comment says it's only the source for `battleMigrations[10]`. +=
      `PersistedBattleStateV11`. `tsc` confirms no older legacy type
      widened. **Wider than planned:** `LegacyBattleTeamStateV2` and
      `V4`-`V9` were all built from `BattleTeamState`, so all of them now
      build on `LegacyBattleTeamStateV10`. No separate
      `LegacyHeroPositions` alias; spec updated.
- [x] M5. `lib/persistence/storage.ts`: `hasValidBattleTeamShape`
      accepts `ARENA_POSITION` (doc comment: "`null`, `"arena"` or a real
      map-space id"); += `upgradeV10ToV11` (version only, the spec's
      snippet), `battleMigrations` += `10: upgradeV10ToV11`;
      `saveBattleState`, `isValidPersistedBattleState` and the import use
      `PersistedBattleStateV11`.
- [x] M6. Fixtures: every hand-written `BattleState` /
      `PersistedBattleState` fixture's `schemaVersion` literal → 11
      (`tsc` finds them). No field changes.

### Arena rules

- [x] M7. `lib/battle/arena.ts` (new), per the spec's Arena Logic:
      `ARENA_OWNER = "felix"`, `ARENA_UNLOCK_LEVEL = 4` (its own
      constant, not `HERO_MAX_LEVEL`), `arenaOwnerSide(state)` (from
      `state.p1/p2.heroes`), `arenaOccupants(state)` (P1 first),
      `isArenaShown(state)` (occupied, or Felix drafted, `level >= 4`,
      `hp > 0` and position not `null`), `canEnterArena(state, payload)`
      (Felix on his side, or an enemy when no *other* enemy is inside).
- [x] M8. `lib/battle/arena.test.ts` (new):
      - `arenaOwnerSide`: Felix on p1 → `"p1"`, on p2 → `"p2"`, not
        drafted → `null`
      - `isArenaShown`: false without Felix; false at level 1-3; true at
        4 on a space; false at 4 with 0 HP, and at 4 with HP but in the
        respawn area; true whenever anyone is inside, even with Felix at
        level 1, at 0 HP or not drafted (a hand-edited save)
      - `canEnterArena`: Felix → true; an enemy into an empty or
        Felix-only Arena → true; a second enemy → false; the enemy
        already inside → true; Felix's ally → false; any hero without
        Felix → false; HP and level don't matter
      - `arenaOccupants`: P1 before P2, empty when nobody is in

### UI

- [x] M9. `components/ArenaPanel/ArenaPanel.module.css` (new): the
      canvas's look. A column with a small label on top (Cinzel 9px,
      600, uppercase, `--color-gold`, letter-spacing 0.06em), then a
      dashed `--color-gold` box on `--color-panel-bg`, sized for two
      `MapToken`s with room below for their out-of-flow names (about
      132x76px), and a drag-over highlight like `RespawnAreaStrip`'s.
- [x] M10. `components/ArenaPanel/ArenaPanel.tsx` (new): props
      `{ occupants, canDrop, onDrop }`; `<section aria-label="The
      Arena">` with "The Arena" label; drag-enter/leave depth counter and
      highlight copied from `RespawnAreaStrip`; `drop` parses with
      `parseHeroDragPayload` and calls `onDrop` only when `canDrop`
      passes. Occupants are plain `MapToken`s in their team ring.
- [x] M11. `components/screens/BattleMapScreen/BattleMapScreen.tsx`:
      `setHeroPosition` prop → `HeroPosition`; the `teams` loop sorts
      `ARENA_POSITION` into a new `arena` list (never into `bySpace`);
      `boardColumn`'s gold bar becomes a row (new class in
      `BattleMapScreen.module.css`) holding `GoldPilesBar` and, only when
      `isArenaShown(battleState)`, `<ArenaPanel>` with
      `canDrop={(p) => canEnterArena(battleState, p)}` and
      `onDrop={({ side, heroId }) => setHeroPosition(side, heroId,
      ARENA_POSITION)}`. `page.tsx` needs no change (check).
- [x] M12. Spec open item: at 1280x800 with the Arena shown and two
      heroes inside, the Map doesn't scroll and the side columns and
      board keep their size. Decide whether the bottom row keeps the
      Arena's height while it's hidden, so the board doesn't move when
      Felix reaches level 4 or the Arena empties. Decide in the browser
      and update the spec. **Decided: out of flow.** In the gold bar's row
      it moved the board up 19px and pushed the side columns out (bar +
      Arena are wider than the board). Now the bar stays centered in a
      `position: relative` `.bottomRow` and the Arena sits in an absolute
      `.arenaSlot` to its right, top-aligned, hanging below Player 2's
      column. Measured: board and side columns identical hidden, empty and
      full; Arena ends at 775px of 800, no scroll. No reserved height.
- [x] M13. Spec open item: the gold label and dashed border read as
      neutral and not as a gold-pile control next to `GoldPilesBar`.
      Decide in the browser; adjust on the canvas and in the spec if not.
      **Kept:** the label and dashed box read as a separate drop zone.
- [x] M14. Spec open item: `ArenaPanel` copies `RespawnAreaStrip`'s
      ~20 lines of drag-depth handling. Leave it copied unless
      `/simplify` flags it; note the outcome in the spec. **Copied;**
      `/simplify` wasn't run on this PR.

### Tests & verification

- [x] M15. Unit tests:
      - reducer: `SET_HERO_POSITION` to `"arena"` and back out to a space
        and to `null`; same-value no-op; it doesn't refuse Felix's ally
        (no rule in the reducer); `createInitialBattleState` writes 11
      - `useBattle`: a hero in the Arena dropping to 0 HP goes to `null`;
        `setHeroLevel` and `passInitiative` leave Arena positions alone;
        an Arena position persists and survives a reload
      - storage: v11 round-trip with `"arena"`; v10→v11 and v1…v9→v11
        migrations (every position kept, Arena empty); validation
        accepts `"arena"` and rejects an unknown string
      - `ArenaPanel.test.tsx` (new): renders occupants with their names;
        a drop calls `onDrop` when `canDrop` passes and not when it
        fails; a malformed payload is ignored
      - `BattleMapScreen.test.tsx`: no Arena without Felix or below level
        4; an empty Arena at level 4; occupants shown in the Arena and
        not on their space; the panel stays while occupied with Felix
        set back to level 1; dropping Felix's ally or a second enemy
        changes nothing
- [x] M16. `e2e/arena.spec.ts` (new), using `battle-map.spec.ts`'s
      `dragElementTo`: draft Felix; no Arena on the Map until he's level
      4 on the Board and deployed; drag Felix and one enemy in (both
      leave their spaces), a second enemy and one of Felix's allies are
      refused; the Arena survives a Board⇄Map switch and a reload; the
      enemy's HP to 0 sends them to their respawn area and the Arena
      stays for Felix; dragging Felix onto his Bit empties it; it hides
      again once empty if Felix's level is set below 4. **Diverged:** it
      drags Felix out onto the board's center space, not his Bit (the
      Bit's side depends on the coin flip), and uses its own small
      `dragTo` helper, since `battle-map.spec.ts`'s isn't exported.
- [x] M17. `tsc --noEmit`, ESLint, full Vitest and Playwright suites green
      (`battle-map.spec.ts` too, since positions widened underneath).
- [x] M18. Manual QA at 1280x800 (`/qa-screens`):
      - Arena hidden without Felix, and with him below level 4 or
        defeated; shown at level 4
      - drag in, drag out to a space and to the respawn area; refused
        drops leave the hero where it was
      - fit and layout shift (M12); gold reads neutral (M13)
      - the Board shows nothing new
      - an existing schema-10 battle upgrades in place with every
        position kept and the Arena empty
      - New Draft empties the Arena

      **Done in the browser** with one-off Playwright scripts at 1280x800
      and 2560x1440: hidden with Felix at level 4 still in his respawn
      area, shown empty once deployed, Felix and an enemy dragged in
      (screenshots `arena-{hidden,empty,duel}-*.png`); fit and layout
      shift (M12); gold (M13); a schema-10 save rewritten by hand upgraded
      to 11 with gold, level and Felix's space kept and nobody in the
      Arena; New Draft cleared the saved battle. Refused drops, dragging
      out and the defeated case are covered by the e2e and unit tests
      rather than separately by eye. The Board has no code change.
- [x] M19. `npm version minor --no-git-tag-version` (→ 0.14.0). In
      `BACKLOG.md`, mark the Arena done in Felix's entry and the
      hero-specific table, linking intent 14 and v0.14.0. Mark spec 14
      **BUILT**.
