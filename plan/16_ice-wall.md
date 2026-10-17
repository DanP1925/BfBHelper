# Plan 16: Ice Wall

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/16_ice-wall.md](../intent/16_ice-wall.md) and
> [../specs/16_ice-wall.md](../specs/16_ice-wall.md). Check items off in
> the PR(s) that do the work, same convention as
> [15_favored-enemy.md](15_favored-enemy.md).

## Context

The intent and spec are merged (intent in PR #85, spec in PR #93), and
`d50a55f` split Bear Trap off as its own backlog item. The canvas
("BfbHelper — App Flow", version 86) has the Ice Wall only on the "Battle
Map — Arena" artboard: a frost-cyan brick-wall marker, and its holder
hanging below Player 2's column (Dazeem's team) under the respawn area,
with an In holder / Placed tweak. This plan turns that into a build
checklist that extends the v0.15.0 codebase (`BattleState` schema 12,
`battleReducer`, `useBattle`, `BattleMapScreen` with the Arena's
`bottomRow`, and `lib/map/`'s `dragPayload.ts` and `useHeroDropTarget`).
There's no new tooling and no new screen. Nothing on the Battle Board
changes.

**Spec drift fixed in this PR.**
- The Arena's build already moved the drop-target drag counter into
  `lib/map/useHeroDropTarget.ts`, shared by `MapSpace`,
  `RespawnAreaStrip` and `ArenaPanel`. Spec 16 now changes that one hook
  instead of "a two-line change in each", and splits its counter into a
  shared `useDragHighlight` for the new wall hook. That settles the
  spec's drag-counter Open Item.
- `PersistedBattleStateV12` takes its top-level fields from
  `PersistedBattleStateV2` onward, never from `BattleState`, so it
  doesn't need pinning against `iceWall`. The spec says so instead of
  "pin it if it widens".

**Structure: one build PR**, like 13 and 15, after this plan ships as its
own `docs:` PR. It's one stored value, one action, two small components
and one screen's wiring, so a vertical slice is the whole feature. One
minor bump (→ 0.16.0) at the end.

**Parallel-safe split.** The data layer (M1-M7: `lib/battle/`,
`lib/persistence/`, `useBattle`) and the drag layer (M8-M9:
`lib/map/`) don't import each other, so they can be built side by side.
The two components (M10-M11) need M8-M9. The screen wiring (M12-M14)
needs everything.

## Architecture

```
frontend/src/
  app/page.tsx                  # BattleMapScreen += setIceWall={battle.setIceWall}
  lib/
    battle/types.ts             # += IceWallPosition; BattleState += iceWall; schemaVersion 13
    battle/bounds.ts            # += clampIceWallPct (0-100)
    battle/reducer.ts           # += SET_ICE_WALL; createInitialBattleState → iceWall: null
    battle/iceWall.ts           # new: ICE_WALL_OWNER, iceWallOwnerSide
    persistence/schema.ts       # CURRENT_BATTLE_SCHEMA_VERSION = 13; += PersistedBattleStateV13
    persistence/storage.ts      # += upgradeV12ToV13 (top-level iceWall: null);
                                #   validates iceWall; save/load carry it
    useBattle.ts                # += setIceWall
    map/dragPayload.ts          # += serializeIceWallDrag, isIceWallDrag, isHeroDrag
    map/useDragHighlight.ts     # new: the enter/leave depth counter, for one drag kind
    map/useHeroDropTarget.ts    # counter → useDragHighlight(isHeroDrag)
    map/useIceWallDropTarget.ts # new: useDragHighlight(isIceWallDrag) + onDrop(event)
  components/
    IceWallMarker/              # new: draggable frost-cyan brick-wall tile
    IceWallHolder/              # new: "Ice Wall" label + dashed box drop target
    screens/BattleMapScreen/    # += setIceWall prop, boardTransformRef, board wall drop,
                                #   marker on the board, holder in Dazeem's .sideGroup
  test/heroDrag.ts              # fakeDataTransfer += types; += dropIceWall
frontend/e2e/
  ice-wall.spec.ts              # new
```

## Milestone Checklist

### Data & state layer

- [ ] M1. `lib/battle/types.ts`: += `IceWallPosition = { xPct: number;
      yPct: number }` with the spec's doc comment. `BattleState` +=
      `iceWall: IceWallPosition | null` (doc: `null` = in its holder,
      changed only by hand), `schemaVersion: 13`.
- [ ] M2. `lib/battle/bounds.ts`: += `clampIceWallPct(value)`, 0-100,
      next to `clampGoldPile`.
- [ ] M3. `lib/battle/reducer.ts`: += `SET_ICE_WALL { position:
      IceWallPosition | null }`. It clamps both coordinates and returns
      the same state for an equal write (both `null`, or the same point).
      No roster check. `createInitialBattleState` writes `iceWall: null`
      and `schemaVersion: 13`. A comment says nothing else in the reducer
      touches the wall (not HP to 0, a position change or a passed
      round).
- [ ] M4. `lib/battle/iceWall.ts` (new): `ICE_WALL_OWNER = "dazeem"` and
      `iceWallOwnerSide(state)`, the side whose `heroes` hold Dazeem, else
      `null`, like `arenaOwnerSide`. No level, HP or position check.
- [ ] M5. `lib/persistence/schema.ts`: `CURRENT_BATTLE_SCHEMA_VERSION =
      13`. += `PersistedBattleStateV13` = `PersistedBattleStateV12` with
      `schemaVersion: 13` and `iceWall: IceWallPosition | null`.
      `PersistedBattleStateV12`'s doc comment says it's now only the
      source for `battleMigrations[12]`.
- [ ] M6. `lib/persistence/storage.ts`:
      - += `upgradeV12ToV13`, a top-level step like `upgradeV2ToV3`
        (`iceWall: null`), and `battleMigrations` += `12:
        upgradeV12ToV13`
      - `isValidPersistedBattleState` accepts `iceWall` that is `null`
        or an object whose `xPct` and `yPct` are numbers in 0-100
        (`isNumberInRange`), and rejects anything else
      - `saveBattleState` writes `iceWall`, `loadBattleState` returns it,
        and both use `PersistedBattleStateV13` and `schemaVersion: 13`
- [ ] M7. `lib/useBattle.ts`: += `setIceWall(position)`, modelled on
      `setGoldPile`. `app/page.tsx` passes `battle.setIceWall` to
      `BattleMapScreen`.

### Drag layer

- [ ] M8. `lib/map/dragPayload.ts`: += `ICE_WALL_DRAG_MIME_TYPE`,
      `serializeIceWallDrag(event)` (no data, `effectAllowed = "move"`),
      `isIceWallDrag(event)` and `isHeroDrag(event)`. Both checks read
      `event.dataTransfer.types`, which browsers expose during a drag,
      unlike the data.
- [ ] M9. `lib/map/`:
      - `useDragHighlight.ts` (new): `useHeroDropTarget`'s enter/over/
        leave depth counter and `isDragOver`, counting only drags that
        `matches(event)`. Its `onDragOver` only calls `preventDefault`
        for a matching drag.
      - `useHeroDropTarget.ts` uses `useDragHighlight(isHeroDrag)`. Its
        drop handler doesn't change, so `MapSpace`, `RespawnAreaStrip`
        and `ArenaPanel` need no edit, but stop lighting up for the wall.
      - `useIceWallDropTarget.ts` (new): `useDragHighlight(isIceWallDrag)`
        plus a drop handler that calls `onDrop(event)` only for a wall
        drag (the board needs the event's `clientX`/`clientY`).

### UI

- [ ] M10. `components/IceWallMarker/` (new): the canvas's marker, a
      `draggable` tile with `aria-label="Ice Wall"`, an
      `rgba(24, 19, 16, 0.9)` fill, a 1.5px `--color-chill` border, 6px
      radius, and the brick-wall icon (24x12 viewBox, 1.5 stroke, inline
      SVG, `aria-hidden`). Its `onDragStart` calls
      `serializeIceWallDrag`. Takes an optional `style` for its on-board
      transform. No rotate control.
- [ ] M11. `components/IceWallHolder/` (new): `<section
      aria-label="Ice Wall">` with `useIceWallDropTarget(() => onDrop())`.
      It has the respawn area's heading style with a cyan left bar
      instead of the team colour, over a full-width, 48px dashed cyan box
      on `--color-panel-bg`. It renders `IceWallMarker` inside while
      `holdsWall`. Hero drops are ignored.
- [ ] M12. `screens/BattleMapScreen/BattleMapScreen.tsx`:
      - += `setIceWall` prop and a `boardTransformRef` on
        `.boardTransform`
      - `const iceWallSide = iceWallOwnerSide(battleState)`. When it isn't
        `null`, render `<IceWallHolder>` last in that side's
        `.sideGroup`, under its `RespawnAreaStrip`. `.row` already
        top-aligns, so the team's panel and respawn area don't move.
        Check that in the browser (M16).
      - `.board` gets `useIceWallDropTarget`'s handlers. On drop, the
        point under the cursor becomes a percentage of
        `boardTransformRef`'s `getBoundingClientRect()` and goes to
        `setIceWall`. The board highlights only while the wall is dragged.
      - When `iceWallSide !== null && battleState.iceWall !== null`,
        render `IceWallMarker` inside `.boardTransform` after the
        `MapSpace`s, at `xPct`/`yPct`, with `translate(-50%, -50%)
        scale(1 / Math.sqrt(zoom))`
- [ ] M13. Spec Open Item: the marker's size at every zoom step (100%,
      150%, 200%, 250%). With `1 / sqrt(zoom)` it should read as covering
      a path at 100% without hiding whole spaces at 250%. Switch to the
      full `1 / zoom` if not. Decide in the browser and update the spec.
- [ ] M14. Spec Open Item: a wall dropped onto a space. The marker sits
      above the `MapSpace` drop target, so a hero dropped exactly on it
      lands on the board and does nothing. If that gets in the way in
      practice, set `pointer-events: none` on the on-board marker while a
      hero is dragged. Decide in the browser and update the spec.

### Tests & verification

- [ ] M15. Tests:
      - fixtures: every hand-written `BattleState` gains `iceWall: null`
        and `schemaVersion: 13` (`tsc` finds them:
        `BattleMapScreen.test.tsx`, `selectors.test.ts`,
        `storage.test.ts`, …)
      - `src/test/heroDrag.ts`: `fakeDataTransfer` gains a `types` list
        that `setData` fills; += `dropIceWall(element, { clientX,
        clientY })`
      - `bounds.test.ts`: `clampIceWallPct` clamps below 0 and above 100
      - reducer: `SET_ICE_WALL` places, moves and returns to `null`;
        clamps out-of-range points; equal writes (both `null`, same point)
        return the same state; `SET_HERO_HP` to 0 for Dazeem,
        `SET_HERO_POSITION`, `SET_HERO_LEVEL` and `PASS_INITIATIVE` leave
        it alone; a fresh battle starts with `iceWall: null`
      - `iceWall.test.ts`: Dazeem on p1 → `"p1"`, on p2 → `"p2"`, not
        drafted → `null`; at 0 HP, level 1 or in the respawn area still
        his side
      - storage: v13 round-trip with a placed wall and with `null`;
        v12→v13 and every older version (v1…v11) → v13 land with
        `iceWall: null` and everything else unchanged (tokens, Favored
        Enemy, Arena positions, gold piles, initiative); rejects a
        missing `iceWall`, a string, a missing coordinate, a non-number
        and `xPct: 120`
      - `useBattle`: `setIceWall` updates and persists; reload keeps it;
        a new draft clears it
      - `dragPayload` / `useDragHighlight`: `isIceWallDrag` and
        `isHeroDrag` tell the two apart from `types`; a hero drop target
        doesn't highlight for a wall drag, and the wall hook doesn't for
        a hero drag
      - `IceWallHolder`: shows the marker only while `holdsWall`; a wall
        drop calls `onDrop`; a hero drop doesn't
      - `BattleMapScreen`: no holder or marker without Dazeem; with
        Dazeem on p1 the holder is in P1's column, on p2 in P2's; the
        marker renders at the stored point inside the board; a wall drop
        on the board calls `setIceWall` with the cursor's percentage; a
        wall drop on the holder calls `setIceWall(null)`; a hero drop on
        bare board art calls nothing; a wall drop on a space doesn't move
        any hero
      - `e2e/ice-wall.spec.ts` (new), using `dragElementTo`: draft
        Dazeem; the holder shows in his team's column with the wall in
        it; drag the wall onto the board; it survives a Board⇄Map switch,
        zooming and panning (same spot on the art) and a reload; drag it
        to another spot; Dazeem's HP to 0 leaves it on the board; drag it
        back to the holder; a draft without Dazeem shows no holder
- [ ] M16. Spec Open Item: the Map at 1280x800 with Dazeem drafted and
      his team's status panel at its busiest (many token rows wrapping),
      on each side. His column, with the holder, stays within the board's
      height without making the Map scroll, and the other column doesn't
      move. If it doesn't fit, shrink the holder's box first. Decide in
      the browser and update the spec.
- [ ] M17. `tsc --noEmit`, ESLint, full Vitest and Playwright suites
      green (the existing battle-map and arena e2e specs too, since
      `useHeroDropTarget` changed underneath).
- [ ] M18. Manual QA at 1280x800 (`/qa-screens`):
      - the holder only with Dazeem drafted, in his team's column, on
        either side; neither team's panel or respawn area moves
      - dragging the wall: only the board and holder light up, not the
        spaces or respawn areas
      - the marker reads as a wall on a path, in frost cyan, at every
        zoom step (M13), and over a space (M14)
      - hero drags, the respawn areas and the Arena still work as before
      - fits with no scroll, with the Arena shown too (M16)
      - an existing schema-12 battle upgrades in place with the wall in
        its holder and every token, Arena position and gold pile kept
      - New Draft sends the wall back to its holder
- [ ] M19. `npm version minor --no-git-tag-version` (→ 0.16.0). In
      `BACKLOG.md`, mark Ice Wall done in Dazeem's entry and the
      hero-specific table, linking intent 16 and v0.16.0 (Bear Trap stays
      open). Mark spec 16 **BUILT**.
