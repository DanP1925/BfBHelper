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
    map/board.jpg                                           # new: staged board art (downscaled/
                                                             #   re-encoded from the 11MB source PNG)
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
  tokens evenly around a small circle centered on the shared node, so it
  holds up the same way for a same-team stack or a cross-team pair
  without special-casing either. The radius isn't flat-then-growing as
  originally planned — it's solved directly from each token's actual
  on-screen footprint (ring *and* name label, not just the 46px ring) so
  that adjacent tokens stay a fixed minimum distance apart at any group
  size; a flat radius visibly overlapped both the rings and their labels
  once rendered against real token art, even at just 3 sharing a space.
  The ring is also rotated so no token ever lands exactly "above center,"
  where its label would otherwise collide with that node's gold-pile
  marker (always topmost).
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

- [x] M1. `data/mapSpaces.ts` (new): `MapSpaceKind`, `MapSpaceDef`, the
      15-entry `MAP_SPACES` array with real, measured `xPct`/`yPct` for
      every node (`p1-bit`, `p2-bit`, `p1-tower-{top,middle,bottom}`,
      `p2-tower-{top,middle,bottom}`, `p1-plain-{1,2}`, `p2-plain-{1,2}`,
      `gold-ne`, `gold-mid`, `gold-sw`), `MapSpaceId`/`GoldPileSpaceId`
      derived types (mirroring `TowerSlot`'s `as const` +
      `(typeof X)[number]` pattern — declared via `as const satisfies
      readonly MapSpaceDef[]` so each entry keeps its literal `kind`/`id`
      type instead of widening to `MapSpaceDef[]`, which is what the
      derived types need to narrow correctly), plus runtime
      `MAP_SPACE_IDS`/`GOLD_PILE_SPACE_IDS` arrays for storage validation.
- [x] M2. `lib/map/constants.ts` (new): `GOLD_PILE_STARTING_COUNT = 3`.
- [x] M3. `lib/battle/bounds.ts`: `clampGoldPile(value) =>
      clamp(value, 0, GOLD_PILE_STARTING_COUNT)`.
- [x] M4. `lib/battle/types.ts`: `BattleTeamState` += `heroPositions:
      Record<HeroId, MapSpaceId | null>`; `BattleState` becomes
      `schemaVersion: 2` += `goldPiles: Record<GoldPileSpaceId, number>`.
- [x] M5. `lib/persistence/schema.ts`: split `CURRENT_SCHEMA_VERSION` into
      `CURRENT_DRAFT_SCHEMA_VERSION = 1` / `CURRENT_BATTLE_SCHEMA_VERSION =
      2`; add `PersistedBattleStateV2`; widen `View` to `"results" |
      "battle" | "map" | "win"`. Also added `LegacyBattleTeamStateV1` — the
      pre-intent-04 on-disk team shape, since `BattleTeamState` itself is
      now the schema-2 shape and no longer describes a raw schema-1 payload.
- [x] M6. `lib/persistence/storage.ts`: `loadPersisted<T>` gains an
      explicit `currentVersion: number` param (both call sites pass their
      own constant — this is the fix that keeps bumping the battle schema
      from also breaking `loadDraft`); `battleMigrations[1]` upgrades a
      schema-1 payload (every existing hero id → `heroPositions[id] =
      null`; `goldPiles` seeded at `GOLD_PILE_STARTING_COUNT` for all 3
      gold ids); `hasValidBattleTeamShape`/`isValidPersistedBattleState`
      extended to validate the two new fields (clear-on-failure, same
      convention as every existing check); `loadView` accepts `"map"`.
- [x] M7. `lib/battle/reducer.ts`: `BattleAction` += `SET_HERO_POSITION`
      (`side`, `heroId`, `spaceId: MapSpaceId | null`) and `SET_GOLD_PILE`
      (`pileId: GoldPileSpaceId`, `value`), both clamp-and-replace with the
      existing no-op-on-unchanged-value convention; `createInitialTeamState`/
      `createInitialBattleState` seed `heroPositions` (all `null`) and
      `goldPiles` (all `GOLD_PILE_STARTING_COUNT`).
- [x] M8. `lib/useBattle.ts`: += `setHeroPosition`/`setGoldPile` mutators
      (same `useCallback` shape as the existing four); `setHeroHp` composes
      a second `SET_HERO_POSITION(side, heroId, null)` dispatch in the same
      update whenever the clamped result is exactly 0 (see Architecture).

### PR C — Tracer bullet: thin end-to-end Map slice

- [x] M9. Stage the asset:
      `~/Documents/Playground/BattleForBiternia/Map Assets/Map.png` →
      `specs/Battle Map/Map.png` (full-resolution source, 2502×2500,
      ~11MB) → `frontend/public/map/board.jpg` (downscaled to 1400px wide,
      re-encoded as JPEG quality 85, ~1.2MB — the source PNG was ~1400x
      larger than every other asset this app serves; no other repo asset
      is anywhere near that size).
- [x] M10. `lib/map/dragPayload.ts` (new): `serializeHeroDragPayload`/
      `parseHeroDragPayload` — shared HTML5 DnD payload helpers used by
      `MapToken` and every drop target.
- [x] M11. `components/ViewToggle/` (new): `{ active, onSwitchView }`,
      two buttons, clicking the inactive one calls `onSwitchView`.
- [x] M12. `components/MapToken/` (new): hero art in a colored p1/p2 ring +
      a plain text label; `draggable`, layout-agnostic (positioning is the
      caller's job). Name-tag visual polish deferred to M18.
- [x] M13. `components/RespawnAreaStrip/` (new): `{ side, label, heroes,
      onDrop }` — vertical column of that side's `heroPositions === null`
      heroes; drop target that rejects a drop whose payload's `side`
      doesn't match.
- [x] M14. `components/screens/BattleMapScreen/` (new), minimal slice:
      top bar (`OverflowMenu` + `ViewToggle active="map"`); a static
      `position:relative; aspect-ratio:1/1` board wrapper around
      `/map/board.jpg`; a screen-local `MapSpace` subcomponent per
      `MAP_SPACES` entry (all 15, real coordinates from M1) that is the
      native-DnD drop target and renders a structure icon (hidden at HP 0)
      plus any hero tokens on that space (no fan-out yet — centered,
      overlapping if more than one); a `RespawnAreaStrip` flanking each
      side (no status panel yet); `ConfirmDialog` for "End Battle", same
      as `BattleBoardScreen`.
- [x] M15. `BattleBoardScreen` += `onSwitchView` prop + `ViewToggle
      active="battle"` next to its `OverflowMenu`. `app/page.tsx` += a
      `view === "map"` branch rendering `BattleMapScreen` with the same
      props `BattleBoardScreen` gets plus `setHeroPosition`; `onSwitchView`
      passed into both screens.
- [x] M16. `npm test` green for this slice's new files
      (`ViewToggle.test.tsx`, `BattleMapScreen.test.tsx` — minimal: a
      hero's token renders on its assigned space, an unplaced hero renders
      in its side's respawn strip, "End Battle" gated on `winner !== null`).
- [x] M17. **Manual end-to-end click-through** (the actual point of a
      tracer bullet): navigate Board → Map, drag a hero out of its respawn
      area onto a node, reload the page, confirm the position survived.
      Do this before starting the widen phase below.

### PR D — Widen to the full spec

- [x] M18. `lib/map/fanOut.ts` (new): `fanOffset(index, total)` — rings N
      tokens sharing one space evenly around it (radius grows mildly past
      4). Wire into `MapSpace`, replacing M14's overlap-if-shared
      rendering; `MapToken` gains its name-tag polish (own out-of-flow
      element, same centering technique as structure HP tags).
- [x] M19. `components/MapTeamStatusPanel/` (new): read-only gold total
      (icon + plain number), a "Heroes" section (name + HP, dimmed at 0),
      a "Structures" section (label + HP text, no icon, dimmed at 0 for
      all 4 — a bespoke row matching Heroes' own style, not a
      `StructureSlot` reuse as originally planned: the mockup's
      Structures rows never had an icon) — slotted next to each side's
      `RespawnAreaStrip` (side by side, not stacked above it as
      originally planned — see M26's follow-up note for why).
- [x] M20. `components/GoldPilesBar/` (new): 3 real `NumberStepper`s
      (`min:0, max:GOLD_PILE_STARTING_COUNT`) labeled "NE"/"Mid"/"SW" from
      each gold id, centered below the board row; `MapSpace`'s gold
      markers become real (read-only icon+count, hidden at 0, topmost
      z-index among the three pin kinds) in place of M14's absence.
- [x] M21. Zoom/pan: board + pin layers wrapped in a CSS transform driven
      by `BattleMapScreen`'s own `useState<{zoom,panX,panY}>` (never
      persisted); fixed zoom steps (100/150/200/250%) via buttons, bonus
      scroll-wheel zoom, click-drag panning clamped to the board's edges.
- [x] M22. `intent/04_battle-map.md`: rename "holding area" → "respawn
      area" throughout (component name, on-screen label, prose), per its
      own staleness note in specs/04.
- [x] M23. Full test suite: `bounds`/`reducer`/`storage`/`useBattle` tests
      from the Test Scenarios list below (whichever weren't already added
      in PR B); `RespawnAreaStrip` cross-team drop rejection;
      `BattleMapScreen.test.tsx` extended for a destroyed structure's icon
      being absent, an emptied gold pile's marker being absent, and a 4+
      hero fan-out not overlapping illegibly.
- [x] M24. `tsc --noEmit`, `eslint --max-warnings=0`, full Vitest suite
      green.
- [x] M25. `e2e/battle-map.spec.ts` (new): draft → battle → switch to Map
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
      - **Partially done already, from this session**: a Playwright
        script (not committed — scratch-only) drove the real flow in a
        live Chromium browser at 1400×900 — draft → battle → Map →
        drag 3 heroes onto the shared "Mid" gold node → verified visible
        fan-out legibility (and caught/fixed two real bugs this way: the
        fan-out radius was too small for 46px rings + name labels, and
        decorative `<img>`s on the board defaulted to native-draggable,
        which could trigger the browser's own image-drag gesture) →
        decremented a gold pile via `GoldPilesBar` → reloaded → confirmed
        both the hero positions and the gold-pile count persisted.
        Still worth a human pass at the exact 13.3"/1280×800 baseline
        (not 1400×900) and a real mouse/trackpad drag, which automation
        doesn't fully stand in for.
      - **Follow-up round, from the user's own direct testing** (after PR
        D was opened, before merge — all committed on top of the same
        `feat/battle-map-widen` branch): five more fixes, each confirmed
        against a running `npm run dev` session rather than the mockup —
        `ViewToggle` moved back to the top bar's left edge next to
        `OverflowMenu` on the right (`justify-content: space-between`),
        matching the mockup exactly — an earlier pass had wrongly grouped
        both on the right and then wrongly "fixed" the *mockup* to match
        that instead of the other way around, caught and reverted;
        `MapTeamStatusPanel`'s Structures rows dropped their icon (text
        only, matching the mockup — this spec's own wording had called
        for reusing `StructureSlot`, which always has one); the panel and
        `RespawnAreaStrip` went from stacked to side-by-side per side
        (too tall stacked at the 1280×800 baseline), then the strip was
        moved to the outer position specifically (farther from the
        board) after the first side-by-side attempt put it board-
        adjacent instead; `MapTeamStatusPanel` was enlarged (140px →
        170px, every font size up) once the layout change freed up
        horizontal room; and drop-target highlighting was added to every
        `MapSpace`/`RespawnAreaStrip` (gold ring/glow on
        `dragenter`/`dragleave`, counter-based to avoid flicker from a
        child element's own enter/leave events) since there was
        previously no way to tell where a drag would actually land.
        `specs/04_battle-map.md`'s Layout and UI Design Reference
        sections are updated to match all five.
      - **Second follow-up round**, same pattern (direct testing against
        `npm run dev`, committed on `feat/battle-map-widen`): the
        multi-hero fan-out radius was tightened twice more (90px/1.1x →
        75px/1.05x → 68px/1.03x footprint/spacing, the last value chosen
        after testing specifically with the longest hero name at group
        sizes 2-4, since the user's bar was "overlap at a single zoom
        level is a problem, overlap only at full 250% zoom is
        acceptable"); structure icons were decoupled from the zoom
        counter-scale applied to hero tokens/the gold marker, so a
        Tower/Bit's icon keeps growing with the board's zoom (staying
        docked on its dial) instead of shrinking to a constant size
        inside a dial that's grown past it (briefly reverted, then
        restored, after the user confirmed on a second look that the
        visual result was in fact what they wanted); and — the larger
        fix — every Tower/Bit's `MapSpaceDef` entry gained a second
        coordinate pair, `heroXPct`/`heroYPct`, after the user identified
        via annotated screenshots of the physical board that the tile
        where heroes actually stand is a separate, nearby spot from the
        dial the structure's icon renders on (previously conflated as
        one position). p1-tower-top and p1-tower-middle's `slot` values
        were also swapped (coordinates unchanged, just which dial each
        name refers to) to match the physical board's own labeling,
        caught during this same round. `specs/04_battle-map.md`'s Data
        Model, Layout, and UI Design Reference sections are updated to
        match.
      - **Third follow-up round**: p2's Middle/Bottom tower `slot`
        values were also swapped (same pattern as p1's top/middle fix
        above, coordinates unchanged) — reducing the Middle tower's HP
        on the Battle Board was hiding the dial that's actually
        visually bottommost among p2's three, since its `slot` didn't
        match its true on-screen vertical order. Also in this round, two
        more fan-out/zoom passes, each refined further after seeing the
        prior attempt rendered:
        1. Reversing the "hero tokens stay a constant on-screen size"
           decision from earlier in this same build — the user found
           that at higher zoom levels, a fixed-size token next to
           visibly-magnified terrain looked disproportionately tiny.
        2. `fanOffset`'s radius was halved (a new `RADIUS_SCALE = 0.5`
           constant) after an 8-hero team fight read as too spread out —
           since the existing formula ties every group size to the same
           inter-token spacing, this also tightened 2-4-hero groups, not
           just large pileups (confirmed acceptable per the user's own
           screenshot of an un-zoomed 8-stack).
        3. Reversing step 1 only *partially*: fully un-scaled hero
           tokens (step 1) compounded with the halved radius (step 2) to
           make a crowded node's overlap get visibly worse at higher
           zoom — the opposite of what the user wanted (overlap is fine
           un-zoomed, not once zoomed in). `MapToken`'s transform gained
           back a counter-scale, but partial: `scale(1 / sqrt(zoom))`,
           not the gold marker's full `1 / zoom`. A token's own rendered
           size still grows with zoom (avoiding step 1's "too tiny"
           complaint, confirmed 46px → 56 → 65 → 73px across the 4 zoom
           steps) but slower than `fanOffset`'s spacing, which still
           scales with the *full*, unscaled zoom — so the gap between
           stacked tokens outgrows each token's own size as zoom
           increases, resolving a crowded node's overlap by 2x zoom even
           though the same stack is still allowed to overlap at 1x.
           Only the gold-pile marker still counter-scales fully to a
           constant size; the structure icon still applies none at all.

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
- p2's 4 Tower/Bit hero-tile coordinates (`heroXPct`/`heroYPct`) are
  derived from p1's via the board's 180°-rotational symmetry, not
  independently measured — the forest-biome art's lower contrast made
  direct measurement unreliable there. Revisit if any look visibly off
  in real gameplay.
