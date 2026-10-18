# Spec 18: Bear Trap

> **BUILT.** Architecture for intent 18's scope, all built in one PR
> (plan 18). See [../intent/18_bear-trap.md](../intent/18_bear-trap.md) for the
> product-level problem, scope, and behavior this spec exists to satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-17: React + TypeScript,
  Next.js, static build, no backend.
- **The trap is one shared, top-level value on `BattleState`,** like
  `iceWall` (spec 16): it belongs to the board, not to a team or a hero.
  It's either `null` (in its holder) or the id of the board space it's
  on:
  ```ts
  bearTrap: MapSpaceId | null;
  ```
  `MapSpaceId` already covers every board space (plain, Tower, Bit and
  gold pile) and nothing else, so "any board space, but not the Arena"
  (intent's Scope) is enforced by the type itself. `"arena"` is a
  `HeroPosition`, never a `MapSpaceId`.
- **Snapped to a space, not free-placed** (intent's Scope). This is the
  one big difference from Ice Wall: the trap's drop targets are the
  existing `MapSpace` drop targets, not the board viewport. A drop
  between spaces lands on no target, so nothing happens and the trap
  stays put (intent's Scope), exactly as for a hero today.
- **Two new components,** both rendered only by `BattleMapScreen`
  (intent's Scope: "Map only"), mirroring spec 16's pair:
  - `BearTrapMarker`, the draggable trap.
  - `BearTrapHolder`, the off-board drop target it starts in and
    returns to.
- **A third drag payload type,** next to the hero and Ice Wall ones, so
  the trap never lands in a respawn area, the Arena or the Ice Wall
  holder, and a hero never lands in the trap's holder.
- **One new rules module, `lib/battle/bearTrap.ts`,** with the visibility
  check, like `iceWall.ts`. The reducer stays rule-free.
- Recording the trap is a battle schema bump (14 → 15) with an in-place
  migration that puts the trap in its holder (intent's Constraints).
- **What doesn't change:** the Battle Board (`BattleBoardScreen`,
  `HeroCard`, `BattleTeamPanel`), `MapTeamStatusPanel`, `MapToken`,
  `GoldPilesBar`, `ArenaPanel`, `RespawnAreaStrip`, `ResultsScreen`,
  `WinScreen`, `mapSpaces.ts` (intent's Affected Systems), every hero
  token, `heroPositions`, Ice Wall's storage and placement, and the
  hero-specific token rules (`heroSpecificTokens.ts`).

## State Management
- **`useBattle` (`frontend/src/lib/useBattle.ts`):** one new mutator,
  modelled on `setIceWall`:
  ```ts
  setBearTrap: (spaceId: MapSpaceId | null) => void;
  ```
  Placing, moving (playing the card again) and removing are all this one
  call. `null` sends the trap back to its holder.
- **Nothing else writes the trap** (intent's Scope: "Triggering is
  manual", "Removed by hand only", and Session Lifecycle).
  `setHeroPosition` dropping an enemy onto the trapped space,
  `setHeroOnOffToken` turning on Immobilize, `setHeroHp` taking Boreas to
  0 HP, `setHeroLevel`, `passInitiative` and `setIceWall` all leave it
  alone.
- `useBattle`'s hydrate effect doesn't change. A fresh battle starts with
  `bearTrap: null`, and `clearDraft()` already removes the persisted
  `BattleState`, so a new draft sends the trap back to its holder.
- **`page.tsx`:** passes `battle.setBearTrap` to `BattleMapScreen` as a
  new `setBearTrap` prop, next to `setIceWall`. Nothing goes to
  `BattleBoardScreen`.

## Data Model
- `frontend/src/lib/battle/types.ts`:
  ```ts
  export type BattleState = {
    schemaVersion: 15;
    // p1, p2, goldPiles, initiative, iceWall: unchanged
    /** Boreas's Bear Trap (intent/18): the board space it's on, or `null`
     * while it's in its holder. Changed only by hand: never cleared when
     * an enemy is dropped on its space, on Boreas's defeat, a level
     * change or a new round. */
    bearTrap: MapSpaceId | null;
  };
  ```
- `createInitialBattleState` (`reducer.ts`) writes `bearTrap: null` for
  every battle, whether or not Boreas was drafted. As with the wall, the
  holder's visibility depends on the roster, not the stored value.
- **New reducer action:**
  ```ts
  | { type: "SET_BEAR_TRAP"; spaceId: MapSpaceId | null }
  ```
  - A write equal to the current value returns the same state reference.
  - No roster check and no "is Boreas on this space" check (intent's
    Scope: "The app doesn't check that it's the space Boreas is on"), as
    `SET_ICE_WALL` has none.
  - No clamping is needed: a `MapSpaceId` is either valid or a type
    error.
- **Schema version.** The battle schema is 14 on `main` (Ice Wall took
  13, Runika's Artifacts 14), so Bear Trap takes **15**.
- `frontend/src/lib/persistence/schema.ts`:
  - `CURRENT_BATTLE_SCHEMA_VERSION = 15`. The draft schema doesn't
    change.
  - New `PersistedBattleStateV15` = `PersistedBattleStateV14` plus
    `bearTrap: MapSpaceId | null` and `schemaVersion: 15`. It's the shape
    `saveBattleState` writes and `isValidPersistedBattleState` narrows
    to.
  - `PersistedBattleStateV14` stays the migration source and must not
    gain `bearTrap`. No pin is needed, for the same reason as V12 in
    spec 16: its top-level fields come from `PersistedBattleStateV2`
    onward, never from `BattleState`. Its doc comment says it's now only
    the source for `battleMigrations[14]`.
- `storage.ts`:
  - `saveBattleState` writes `bearTrap: state.bearTrap`, and
    `loadBattleState` returns it.
  - **Validation:** a new `isValidBearTrap(value)` accepts `null` or a
    known space id (the existing `isMapSpaceIdLike`, which checks
    `KNOWN_MAP_SPACE_IDS`). Anything else (missing, a number, `"arena"`,
    an unknown id) is corrupt, as a bad `iceWall` is today.
  - **Migration:** a top-level step, the same shape as `upgradeV12ToV13`:
    ```ts
    /** Schema 14 → 15: a top-level `bearTrap: null` (intent/18: "upgrades
     * in place", with the trap in its holder). */
    function upgradeV14ToV15(data: unknown): PersistedBattleStateV15 | null {
      if (typeof data !== "object" || data === null) return null;
      return {
        ...(data as PersistedBattleStateV14),
        schemaVersion: 15,
        bearTrap: null,
        updatedAt: new Date().toISOString(),
      };
    }
    ```
    `battleMigrations` gains `14: upgradeV14ToV15`. `loadPersisted`
    chains steps, so older saves also land on 15.
- **Test fixtures.** `storage.test.ts` gains a schema-14 upgrade case
  (lands with `bearTrap: null`), a round-trip with a placed trap, and
  validation cases (`null` and a known id such as a gold pile accepted;
  a missing field, `"arena"` and an unknown id rejected). Hand-written
  `BattleState` fixtures gain `bearTrap: null` and the new
  `schemaVersion` literal.

## Bear Trap Logic
All in `frontend/src/lib/battle/bearTrap.ts`, pure and unit-tested in
`bearTrap.test.ts`, the same shape as `iceWall.ts`:

```ts
/** The hero whose power card places the Bear Trap (intent/18). */
const BEAR_TRAP_OWNER: HeroId = "boreas";

/** The side Boreas was drafted on, or `null` if he wasn't. The holder
 * sits in that side's column, and nothing shows when it's `null`. */
export function bearTrapOwnerSide(state: BattleState): PlayerId | null {
  return heroSide(state, BEAR_TRAP_OWNER);
}
```

- **Shown while Boreas is drafted** (intent's Scope: "Hero-specific, at
  any level"), on either team. No level, HP or position check, so the
  trap stays shown at 0 HP, in the respawn area and after his defeat.
- **When it's `null`,** `BattleMapScreen` renders neither the holder nor
  the marker, whatever `bearTrap` holds.
- **The side only places the holder** (intent's Scope: "in Boreas's team
  column"). Either player can drag the trap, as with the wall: the app
  doesn't know who's at the screen, and a misplaced trap must be easy to
  fix.
- **Not a hero-specific token.** It doesn't go in `HERO_SPECIFIC_TOKENS`:
  it isn't on a hero.
- **Nothing enforced** (intent's Scope: "Triggering is manual"). A hero
  dropped onto the trapped space lands there as today. The app doesn't
  immobilize it, doesn't send the trap back and doesn't warn.

## Drag and Drop
- **A third payload type** in `lib/map/dragPayload.ts`, following the
  wall's:
  ```ts
  const BEAR_TRAP_DRAG_MIME_TYPE = "application/x-bfbhelper-bear-trap";

  /** Called from BearTrapMarker's onDragStart. Carries no data: there's
   * only one trap, and where it lands is the space it's dropped on. */
  export function serializeBearTrapDrag(event: DragEvent): void;

  /** Whether a drag is the Bear Trap. Works during the whole drag. */
  export function isBearTrapDrag(event: DragEvent): boolean;
  ```
- **One marker drop hook for both markers.** `useIceWallDropTarget`
  becomes `useMarkerDropTarget(matches, onDrop)` in
  `lib/map/useMarkerDropTarget.ts`: the same body, with
  `useDragHighlight(matches)` and an early return on `!matches(event)`.
  Ice Wall's two callers pass `isIceWallDrag`, the trap's pass
  `isBearTrapDrag`. This avoids a third copy of the same 15 lines.
- **Dropping on a space** (`MapSpace`): each space takes the trap as
  well as heroes. `MapSpace` calls `useHeroDropTarget` as today plus
  `useMarkerDropTarget(isBearTrapDrag, onDropBearTrap)`, and spreads one
  merged set of handlers that calls both. Each hook ignores the other's
  drag (`parseHeroDragPayload` returns `null` for the trap, and the
  marker hook returns early for a hero), so merging is safe. The space
  highlights while either is over it. A new `mergeDropHandlers(a, b)`
  helper in `lib/map/` does the merge, so `MapSpace` stays short.
  `BattleMapScreen` passes `onDropBearTrap={() => setBearTrap(space.id)}`.
- **Dropping between spaces** lands on the board viewport, whose handler
  only takes the Ice Wall. Nothing happens, and the trap stays where it
  was (intent's Scope).
- **Dropping on the holder** calls `setBearTrap(null)`. Dropping the trap
  on a respawn area, the Arena, the Ice Wall holder or a status panel
  does nothing: none of them match its drag type.
- **The Arena stays hero-only** (intent's Scope: "not the Arena"). It
  uses `useHeroDropTarget` alone, so it never highlights for the trap.
- **The Ice Wall lets trap drags through.** The on-board wall already
  gets `pointer-events: none` while a hero is dragged, so a hero can
  land on a space under it (spec 16). The same applies to the trap: the
  `isHeroDragging` flag in `BattleMapScreen` becomes `isSpaceDragging`,
  set on a `dragstart` that is a hero *or* the trap. It's still only
  tracked while the wall is on the board.
- **Hero drops don't change.** The trap marker sits inside the space's
  drop target, so a hero dropped on the trap bubbles to that space and
  lands there.
- **Panning:** `handleMouseDown` already skips any `[draggable="true"]`
  target, so grabbing the trap never starts a pan.

## Layout
- **`BearTrapMarker`** (new, `components/BearTrapMarker/BearTrapMarker.tsx`
  + `.module.css`), shaped like `IceWallMarker`:
  ```ts
  type BearTrapMarkerProps = {
    /** Inline position and zoom counter-scale on the board, or nothing
     * inside BearTrapHolder. */
    style?: CSSProperties;
  };
  ```
  - A `draggable` element with `aria-label="Bear Trap"`, holding a
    line-art bear-trap icon (Assets).
  - The same element renders in both places: inside the trapped space's
    drop target, and in flow inside the holder.
- **On the board, inside its space.** `MapSpace` gets a
  `hasBearTrap: boolean` prop (only `true` for the space in
  `battleState.bearTrap`, while Boreas is drafted) and renders the
  marker inside its `.space` element, above the hero tokens (as on the
  canvas) and below the gold marker in z-order. For Towers and Bits that's the
  hero-standing tile (`heroXPct`/`heroYPct`), not the dial, since the
  trap is where heroes stand.
  - **Next to the heroes, not on them.** The trap shares the space with
    any hero tokens there (intent's Constraints). It sits offset from
    the space's centre, (+30px, +14px) at 100% zoom per the canvas, so
    a stack of fanned-out tokens stays readable.
  - It counter-scales by `1 / Math.sqrt(zoom)`, like hero tokens and the
    wall.
  - Unlike the wall, it needs no pointer-events toggle: a hero dropped
    on it bubbles to the space it's in, which is the right target.
- **`BearTrapHolder`** (new, `components/BearTrapHolder/`), the same
  shape as `IceWallHolder`:
  ```ts
  type BearTrapHolderProps = {
    /** True while bearTrap is null: the marker is drawn inside. */
    holdsTrap: boolean;
    onDrop: () => void;
  };
  ```
  A `<section aria-label="Bear Trap">` drop target using
  `useMarkerDropTarget(isBearTrapDrag, …)`, composing
  `RespawnAreaStrip`'s `area` and `label` CSS like `IceWallHolder`.
  Empty (trap on the board), only its outline shows.
- **Placement: the outer margin of Boreas's team column** (intent's
  Scope). It joins the `.outerZones` box that spec 14's Arena and spec
  16's Ice Wall holder already share, after both: Arena, then Ice Wall,
  then Bear Trap, when their heroes share a team. `outerZones(side)`
  renders when `arenaSide`, `iceWallSide` or `bearTrapSide` is `side`.
  Out of flow, so neither team's column moves.
- **Height at 1280x800.** On its own, or with one other zone, the holder
  fits in the margin well above the fold, as the Ice Wall holder does
  (spec 16: ends by about y=290 below the Arena). The worst case is
  Felix, Dazeem and Boreas all on one team with Felix's Arena showing:
  three zones stacked. Check it in the browser (Open Items).
- **`BattleMapScreen`:** a new `setBearTrap` prop. It computes
  `const bearTrapSide = bearTrapOwnerSide(battleState)` and passes
  `hasBearTrap={bearTrapSide !== null && battleState.bearTrap === space.id}`
  to each `MapSpace`.
- **Not shown** on the Battle Board, `ResultsScreen`, `WinScreen` or in
  `MapTeamStatusPanel` (intent's Scope: "Map only").

## Assets
One new icon for the trap marker: a line-art bear trap (open jaws with
teeth), as an inline SVG in the same 1.5-stroke style as the other token
icons. No raster art. The holder has no icon.

## UI Design Reference
On the same canvas as intents 01-17 ("BfbHelper — App Flow", version
91): https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

- **Only on the "Battle Map — Arena" artboard,** which already holds the
  Map's hero-specific extras (the Arena and Ice Wall), as decided for
  Ice Wall in spec 16. The everyday "Battle Map" artboard stays as it
  was. Boreas is drafted on Player 1 there, defeated and in his respawn
  area.
- **A "Bear Trap" tweak,** next to "Arena" and "Ice Wall", switches
  between **In holder** (the default: the trap in its holder) and
  **Placed** (the trap snapped to Cyrus's Player 1 front-line space, the
  holder empty). In Placed, Boreas is still defeated: the trap stays on
  the board until it's dragged back by hand (intent's Scope).
- **The marker:** emerald (`--color-favored-enemy`, #3fcf86, Boreas's
  colour, as Ice Wall reuses Dazeem's Chill cyan). A 26x26px square tile
  with the wall's dark `rgba(24, 19, 16, 0.9)` fill, a 1.5px emerald
  border and a 6px radius, holding a 16px line-art bear trap (16x16
  viewBox, 1.5 stroke): two curved jaws hinged at the bottom, two teeth
  on each, and a short base plate.
- **Beside the heroes, not on them.** On a space, the tile is offset from
  the space's centre by (+30px, +14px): to the right of the hero token,
  above its name label, so both stay readable. It's drawn above the hero
  tokens.
- **The holder:** styled like Ice Wall's: a "Bear Trap" label in the
  respawn-area heading style with an emerald left bar, over a
  full-width, 48px-tall dashed emerald box on `--color-panel-bg`. Empty,
  only the box shows.
- **It hangs in the margin outside Player 1's column** (decided
  2026-10-18), the same out-of-flow zone column the build uses for the
  Arena and the Ice Wall holder (Layout). Version 91 redrew the whole
  artboard to match the build: Player 2's margin now holds the Arena
  (Felix) and the Ice Wall holder below it, both moved out of the old
  spots (the Arena beside the gold bar, the holder under Player 2's
  column), and the Arena's label now uses the column heading style with
  a gold left bar. The artboard is 1440px wide so both margins fit
  beside the 700px board.

This is a prototype for visual direction only, the same caveat as earlier
intents' references. It settles the marker's colour, icon, size and
offset in a shared space, and the holder's look. If a revised canvas
supersedes these choices, it wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- ~~Draw the trap marker and holder on the canvas, then rewrite UI Design
  Reference.~~
  **Decided:** done (App Flow versions 90-91), on the "Battle Map —
  Arena" artboard only, with an In holder / Placed tweak, and the holder
  in the outer margin zone column with the Arena and Ice Wall. See UI
  Design Reference.
- ~~Confirm the battle schema version at build time.~~
  **Decided:** 15. `main` was at 14 after Runika's Artifacts.
- ~~Check a trap sharing a space with a full fan-out of hero tokens, and
  on a gold-pile space with its gold marker, at 100% and 250% zoom.~~
  **Decided (user, 2026-10-18): keep the fixed (+30px, +14px) offset.**
  With one hero it sits clear beside the token, as on the canvas. With
  four heroes fanned out on the middle gold pile it overlaps the rim of
  the lower-right token at 100%, but no face and not the gold count, and
  stays grabbable; at 250% it sits mostly clear. Pushing it out by the
  fan-out radius was offered and not needed.
- ~~Check the Map at 1280x800 with Felix (Arena showing), Dazeem and
  Boreas on one team: the three stacked zones in the outer margin.~~
  **Decided:** fits with no scroll. The three zones end well above the
  fold in the margin beside Player 1's column.
- ~~Check that `mergeDropHandlers` keeps the space's highlight correct
  when a hero and the trap are dragged in turn over the same space.~~
  **Decided:** each hook keeps its own enter/leave counter, so the
  highlight clears after either drag. Covered by the `BattleMapScreen`
  and `BearTrapHolder` unit tests (a native drag can't be screenshotted
  mid-drag).
