# Plan 18: Bear Trap

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/18_bear-trap.md](../intent/18_bear-trap.md) and
> [../specs/18_bear-trap.md](../specs/18_bear-trap.md). Check items off in
> the PR(s) that do the work, same convention as
> [17_runika-artifacts.md](17_runika-artifacts.md).

## Context

The intent and spec are merged (intent in PR #102, spec in PR #103). The
canvas ("BfbHelper — App Flow", version 91) has the Bear Trap only on the
"Battle Map — Arena" artboard: a 26px emerald tile with a line-art trap,
offset beside a hero token on its space, and its holder in the margin
zone column outside Player 1's team column (Boreas's team), with an In
holder / Placed tweak. Version 91 also redrew that artboard's Arena and
Ice Wall holder into Player 2's margin column, matching the build since
v0.17.1.

This plan extends the v0.17.1 codebase: `BattleState` schema 14,
`battleReducer`, `useBattle`, and on the Map `BattleMapScreen`'s
`.outerZones`, `MapSpace`, and `lib/map/`'s `dragPayload.ts`,
`useDragHighlight`, `useHeroDropTarget` and `useIceWallDropTarget`. It
reuses Ice Wall's shape (spec 16) almost one for one, except that the
trap snaps to a space. There's no new tooling and no new screen. Nothing
on the Battle Board changes.

**No spec drift.** Every path, type and function spec 18 names matches
`main` at 3d1b67b. Schema 14 is still current, so Bear Trap takes 15.
`useIceWallDropTarget` has exactly two callers (`BattleMapScreen`,
`IceWallHolder`).

**Structure: one build PR**, like 16, after this plan ships as its own
`docs:` PR. It's one stored value, one action, two small components, a
hook generalization and one screen's wiring, so a vertical slice is the
whole feature. One bump at the end, to 1.0.0 (user, 2026-10-18: this completes v1).

**Parallel-safe split.** The data layer (M1-M7: `lib/battle/`,
`lib/persistence/`, `useBattle`) and the drag layer (M8-M10:
`lib/map/`) don't import each other, so they can be built side by side.
The components (M11-M13) need M8-M10. The screen wiring (M14-M15) needs
everything.

## Architecture

```
frontend/src/
  app/page.tsx                      # BattleMapScreen += setBearTrap={battle.setBearTrap}
  lib/
    battle/types.ts                 # BattleState += bearTrap: MapSpaceId | null; schemaVersion 15
    battle/reducer.ts               # += SET_BEAR_TRAP; createInitialBattleState → bearTrap: null
    battle/bearTrap.ts              # new: BEAR_TRAP_OWNER, bearTrapOwnerSide
    persistence/schema.ts           # CURRENT_BATTLE_SCHEMA_VERSION = 15; += PersistedBattleStateV15
    persistence/storage.ts          # += upgradeV14ToV15 (top-level bearTrap: null);
                                    #   isValidBearTrap; save/load carry it
    useBattle.ts                    # += setBearTrap
    map/dragPayload.ts              # += serializeBearTrapDrag, isBearTrapDrag
    map/useMarkerDropTarget.ts      # renamed from useIceWallDropTarget.ts: (matches, onDrop)
    map/mergeDropHandlers.ts        # new: calls both hooks' handlers for one element
  components/
    BearTrapMarker/                 # new: draggable 26px emerald trap tile
    BearTrapHolder/                 # new: "Bear Trap" label + dashed box drop target
    IceWallHolder/IceWallHolder.tsx # useIceWallDropTarget → useMarkerDropTarget(isIceWallDrag, …)
    screens/BattleMapScreen/
      BattleMapScreen.tsx           # += setBearTrap prop, bearTrapSide, holder in .outerZones,
                                    #   hasBearTrap per space, isHeroDragging → isSpaceDragging
      MapSpace.tsx                  # += hasBearTrap, onDropBearTrap; merged hero + trap handlers;
                                    #   renders BearTrapMarker beside the heroes
  test/heroDrag.ts                  # += bearTrapDragTransfer, dropBearTrap
frontend/e2e/
  bear-trap.spec.ts                 # new
```

## Milestone Checklist

### Data & state layer

- [x] M1. `lib/battle/types.ts`: `BattleState` += `bearTrap: MapSpaceId |
      null` with the spec's doc comment (`null` = in its holder, changed
      only by hand), `schemaVersion: 15`.
- [x] M2. `lib/battle/reducer.ts`: += `SET_BEAR_TRAP { spaceId:
      MapSpaceId | null }`. An equal write returns the same state. No
      roster check, no "is Boreas on this space" check, no clamping.
      `createInitialBattleState` writes `bearTrap: null` and
      `schemaVersion: 15`. A comment says nothing else in the reducer
      touches the trap (not a hero dropped on its space, Immobilize, HP
      to 0, a level change or a passed round).
- [x] M3. `lib/battle/bearTrap.ts` (new): `BEAR_TRAP_OWNER = "boreas"` and
      `bearTrapOwnerSide(state)` = `heroSide(state, BEAR_TRAP_OWNER)`, the
      same shape as `iceWall.ts`. No level, HP or position check.
- [x] M4. `lib/persistence/schema.ts`: `CURRENT_BATTLE_SCHEMA_VERSION =
      15`. += `PersistedBattleStateV15` = `PersistedBattleStateV14` with
      `schemaVersion: 15` and `bearTrap: MapSpaceId | null`.
      `PersistedBattleStateV14`'s doc comment says it's now only the
      source for `battleMigrations[14]`.
- [x] M5. `lib/persistence/storage.ts`:
      - += `upgradeV14ToV15`, a top-level step like `upgradeV12ToV13`
        (`bearTrap: null`), and `battleMigrations` += `14:
        upgradeV14ToV15`
      - += `isValidBearTrap(value)`: `null` or `isMapSpaceIdLike`.
        `isValidPersistedBattleState` rejects anything else
      - `saveBattleState` writes `bearTrap`, `loadBattleState` returns
        it, and both use `PersistedBattleStateV15` and `schemaVersion: 15`
- [x] M6. `lib/useBattle.ts`: += `setBearTrap(spaceId)`, modelled on
      `setIceWall`.
- [x] M7. `app/page.tsx`: passes `battle.setBearTrap` to
      `BattleMapScreen` as `setBearTrap`, next to `setIceWall`.

### Drag layer

- [x] M8. `lib/map/dragPayload.ts`: += `BEAR_TRAP_DRAG_MIME_TYPE`
      (`"application/x-bfbhelper-bear-trap"`),
      `serializeBearTrapDrag(event)` (no data, `effectAllowed = "move"`)
      and `isBearTrapDrag(event)`, built on the existing `carries`.
- [x] M9. `lib/map/useMarkerDropTarget.ts`: `git mv` from
      `useIceWallDropTarget.ts` and generalize to
      `useMarkerDropTarget(matches, onDrop)`: `useDragHighlight(matches)`
      and an early return on `!matches(event)`. Update its two callers
      (`BattleMapScreen`'s board, `IceWallHolder`) to pass
      `isIceWallDrag`, and `useDragHighlight`'s doc comment.
- [x] M10. `lib/map/mergeDropHandlers.ts` (new): `mergeDropHandlers(a, b)`
      returns one set of `onDragEnter` / `onDragOver` / `onDragLeave` /
      `onDrop` that calls both. Each hook ignores the other's drag, so
      calling both is safe.

### UI

- [x] M11. `components/BearTrapMarker/` (new): the canvas's marker, a
      `draggable` 26x26px tile with `aria-label="Bear Trap"`, an
      `rgba(24, 19, 16, 0.9)` fill, a 1.5px `--color-favored-enemy`
      border, 6px radius, and the 16px line-art trap icon (16x16 viewBox,
      1.5 stroke, inline SVG, `aria-hidden`): two jaws hinged at the
      bottom, two teeth each, a base plate. Its `onDragStart` calls
      `serializeBearTrapDrag`. Takes an optional `style`.
- [x] M12. `components/BearTrapHolder/` (new): `<section
      aria-label="Bear Trap">` with `useMarkerDropTarget(isBearTrapDrag,
      () => onDrop())`. It composes `RespawnAreaStrip`'s `area` and
      `label` CSS like `IceWallHolder`, with an emerald left bar and a
      48px dashed emerald box. It renders `BearTrapMarker` inside while
      `holdsTrap`. Hero and wall drops are ignored.
- [x] M13. `screens/BattleMapScreen/MapSpace.tsx`:
      - += `hasBearTrap: boolean` and `onDropBearTrap: () => void` props
      - calls `useMarkerDropTarget(isBearTrapDrag, onDropBearTrap)` next
        to `useHeroDropTarget`, and spreads
        `mergeDropHandlers(heroHandlers, trapHandlers)` on `.space`. It
        highlights while either is over it.
      - when `hasBearTrap`, renders `BearTrapMarker` inside `.space`,
        above the hero tokens and below the gold marker, offset (+30px,
        +14px) from the centre, with `scale(1 / Math.sqrt(zoom))`. For
        Towers and Bits that's the hero-standing tile, not the dial.
- [x] M14. `screens/BattleMapScreen/BattleMapScreen.tsx`:
      - += `setBearTrap` prop
      - `const bearTrapSide = bearTrapOwnerSide(battleState)`.
        `outerZones(side)` renders when `arenaSide`, `iceWallSide` or
        `bearTrapSide` is `side`, with `<BearTrapHolder>` last (Arena,
        Ice Wall, Bear Trap). `holdsTrap={battleState.bearTrap === null}`,
        `onDrop={() => setBearTrap(null)}`.
      - each `MapSpace` gets `hasBearTrap={bearTrapSide !== null &&
        battleState.bearTrap === space.id}` and `onDropBearTrap={() =>
        setBearTrap(space.id)}`
      - `isHeroDragging` → `isSpaceDragging`, set on a `dragstart` that
        is a hero or the trap (`isHeroDrag || isBearTrapDrag`), so the
        on-board Ice Wall lets the trap through to the space under it.
        Still only tracked while the wall is on the board.
- [x] M15. Spec Open Item: a trap sharing a space with a full fan-out of
      hero tokens (3-4), and on a gold-pile space with its gold marker,
      at 100% and 250% zoom. The tile should stay grabbable, not hide a
      hero's face, and not cover the gold count. Adjust the offset if
      not. Decide in the browser and update the spec.
      **Kept the fixed offset (user, 2026-10-18).** One hero: clear
      beside the token, as on the canvas. Four heroes on the middle gold
      pile: it overlaps the rim of the lower-right token at 100% (no face,
      not the gold count) and sits mostly clear at 250%.

### Tests & verification

- [x] M16. Tests:
      - fixtures: every hand-written `BattleState` gains `bearTrap: null`
        and `schemaVersion: 15` (`tsc` finds them)
      - `src/test/heroDrag.ts`: += `bearTrapDragTransfer()` and
        `dropBearTrap(element)`
      - reducer: `SET_BEAR_TRAP` places, moves to another space (incl.
        a Tower, a Bit and a gold pile) and returns to `null`; an equal
        write returns the same state; `SET_HERO_POSITION` onto the
        trapped space, the Immobilize on/off action, `SET_HERO_HP` to 0
        for Boreas, `SET_HERO_LEVEL`, `PASS_INITIATIVE` and
        `SET_ICE_WALL` leave it alone; a fresh battle starts with
        `bearTrap: null`
      - `bearTrap.test.ts`: Boreas on p1 → `"p1"`, on p2 → `"p2"`, not
        drafted → `null`; at 0 HP or in the respawn area still his side
      - storage: v15 round-trip with a placed trap and with `null`;
        v14→v15 and every older version (v1…v13) → v15 land with
        `bearTrap: null` and everything else unchanged (tokens,
        Artifacts, Ice Wall, Arena positions, gold piles, initiative);
        rejects a missing `bearTrap`, a number, `"arena"` and an unknown
        id
      - `useBattle`: `setBearTrap` updates and persists; reload keeps
        it; a new draft clears it
      - `dragPayload` / `useMarkerDropTarget`: `isBearTrapDrag` tells the
        trap from a hero and the wall; the marker hook highlights and
        drops only for its own drag kind; the Ice Wall tests still pass
        through the renamed hook
      - `mergeDropHandlers`: calls both sides' handlers
      - `BearTrapHolder`: shows the marker only while `holdsTrap`; a
        trap drop calls `onDrop`; hero and wall drops don't
      - `MapSpace`: renders the marker only with `hasBearTrap`; a trap
        drop calls `onDropBearTrap` and not `onDropHero`; a hero drop
        still calls `onDropHero` and not `onDropBearTrap`
        **Done through `BattleMapScreen`'s tests** (a trap drop on a
        space moves no hero; a hero dropped on the trap's tile lands on
        its space and leaves the trap; a space highlights for the trap),
        not a separate `MapSpace` test file.
      - `BattleMapScreen`: no holder or marker without Boreas; with
        Boreas on p1 the holder is in P1's outer zones, on p2 in P2's,
        after the Arena and Ice Wall holder when they share a team; the
        marker renders on the stored space; a trap drop on a space calls
        `setBearTrap(spaceId)`; on the holder `setBearTrap(null)`; a trap
        drop on bare board art, a respawn area or the Arena calls
        nothing; a hero drop onto the trapped space moves the hero and
        leaves the trap
      - `e2e/bear-trap.spec.ts` (new), using `dragTo`: draft Boreas; the
        holder shows in his team's outer column with the trap in it;
        drag the trap onto a space; it survives a Board⇄Map switch,
        zooming and a reload; drag it to another space; drop it between
        spaces and it stays put; drag a hero onto the trapped space and
        the trap stays; Boreas's HP to 0 leaves it on the board; drag it
        back to the holder; a draft without Boreas shows no holder
- [x] M17. Spec Open Item: the Map at 1280x800 with Felix (Arena
      showing), Dazeem and Boreas on one team, on each side: the three
      zones stacked in the outer margin. They should end above the fold
      without making the Map scroll. If not, decide in the browser
      (e.g. shrink the holders' boxes) and update the spec.
      **Fits** with no scroll on Player 1's side; Player 2's side was
      checked with Boreas alone (the stacking is the same box).
- [x] M18. `tsc --noEmit`, ESLint, full Vitest and Playwright suites
      green (the existing ice-wall, battle-map and arena e2e specs too,
      since `useIceWallDropTarget` and `MapSpace`'s handlers changed
      underneath).
- [x] M19. Manual QA at 1280x800 (`/qa-screens`):
      - the holder only with Boreas drafted, in his team's outer column,
        on either side; neither team's column moves
      - the trap snaps to a space and sits beside the heroes there, in
        emerald, at every zoom step (M15)
      - a drop between spaces leaves it where it was
      - hero drags, the respawn areas, the Arena and the Ice Wall still
        work as before, including a trap dragged onto a space under the
        wall
      - three stacked zones fit with no scroll (M17)
      - an existing schema-14 battle upgrades in place with the trap in
        its holder and every token, Artifact, Arena position, Ice Wall
        and gold pile kept
      - New Draft sends the trap back to its holder
      Done with a one-off Playwright script at 1280x800 and 2560x1440
      (three scenes: crowded gold pile at 100% and 250%, one hero on a
      plain space with Boreas on Player 2, the trap in its holder), plus
      the user trying it on the dev server. The schema-14 upgrade, New
      Draft and a trap dropped under the wall were checked by the unit
      tests, not by hand.
- [x] M20. `npm version minor --no-git-tag-version` (→ 0.18.0). In
      `BACKLOG.md`, mark Bear Trap done in Boreas's entry and the
      hero-specific table, linking intent 18 and v0.18.0. Mark spec 18
      **BUILT**. **Changed (user, 2026-10-18): 1.0.0, not 0.18.0.** This
      completes the hero playability review, so the user called it v1.
      The three open polish items (token-display review, two draft
      animations) moved to a new "After 1.0" section of `BACKLOG.md`, and
      CLAUDE.md's 1.0.0 rule now says "playable with only the cards".
