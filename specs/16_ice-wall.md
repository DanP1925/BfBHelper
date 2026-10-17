# Spec 16: Ice Wall

> **DRAFT.** Architecture for intent 16's scope. Build-out has not started
> yet. See [../intent/16_ice-wall.md](../intent/16_ice-wall.md) for the
> product-level problem, scope, and behavior this spec exists to satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-15: React + TypeScript,
  Next.js, static build, no backend.
- **The wall is one shared, top-level value on `BattleState`,** like
  `goldPiles` and `initiative`: it belongs to the board, not to a team or
  a hero. It's either `null` (in its holder) or a point on the board art:
  ```ts
  export type IceWallPosition = { xPct: number; yPct: number };
  ```
  `xPct`/`yPct` use the same 0-100 board-art percentages as
  `MapSpaceDef`, so the marker is placed inside `.boardTransform` and
  stays over the same spot at any zoom or pan, with no camera math
  (intent's Constraints).
- **Free placement, no path data** (intent's Scope). The app stores the
  drop point only. `mapSpaces.ts` gains no path list, and nothing works
  out which two spaces the wall separates.
- **Two new components,** both rendered only by `BattleMapScreen`
  (intent's Scope: "Map only"):
  - `IceWallMarker`, the draggable wall.
  - `IceWallHolder`, the off-board drop target the wall starts in and
    returns to.
- **The board viewport becomes a drop target, for the wall only.** A new
  drag payload type keeps the wall and hero drags apart: a hero can't be
  dropped on bare board art, and the wall can't land in a respawn area
  or on a space's hero list.
- **One new rules module, `lib/battle/iceWall.ts`,** with the visibility
  check. The reducer stays rule-free, as for the Arena and hero-specific
  tokens.
- Recording the wall is a battle schema bump with an in-place migration
  that puts the wall in its holder (intent's Constraints). See Data
  Model for the version number.
- **What doesn't change:** the Battle Board (`BattleBoardScreen`,
  `HeroCard`, `BattleTeamPanel`), `MapTeamStatusPanel`, `MapToken`,
  `GoldPilesBar`, `ResultsScreen`, `WinScreen`, `mapSpaces.ts`, every
  hero token, `heroPositions`, and the hero-specific token rules
  (`heroSpecificTokens.ts`).

## State Management
- **`useBattle` (`frontend/src/lib/useBattle.ts`):** one new mutator,
  modelled on `setGoldPile`:
  ```ts
  setIceWall: (position: IceWallPosition | null) => void;
  ```
  Placing, moving and removing are all this one call. `null` sends the
  wall back to its holder.
- **Nothing else writes the wall** (intent's Scope: "Removed by hand
  only", and Session Lifecycle). `setHeroHp` taking Dazeem to 0 HP,
  `setHeroLevel`, `setHeroPosition`, `passInitiative` and every token
  setter leave it alone.
- `useBattle`'s hydrate effect doesn't change. A fresh battle starts
  with `iceWall: null`, and `clearDraft()` already removes the persisted
  `BattleState`, so a new draft sends the wall back to its holder.
- **`page.tsx`:** passes `battle.setIceWall` to `BattleMapScreen` as a
  new `setIceWall` prop, next to `setGoldPile`. Nothing goes to
  `BattleBoardScreen`.

## Data Model
- `frontend/src/lib/battle/types.ts`:
  ```ts
  /** Where Dazeem's Ice Wall sits on the board art (intent/16), in the
   * same 0-100 percentages as MapSpaceDef's xPct/yPct. Free placement:
   * it isn't tied to a path or to the spaces it separates. */
  export type IceWallPosition = { xPct: number; yPct: number };

  export type BattleState = {
    schemaVersion: N; // see "Schema version" below
    // p1, p2, goldPiles, initiative: unchanged
    /** Dazeem's Ice Wall (intent/16): `null` while it's in its holder.
     * Changed only by hand: never cleared on Dazeem's defeat, a level
     * change or a new round. */
    iceWall: IceWallPosition | null;
  };
  ```
- `createInitialBattleState` (`reducer.ts`) writes `iceWall: null` for
  every battle, whether or not Dazeem was drafted. The holder's
  visibility, not the stored value, depends on the roster.
- **New reducer action:**
  ```ts
  | { type: "SET_ICE_WALL"; position: IceWallPosition | null }
  ```
  - The branch clamps `xPct`/`yPct` to 0-100 (a new `clampIceWallPct`
    in `bounds.ts`, next to `clampGoldPile`), so a drop at the board's
    very edge can't store a point the validator rejects.
  - A write equal to the current value (both `null`, or the same
    `xPct`/`yPct`) returns the same state reference.
  - No roster check: it sets the wall whether or not Dazeem is drafted,
    as `SET_HERO_COUNTED_TOKEN` sets a hero-specific token on anyone.
- **Schema version.** The battle schema is 12 on `main` (the Arena took
  11, Favored Enemy 12), so Ice Wall takes **13**.
- `frontend/src/lib/persistence/schema.ts`:
  - `CURRENT_BATTLE_SCHEMA_VERSION = 13`. The draft schema doesn't change.
  - New `PersistedBattleStateV13` = `PersistedBattleStateV12` plus
    `iceWall: IceWallPosition | null` and `schemaVersion: 13`. It's the
    shape `saveBattleState` writes and `isValidPersistedBattleState`
    narrows to.
  - `PersistedBattleStateV12` stays the migration source and must not
    gain `iceWall`. No pin is needed: its top-level fields come from
    `PersistedBattleStateV2` onward, never from `BattleState`, and
    `iceWall` isn't on `BattleTeamState`. Its doc comment says it's now
    only the source for `battleMigrations[12]`.
- `storage.ts`:
  - `saveBattleState` writes `iceWall: state.iceWall`, and
    `loadBattleState` returns it.
  - **Validation:** `isValidPersistedBattleState` accepts `iceWall` that
    is `null` or an object whose `xPct` and `yPct` are finite numbers in
    0-100 (`isNumberInRange`). Anything else (missing, a string, an
    out-of-range point) is corrupt, as a bad `goldPiles` is today.
  - **Migration:** a top-level step, like `upgradeV2ToV3` for
    `initiative`, not `addHeroFieldsStep`:
    ```ts
    /** Schema 12 → 13: a top-level `iceWall: null` (intent/16: "upgrades
     * in place", with the wall in its holder). */
    function upgradeV12ToV13(data: unknown): PersistedBattleStateV13 | null {
      if (typeof data !== "object" || data === null) return null;
      return {
        ...(data as PersistedBattleStateV12),
        schemaVersion: 13,
        iceWall: null,
        updatedAt: new Date().toISOString(),
      };
    }
    ```
    `battleMigrations` gains `12: upgradeV12ToV13`. `loadPersisted`
    chains steps, so older saves also land on 13.
- **Test fixtures.** `storage.test.ts` gains a schema-12 upgrade case
  (lands with `iceWall: null`), a round-trip with a placed wall, and
  validation cases (`null` and an in-range point accepted; a missing
  field, a string and `xPct: 120` rejected). Hand-written `BattleState`
  fixtures gain `iceWall: null` and the new `schemaVersion` literal.

## Ice Wall Logic
All in `frontend/src/lib/battle/iceWall.ts`, pure and unit-tested in
`iceWall.test.ts`:

```ts
/** The hero whose power card places the Ice Wall (intent/16). */
export const ICE_WALL_OWNER: HeroId = "dazeem";

/** The side Dazeem was drafted on, or `null` if he wasn't. The holder
 * sits in that side's column, and nothing shows when it's `null`. */
export function iceWallOwnerSide(state: BattleState): PlayerId | null;
```

- **Shown while Dazeem is drafted** (intent's Scope: "Hero-specific, at
  any level"). `iceWallOwnerSide` checks `ICE_WALL_OWNER in
  state.p1.heroes`, then `state.p2.heroes`, like spec 14's
  `arenaOwnerSide`. There's no level, HP or position check, so a
  defeated Dazeem's wall stays shown.
- **When it's `null`,** `BattleMapScreen` renders neither the holder nor
  the marker, whatever `iceWall` holds. Without Dazeem, the wall can't
  be placed, so it stays `null` in practice.
- **The side only places the holder.** Either team's player can drag the
  wall: the app doesn't know who's at the screen, and a misplaced wall
  must be easy to fix. That's unlike the Arena, which checks *who*
  enters.
- **Not a hero-specific token.** It doesn't go in
  `HERO_SPECIFIC_TOKENS`: it isn't on a hero, and there's no target side.
- **Nothing enforced** (intent's Scope: "Visual only"). Hero drags across
  the wall, and onto spaces beside it, work exactly as today. Nothing
  checks that the wall touches Dazeem's space.

## Drag and Drop
- **A second payload type** in `lib/map/dragPayload.ts`, next to the
  hero one:
  ```ts
  const ICE_WALL_DRAG_MIME_TYPE = "application/x-bfbhelper-ice-wall";

  /** Called from IceWallMarker's onDragStart. Carries no data: there's
   * only one wall. */
  export function serializeIceWallDrag(event: DragEvent): void;

  /** Whether a drag carries the wall. Unlike parseHeroDragPayload, this
   * works during dragenter/dragover too: browsers expose a drag's MIME
   * *types* before drop, just not its data. */
  export function isIceWallDrag(event: DragEvent): boolean;
  ```
  It also adds `isHeroDrag(event)` the same way, for the highlight fix
  below.
- **Dropping on the board** (`BattleMapScreen`): the `.board` viewport
  gets `onDragOver` / `onDrop` handlers that act only when
  `isIceWallDrag(event)`. On drop, the point under the cursor becomes a
  percentage of `.boardTransform`'s on-screen rectangle
  (`getBoundingClientRect()`, which already includes the zoom and pan
  transform):
  ```ts
  const rect = boardTransformRef.current.getBoundingClientRect();
  setIceWall({
    xPct: ((event.clientX - rect.left) / rect.width) * 100,
    yPct: ((event.clientY - rect.top) / rect.height) * 100,
  });
  ```
  The marker is centred on that point. A drop over a `MapSpace` still
  reaches the board: `MapSpace.handleDrop` doesn't stop propagation, and
  its own `parseHeroDragPayload` returns `null` for the wall, so it does
  nothing.
- **Dropping on the holder** calls `setIceWall(null)`. Dropping the wall
  anywhere else (a respawn area, the status panels) does nothing, and
  the wall stays where it was.
- **Hero drops don't change.** The board's new handlers ignore hero
  drags, so a hero dropped on bare board art still does nothing.
  `IceWallHolder` ignores hero drags too.
- **Highlights only for the right drag.** Since the MIME type is
  readable during a drag, the board and holder highlight only while the
  wall is dragged. `lib/map/useHeroDropTarget.ts`, which `MapSpace`,
  `RespawnAreaStrip` and `ArenaPanel` already share, counts only hero
  drags (`isHeroDrag`) in its enter/over/leave handlers, so dragging the
  wall doesn't light up every space it passes. One change covers all
  three. Its drop handler doesn't change.
- **One shared drag counter.** The enter/leave depth counter moves out
  of `useHeroDropTarget` into a private `useDragHighlight(matches)` in
  the same folder. `useHeroDropTarget` passes `isHeroDrag`, and a new
  `useIceWallDropTarget(onDrop)` passes `isIceWallDrag`, so the holder
  and the board reuse it instead of copying it.
- **Panning:** `handleMouseDown` already skips any `[draggable="true"]`
  target, so grabbing the marker never starts a pan.

## Layout
- **`IceWallMarker`** (new, `components/IceWallMarker/IceWallMarker.tsx`
  + `.module.css`):
  ```ts
  type IceWallMarkerProps = {
    /** Inline transform: centring plus the zoom counter-scale. */
    style?: CSSProperties;
  };
  ```
  - A `draggable` element with `aria-label="Ice Wall"`, a fixed
    orientation and no rotate control (intent's Scope). Its art comes
    from the canvas (UI Design Reference).
  - The same element renders in both places: absolutely positioned at
    `iceWall.xPct`/`yPct` inside `.boardTransform`, and in flow inside
    the holder.
  - **On the board,** it's rendered after the `MapSpace`s, so it sits
    above the board art. It counter-scales by `1 / Math.sqrt(zoom)`,
    like hero tokens, so it still grows with the paths it covers but not
    as fast as the art. Checked in the browser (Open Items).
- **`IceWallHolder`** (new, `components/IceWallHolder/`):
  ```ts
  type IceWallHolderProps = {
    /** True while iceWall is null: the marker is drawn inside. */
    holdsWall: boolean;
    onDrop: () => void;
  };
  ```
  - A `<section aria-label="Ice Wall">` drop target using
    `useIceWallDropTarget` for its handlers and highlight, sized for the
    one marker. Empty (wall on the board), it shows only its outline, as
    an empty respawn area does.
- **`BattleMapScreen`:**
  - New props: `setIceWall`, and a `boardTransformRef` on
    `.boardTransform`.
  - Computes `const iceWallSide = iceWallOwnerSide(battleState)`. When
    it isn't `null`, it renders `<IceWallHolder>` in that side's
    `.sideGroup` and, when `battleState.iceWall !== null`, the on-board
    `<IceWallMarker>`.
- **Placement** (canvas, UI Design Reference): **in Dazeem's own team
  column,** the `.sideGroup` holding his team's `MapTeamStatusPanel` and
  `RespawnAreaStrip`, below the respawn area. The wall is Dazeem's, and
  the side columns are already per team; the row under the board stays
  for shared things (the gold piles and the Arena).
- **The team doesn't move** (decided 2026-10-18). Player 1 stays on
  the left and Player 2 on the right, whichever side Dazeem is on. In
  his column, the status panel and respawn area stay exactly where they
  are without the holder, and the holder only adds space below them.
  `BattleMapScreen.module.css`'s `.row` already top-aligns
  (`align-items: flex-start`), so the holder can sit in normal flow at
  the end of the `.sideGroup`. If `.row` is ever centred, the holder has
  to hang out of flow below the column instead, as the canvas draws it.
- **Height at 1280x800.** The holder adds about 75px (label, gap and a
  48px box) to one side column. The board is `min(70vh, 700px)`, about
  560px there, and a column with a busy status panel and the respawn
  area is already close to that, so this column could end up taller
  than the board (Open Items). The holder appears only when Dazeem is
  drafted, which holds for the whole battle, so unlike the Arena it never
  toggles mid-game.
- **Not shown** on the Battle Board, `ResultsScreen`, `WinScreen` or in
  `MapTeamStatusPanel` (intent's Scope: "Map only").

## Assets
One new icon for the wall marker: a line-art brick wall, as an inline
SVG in the same stroke style as the other token icons. It's on the
canvas (UI Design Reference). No raster art. The holder has no icon.

## UI Design Reference
On the same canvas as intents 01-15 ("BfbHelper — App Flow", version
86): https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

- **Only on the "Battle Map — Arena" artboard** (decided 2026-10-18),
  which already holds the Map's hero-specific extras. The everyday
  "Battle Map" artboard stays as it was. Dazeem is drafted there too,
  so the app *would* show the holder on that screen; the artboard just
  leaves it out to stay the plain reference for the Map.
- **An "Ice Wall" tweak,** next to the existing "Arena" one, switches
  between **In holder** (the default: Dazeem in his respawn area, the
  wall in its holder) and **Placed** (Dazeem deployed on a Player 2
  space, the wall on the path between it and the Top Tower's space, the
  holder empty).
- **The marker:** frost cyan (`--color-chill`, Dazeem's colour, as for
  Chill), a small horizontal tile about 42x23px with a dark
  `rgba(24, 19, 16, 0.9)` fill, a 1.5px cyan border and a 6px radius,
  holding a line-art brick-wall icon (24x12 viewBox, 1.5 stroke, a
  rounded rectangle with two rows of staggered joints). It's drawn in
  fixed orientation, above the hero tokens.
- **The holder** (decided 2026-10-18: in Dazeem's own column, with the
  teams kept on their usual sides): in Player 2's column, under the
  respawn area. It's styled like the respawn area above it: an "Ice
  Wall" label in the same heading style, with a cyan left bar instead of
  the team colour, over a full-width, 48px-tall dashed cyan box on
  `--color-panel-bg`. Empty, only the box shows.
- **It hangs below the column.** The canvas centres the side columns
  against the board, so the holder is drawn out of flow, and Player 2's
  panel and respawn area stay level with Player 1's.

This is a prototype for visual direction only, the same caveat as
earlier intents' references. It settles the marker's colour, icon and
fixed orientation, and the holder's column, label and look. If a revised
canvas supersedes these choices, it wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- ~~Draw the wall marker and holder on the canvas, then rewrite UI
  Design Reference and settle the holder's placement in Layout.~~
  **Decided:** done (App Flow version 86), on the "Battle Map — Arena"
  artboard only, with an In holder / Placed tweak. The holder sits in
  Dazeem's team column. See UI Design Reference.
- ~~Confirm the battle schema version at build time.~~
  **Decided:** 13. `main` is at 12 after the Arena (11) and Favored
  Enemy (12).
- Check the marker's size in the browser at every zoom step: with
  `1 / sqrt(zoom)` it should still read as covering a path at 100%, and
  not hide whole spaces at 250%. Switch to the gold marker's full
  `1 / zoom` if it looks too big zoomed in.
- Check a wall sitting on top of a space: the marker is above the
  `MapSpace` drop target, so a hero dropped exactly onto the marker lands
  on the board (and does nothing), not on the space. Paths are between
  spaces, so this should be rare. If it gets in the way, set
  `pointer-events: none` on the marker during a hero drag.
- Check the Map at 1280x800 with Dazeem drafted and his team's status
  panel at its busiest (many token rows wrapping), on each side: does
  his column, with the holder, stay within the board's height without
  making the Map scroll? If not, shrink the holder's box first, before
  touching the status panel or respawn area.
- ~~Decide whether `IceWallHolder` shares the drag-depth counter with
  `RespawnAreaStrip` and `ArenaPanel`.~~
  **Decided:** yes. The Arena's build already moved that counter into
  `lib/map/useHeroDropTarget.ts`, so it's split into a shared
  `useDragHighlight(matches)` for the hero and wall hooks (Drag and
  Drop).
