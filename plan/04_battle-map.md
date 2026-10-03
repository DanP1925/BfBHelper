# Plan: BfbHelper v4 — Battle Map

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/04_battle-map.md](../intent/04_battle-map.md) and
> [../specs/04_battle-map.md](../specs/04_battle-map.md). Written before
> implementation starts — every milestone below is unchecked; check items
> off in the PR(s) that do the actual work, same convention as
> [03_battle-controls.md](03_battle-controls.md).

## Context

Intent and spec are done and merged, plus a reviewed UI mockup (the
"Battle Map" artboard on the shared "BfbHelper — App Flow" design
artifact, right after "Battle Board — Controls"). This plan turns that
into a concrete build checklist, extending the v3 Battle Controls codebase
(`BattleState`, `useBattle`, `battleReducer`) rather than starting anything
new.

No new tooling decisions — same stack as v1-v3 (Next.js static export, CSS
Modules, Vitest + RTL, Playwright for e2e, native HTML5 drag-and-drop per
the `ConfirmDialog` precedent of reaching for a platform primitive before a
library).

**Structure: tracer bullet, not build-all-layers-then-integrate.** The data
layer (schema v2) is naturally small and atomic — a schema-version bump
has no "thin" dimension, so it lands whole. The UI, by contrast, is the
biggest surface this codebase has added in one feature (a new screen, 6 new
components, drag-and-drop, zoom/pan) — so after the data layer, it ships as
a **thin end-to-end slice first** (one hero draggable between its respawn
area and any of the 15 real board nodes, fully wired through `page.tsx`,
persisted, reloadable) to prove the whole path connects before widening to
the full spec (fan-out for multiple heroes per node, the read-only status
panel, the gold-pile stepper bar, zoom/pan). Both the slice and the later
widening are real, permanent code — this is not a throwaway prototype, and
the milestones below are numbered so neither phase reads as cut scope.

Four PRs: plan doc (this file) → data layer → thin Map slice → widen to
full spec. All 15 map-node coordinates are measured against the real,
full-resolution board art as part of the data layer (M1) — 8 of the 15
(every Tower/Bit) were already measured precisely during the earlier
design-mockup session; the remaining 7 (4 exclusive front-line "plain"
nodes + the 3 shared gold-pile nodes) are measured the same way before M1
is written, not left as placeholders.

## Architecture

```
frontend/
  src/
    data/
      mapSpaces.ts            # new: MapSpaceKind, MapSpaceDef, MAP_SPACES (15 entries,
                               #   real xPct/yPct), MapSpaceId, GoldPileSpaceId,
                               #   MAP_SPACE_IDS, GOLD_PILE_SPACE_IDS
    lib/
      map/
        constants.ts          # new: GOLD_PILE_STARTING_COUNT = 3
        dragPayload.ts         # new: serializeHeroDragPayload/parseHeroDragPayload
        fanOut.ts                # new (widen phase): fanOffset(index, total)
      battle/
        types.ts                 # BattleTeamState += heroPositions; BattleState +=
                                  #   schemaVersion:2, goldPiles
        bounds.ts                  # += clampGoldPile
        reducer.ts                   # += SET_HERO_POSITION, SET_GOLD_PILE;
                                      #   createInitial* seed heroPositions/goldPiles
      persistence/
        schema.ts                      # CURRENT_SCHEMA_VERSION splits into
                                        #   CURRENT_DRAFT_SCHEMA_VERSION (1) /
                                        #   CURRENT_BATTLE_SCHEMA_VERSION (2);
                                        #   += PersistedBattleStateV2; View += "map"
        storage.ts                       # loadPersisted gains currentVersion param;
                                          # += battleMigrations[1]; validators extended
      useBattle.ts                         # += setHeroPosition, setGoldPile;
                                            #   setHeroHp composes a respawn dispatch at hp=0
    components/
      ViewToggle/                            # new: two-option Board/Map control
      MapToken/                                # new: ringed hero art + name tag, draggable
      RespawnAreaStrip/                          # new: per-side column of unplaced heroes
      MapTeamStatusPanel/                          # new (widen phase): read-only gold/heroes/structures
      GoldPilesBar/                                  # new (widen phase): 3 real NumberSteppers
      screens/
        BattleMapScreen/                               # new: board + MapSpace drop targets +
                                                        #   flanking columns + status panel/gold bar
        BattleBoardScreen/                               # += onSwitchView, ViewToggle
    app/
      page.tsx                                            # view += "map" branch
  public/
    map/board.png                                           # new: staged board art
e2e/
  battle-map.spec.ts                                          # new (widen phase)
intent/04_battle-map.md                                         # "holding area" -> "respawn area"
specs/Battle Map/Map.png                                         # new: staged source art
```

Key decisions made while planning (spec left these open, or didn't fully
resolve them):
- **`setHeroHp` composes the respawn dispatch itself**, inside `useBattle`,
  not at each screen's call site — the single integration point every
  HP-editing surface goes through, present and future, so a later caller
  can't forget to reposition a defeated hero. Implemented as two reducer
  calls inside one `setState` updater (still two independently-replaceable
  fields, just triggered together); raising HP back above 0 does **not**
  reverse it — respawning is always a separate, explicit `setHeroPosition`
  call.
- **Fan-out is a ring, not a line**: `fanOffset(index, total)` places N
  tokens evenly around a small circle centered on the shared node (radius
  grows mildly past 4), so it holds up the same way for a same-team stack
  or a cross-team pair without special-casing either.
- **`MapSpace` (screen-local to `BattleMapScreen`) is the actual native-DnD
  drop target**, not a separate invisible overlay — native drag events
  bubble, so dropping directly on a token still lands on its parent space.
- **Coordinates are measured, not hand-tool-picked**: rather than shipping
  an in-app dev coordinate-picker that the user clicks through, the 7
  remaining node positions are measured directly against the full-
  resolution `Map.png` using the same crop+gridline technique already used
  for the 8 Tower/Bit nodes — one less temporary component to build and
  delete.
- **`GoldPilesBar` labels derive from each gold id directly**
  (`gold-ne`→"NE", `gold-mid`→"Mid", `gold-sw`→"SW") — no separate id→label
  map to keep in sync.
- **No new RTL test files for every new presentational component** —
  mirrors v3's convention: pure logic and the genuinely interactive new
  leaf components (`ViewToggle`, drag-and-drop on `RespawnAreaStrip`) get
  real unit tests; `MapTeamStatusPanel`/`GoldPilesBar`'s own rendering is
  covered through `BattleMapScreen.test.tsx` instead of standalone files.

## Milestone Checklist

### PR B — Data & state layer

- [ ] M1. `data/mapSpaces.ts` (new): `MapSpaceKind`, `MapSpaceDef`, the
      15-entry `MAP_SPACES` array with real, measured `xPct`/`yPct` for
      every node (`p1-bit`, `p2-bit`, `p1-tower-{top,middle,bottom}`,
      `p2-tower-{top,middle,bottom}`, `p1-plain-{1,2}`, `p2-plain-{1,2}`,
      `gold-ne`, `gold-mid`, `gold-sw`), `MapSpaceId`/`GoldPileSpaceId`
      derived types (mirroring `TowerSlot`'s `as const` +
      `(typeof X)[number]` pattern), plus runtime `MAP_SPACE_IDS`/
      `GOLD_PILE_SPACE_IDS` arrays for storage validation.
- [ ] M2. `lib/map/constants.ts` (new): `GOLD_PILE_STARTING_COUNT = 3`.
- [ ] M3. `lib/battle/bounds.ts`: `clampGoldPile(value) =>
      clamp(value, 0, GOLD_PILE_STARTING_COUNT)`.
- [ ] M4. `lib/battle/types.ts`: `BattleTeamState` += `heroPositions:
      Record<HeroId, MapSpaceId | null>`; `BattleState` becomes
      `schemaVersion: 2` += `goldPiles: Record<GoldPileSpaceId, number>`.
- [ ] M5. `lib/persistence/schema.ts`: split `CURRENT_SCHEMA_VERSION` into
      `CURRENT_DRAFT_SCHEMA_VERSION = 1` / `CURRENT_BATTLE_SCHEMA_VERSION =
      2`; add `PersistedBattleStateV2`; widen `View` to `"results" |
      "battle" | "map" | "win"`.
- [ ] M6. `lib/persistence/storage.ts`: `loadPersisted<T>` gains an
      explicit `currentVersion: number` param (both call sites pass their
      own constant — this is the fix that keeps bumping the battle schema
      from also breaking `loadDraft`); `battleMigrations[1]` upgrades a
      schema-1 payload (every existing hero id → `heroPositions[id] =
      null`; `goldPiles` seeded at `GOLD_PILE_STARTING_COUNT` for all 3
      gold ids); `hasValidBattleTeamShape`/`isValidPersistedBattleState`
      extended to validate the two new fields (clear-on-failure, same
      convention as every existing check); `loadView` accepts `"map"`.
- [ ] M7. `lib/battle/reducer.ts`: `BattleAction` += `SET_HERO_POSITION`
      (`side`, `heroId`, `spaceId: MapSpaceId | null`) and `SET_GOLD_PILE`
      (`pileId: GoldPileSpaceId`, `value`), both clamp-and-replace with the
      existing no-op-on-unchanged-value convention; `createInitialTeamState`/
      `createInitialBattleState` seed `heroPositions` (all `null`) and
      `goldPiles` (all `GOLD_PILE_STARTING_COUNT`).
- [ ] M8. `lib/useBattle.ts`: += `setHeroPosition`/`setGoldPile` mutators
      (same `useCallback` shape as the existing four); `setHeroHp` composes
      a second `SET_HERO_POSITION(side, heroId, null)` dispatch in the same
      update whenever the clamped result is exactly 0 (see Architecture).

### PR C — Tracer bullet: thin end-to-end Map slice

- [ ] M9. Stage the asset:
      `~/Documents/Playground/BattleForBiternia/Map Assets/Map.png` →
      `specs/Battle Map/Map.png` → `frontend/public/map/board.png`.
- [ ] M10. `lib/map/dragPayload.ts` (new): `serializeHeroDragPayload`/
      `parseHeroDragPayload` — shared HTML5 DnD payload helpers used by
      `MapToken` and every drop target.
- [ ] M11. `components/ViewToggle/` (new): `{ active, onSwitchView }`,
      two buttons, clicking the inactive one calls `onSwitchView`.
- [ ] M12. `components/MapToken/` (new): hero art in a colored p1/p2 ring +
      a plain text label; `draggable`, layout-agnostic (positioning is the
      caller's job). Name-tag visual polish deferred to M18.
- [ ] M13. `components/RespawnAreaStrip/` (new): `{ side, label, heroes,
      onDrop }` — vertical column of that side's `heroPositions === null`
      heroes; drop target that rejects a drop whose payload's `side`
      doesn't match.
- [ ] M14. `components/screens/BattleMapScreen/` (new), minimal slice:
      top bar (`OverflowMenu` + `ViewToggle active="map"`); a static
      `position:relative; aspect-ratio:1/1` board wrapper around
      `/map/board.png`; a screen-local `MapSpace` subcomponent per
      `MAP_SPACES` entry (all 15, real coordinates from M1) that is the
      native-DnD drop target and renders a structure icon (hidden at HP 0)
      plus any hero tokens on that space (no fan-out yet — centered,
      overlapping if more than one); a `RespawnAreaStrip` flanking each
      side (no status panel yet); `ConfirmDialog` for "End Battle", same
      as `BattleBoardScreen`.
- [ ] M15. `BattleBoardScreen` += `onSwitchView` prop + `ViewToggle
      active="battle"` next to its `OverflowMenu`. `app/page.tsx` += a
      `view === "map"` branch rendering `BattleMapScreen` with the same
      props `BattleBoardScreen` gets plus `setHeroPosition`; `onSwitchView`
      passed into both screens.
- [ ] M16. `npm test` green for this slice's new files
      (`ViewToggle.test.tsx`, `BattleMapScreen.test.tsx` — minimal: a
      hero's token renders on its assigned space, an unplaced hero renders
      in its side's respawn strip, "End Battle" gated on `winner !== null`).
- [ ] M17. **Manual end-to-end click-through** (the actual point of a
      tracer bullet): navigate Board → Map, drag a hero out of its respawn
      area onto a node, reload the page, confirm the position survived.
      Do this before starting the widen phase below.

### PR D — Widen to the full spec

- [ ] M18. `lib/map/fanOut.ts` (new): `fanOffset(index, total)` — rings N
      tokens sharing one space evenly around it (radius grows mildly past
      4). Wire into `MapSpace`, replacing M14's overlap-if-shared
      rendering; `MapToken` gains its name-tag polish (own out-of-flow
      element, same centering technique as structure HP tags).
- [ ] M19. `components/MapTeamStatusPanel/` (new): read-only gold total
      (icon + plain number), a "Heroes" section (name + HP, dimmed at 0),
      a "Structures" section (reuses `StructureSlot` read-only with
      `reactiveStyling` on Towers only) — slotted above each side's
      `RespawnAreaStrip`.
- [ ] M20. `components/GoldPilesBar/` (new): 3 real `NumberStepper`s
      (`min:0, max:GOLD_PILE_STARTING_COUNT`) labeled "NE"/"Mid"/"SW" from
      each gold id, centered below the board row; `MapSpace`'s gold
      markers become real (read-only icon+count, hidden at 0, topmost
      z-index among the three pin kinds) in place of M14's absence.
- [ ] M21. Zoom/pan: board + pin layers wrapped in a CSS transform driven
      by `BattleMapScreen`'s own `useState<{zoom,panX,panY}>` (never
      persisted); fixed zoom steps (100/150/200/250%) via buttons, bonus
      scroll-wheel zoom, click-drag panning clamped to the board's edges.
- [ ] M22. `intent/04_battle-map.md`: rename "holding area" → "respawn
      area" throughout (component name, on-screen label, prose), per its
      own staleness note in specs/04.
- [ ] M23. Full test suite: `bounds`/`reducer`/`storage`/`useBattle` tests
      from the Test Scenarios list below (whichever weren't already added
      in PR B); `RespawnAreaStrip` cross-team drop rejection;
      `BattleMapScreen.test.tsx` extended for a destroyed structure's icon
      being absent, an emptied gold pile's marker being absent, and a 4+
      hero fan-out not overlapping illegibly.
- [ ] M24. `tsc --noEmit`, `eslint --max-warnings=0`, full Vitest suite
      green.
- [ ] M25. `e2e/battle-map.spec.ts` (new): draft → battle → switch to Map
      → drag a hero from the respawn strip onto a board space (Playwright
      `dragTo`) → switch back to Board, confirm HP edits still work →
      switch to Map again, confirm the position persisted. `npm run
      test:e2e` green.
- [ ] M26. Manual click-through at the 13.3" baseline (1280×800 logical
      px, per CLAUDE.md): board + both flanking columns + `GoldPilesBar`
      all fit without horizontal scroll; drag between respawn area and
      board; zoom/pan; destroyed structure and emptied gold pile both
      disappear reactively; defeat → respawn; load an old (pre-this-
      feature) saved battle and confirm it upgrades instead of resetting;
      4+ heroes fanned onto one node stay legible. Final visual sign-off
      against the mockup.

## Test Scenarios

Pure logic (no React):
1. `lib/battle/bounds.test.ts` — `clampGoldPile`: floor 0, ceiling
   `GOLD_PILE_STARTING_COUNT`, non-finite input falls back to 0.
2. `lib/battle/reducer.test.ts` — `SET_HERO_POSITION`: valid replace
   (`null`→space and space→`null`), no-op (reference-equality) on an
   unchanged value, no-op on an unknown `heroId`, cross-side isolation.
   `SET_GOLD_PILE`: valid clamp+replace, no-op, over/under-range clamp.
   `createInitialTeamState`/`createInitialBattleState`: `heroPositions`
   all `null`, `goldPiles` all `GOLD_PILE_STARTING_COUNT`, `schemaVersion:
   2`.
3. `lib/battle/selectors.test.ts` — no new behavior (`getBattleWinner` is
   untouched), but hand-built fixtures must gain the two new fields to
   keep typechecking under `strict`.

Persistence (`lib/persistence/storage.test.ts`, extended):
4. Hand-written schema-1 payload → `loadBattleState()` → result has
   `schemaVersion: 2`, every existing hero key mapped to `null` in
   `heroPositions`, `goldPiles` with all 3 known ids at
   `GOLD_PILE_STARTING_COUNT`.
5. New-field validation rejection: missing/invalid `heroPositions` entry
   for a known hero; a `heroPositions` value not in `MAP_SPACE_IDS`;
   `goldPiles` missing/extra key or an out-of-range value — each
   clears-and-returns-`null`.
6. **Regression test** (the exact bug the schema-version split exists to
   prevent): a hand-written schema-1 *draft* payload still loads via
   `loadDraft()` after `CURRENT_BATTLE_SCHEMA_VERSION` is bumped to 2.
7. `loadView`/`saveView`: the new `"map"` case round-trips the same way
   `"battle"`/`"win"` already do.

Hook (`lib/useBattle.test.tsx`, extended):
8. `setHeroPosition`/`setGoldPile` each persist their clamped/replaced
   result, mirroring the existing four mutators' tests.
9. `setHeroHp(side, heroId, 0)` also sets `heroPositions[heroId] = null`
   in the same update; raising HP back above 0 afterward does **not**
   restore a position.

New interactive components:
10. `ViewToggle.test.tsx` — clicking the inactive option calls
    `onSwitchView` with the right target; clicking the active one doesn't.
11. `RespawnAreaStrip` — a drop with the *other* side's drag payload is
    rejected (`onDrop` not called).

Screen-level (`BattleMapScreen.test.tsx`, template = `WinScreen.test.tsx`'s
RTL style):
12. A hero's token renders on its assigned space; a hero with
    `heroPositions === null` renders in its side's respawn strip instead.
13. "End Battle" menu item gated on `winner !== null`, same assertion
    style as `BattleBoardScreen` would use.
14. (Widen phase) A destroyed structure's icon is absent; an emptied gold
    pile's marker is absent; a 4-hero fan-out doesn't collapse to one
    point.

Existing v1-v3 suites (draft logic, persistence, `useDraft`, `useBattle`,
`page.test.tsx`) are unaffected except where M5/M6/M15 above touch shared
code (`schema.ts`, `storage.ts`, `page.tsx`) — those changes must not break
any already-passing assertion.

## Follow-ups / Open Items

- Touch/pointer support (both drag-and-drop and zoom/pan) is explicitly
  out of scope per specs/04's Open Items — both CLAUDE.md manual-QA
  baselines are desktop/mouse targets. Revisit only if a touch target is
  ever added.
- No new deploy step — same static Vercel export as v1-v3.
- Per intent 04's Out of Scope: no deployment-tower/reachability
  validation on `SET_HERO_POSITION`, no gold-pile-to-team-gold linkage —
  the app only ever records where a player says a hero/pile currently is.
