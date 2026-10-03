# Spec: BfbHelper v4 — Battle Map

> **DRAFT.** Architecture for intent 04's scope. Build-out has not started
> yet. See [../intent/04_battle-map.md](../intent/04_battle-map.md) for
> the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as v1-v3 — React + TypeScript, Next.js,
  static build, no backend.
- One new screen, `BattleMapScreen`, joins `StartScreen` /
  `DraftBoardScreen` / `ResultsScreen` / `BattleBoardScreen` / `WinScreen`
  in `frontend/src/components/screens/`. Everything else is new
  components/state layered onto intent 03's existing `BattleState`, the
  same relationship intent 03 had to intent 02's static Battle Board.
- No new top-level data store: per intent's Affected Systems, hero
  position and the 3 gold-pile counts are new fields on the *same*
  persisted `BattleState` intent 03 already reads/writes/reloads —
  there's no separate "map state" hook or storage key.

## State Management
- `view` (`frontend/src/lib/persistence/schema.ts`) gains a fourth
  literal: `"results" | "battle" | "map" | "win"`. `loadView`
  (`storage.ts`) accepts `"map"` alongside `"battle"`/`"win"` as a valid
  stored value; `saveView` is unchanged (any non-`"results"` value is
  written as-is). This supersedes specs/03's description of `View`.
  - Entry into `"map"` only happens from `"battle"` (or back again) via
    the new toggle below — `ResultsScreen`'s "Start Battle" still lands
    on `"battle"` first, unchanged from specs/02-03, since intent's
    Proposed Outcome frames the Map as something reached *while a battle
    is in progress*, not a new entry point of its own.
- `useBattle` (`frontend/src/lib/useBattle.ts`) gains two mutators,
  alongside the existing `setGold`/`setHeroHp`/`setHeroLevel`/
  `setStructureHp`:
  - `setHeroPosition(side: PlayerId, heroId: HeroId, spaceId: MapSpaceId | null) => void`
    — `null` means "in that team's respawn area." Dragging a hero out of
    its respawn area, onto another space, or back into its respawn area
    (on defeat, or a manual correction) all resolve to one call.
  - `setGoldPile(pileId: MapSpaceId, value: number) => void` — the 3
    neutral gold piles aren't per-side, so this mutator takes no `side`
    argument, unlike every other mutator on this hook.
  - Both are plain `useCallback`s dispatching into `battleReducer`, same
    shape as the four existing mutators — no new hook, no second
    reducer.
- **Schema version split (a necessary fix uncovered by this intent):**
  today, `frontend/src/lib/persistence/schema.ts` defines one shared
  `CURRENT_SCHEMA_VERSION` used by `loadPersisted` for *both* the draft
  payload and the battle-state payload (`storage.ts`). Bumping only the
  battle-state schema (below) against that single shared constant would
  make `loadDraft` also expect version 2 and treat every existing
  persisted draft (`schemaVersion: 1`) as needing a migration that
  doesn't exist for drafts — clearing it as corrupt. This spec splits
  the constant in two: `CURRENT_DRAFT_SCHEMA_VERSION = 1` (unchanged
  behavior for `loadDraft`) and `CURRENT_BATTLE_SCHEMA_VERSION = 2` (new).
  `loadPersisted`'s signature gains an explicit `currentVersion` parameter
  instead of closing over the one shared module constant, so each caller
  (`loadDraft`, `loadBattleState`) passes its own.

## Data Model
- `frontend/src/lib/battle/types.ts` — `BattleState` and
  `BattleTeamState` both change shape (schema version 2):
  ```ts
  export type BattleTeamState = {
    gold: number;
    heroes: Record<HeroId, { hp: number; level: number }>;
    structures: StructuresState;
    /** `null` = this hero is in its team's respawn area (not yet
     * deployed, or defeated and awaiting respawn) — see Map Logic. */
    heroPositions: Record<HeroId, MapSpaceId | null>;
  };

  export type BattleState = {
    schemaVersion: 2;
    p1: BattleTeamState;
    p2: BattleTeamState;
    /** The board's 3 neutral bonus-gold piles — shared state, not
     * per-team, unlike everything else on BattleState. */
    goldPiles: Record<GoldPileSpaceId, number>;
  };
  ```
  `heroPositions` lives on `BattleTeamState` (keyed like `heroes`
  already is) rather than as a third top-level map, so a hero's HP,
  level, and position all travel together per side — consistent with
  how `heroes` already groups HP+level.
- **New file `frontend/src/data/mapSpaces.ts`** — the board's node graph,
  the data this intent's Scope calls "cataloging every space exactly as
  drawn on the board art":
  ```ts
  export type MapSpaceKind = "plain" | "tower" | "bit" | "gold";

  export type MapSpaceDef = {
    id: string;
    kind: MapSpaceKind;
    /** Percent coordinates (0-100) of this space's center on the board
     * art, used for absolute positioning — see Layout. */
    xPct: number;
    yPct: number;
    /** "tower"/"bit", and the 4 exclusive "plain" front-line nodes (2
     * per side): which team this belongs to. The 3 "gold" nodes are
     * always shared/neutral and leave this `undefined`. */
    side?: PlayerId;
    /** Only present for "tower" — which of the 3 slots. */
    slot?: TowerSlot;
  };

  export const MAP_SPACES: MapSpaceDef[] = [ /* catalog — see Open Items */ ];

  export type MapSpaceId = (typeof MAP_SPACES)[number]["id"];
  export type GoldPileSpaceId = Extract<MapSpaceDef, { kind: "gold" }>["id"];
  ```
  `MapSpaceId`/`GoldPileSpaceId` are derived types, not hand-maintained
  unions — the same pattern `TowerSlot` already uses
  (`(typeof TOWER_SLOTS)[number]`), so the catalog data is the single
  source of truth and the types can't drift from it.

  The full hero-placement graph the board defines is small and exact —
  confirmed directly against the physical board, not inferred from the
  art — 15 nodes total, back-to-front per side:
  - 1 `"bit"` node per side (2 total) — the team's Bit.
  - 3 `"tower"` nodes per side (6 total) — Top/Middle/Bottom, reusing
    that existing naming.
  - A 7-node front line, where each side has 5 front-line nodes but 3 of
    those are the *same* physical nodes the other side's 5 also include
    (a shared, contested strip where both sides' front lines meet):
    - 2 `"plain"` nodes exclusive to each side (4 total, `side` set to
      their owning team) — open ground, nothing to interact with.
    - The 3 shared nodes *are* the board's 3 neutral bonus-gold piles —
      `kind: "gold"`, `side` always `undefined`. There's no separate
      gold-only space anywhere else on the board; farming and the
      shared front line are the same 3 nodes, not two overlapping sets.
  This resolves the open question the Scope's "cataloging every space
  exactly as drawn" raised: the board's much denser-looking tile art
  (the many individually-highlighted squares visible across it) is
  walkable-looking decoration, not additional discrete stopping points
  — the real graph tops out at these 15 nodes. See Open Items for the
  one thing still outstanding: each node's actual `xPct`/`yPct`.
- **New constant**, `frontend/src/lib/map/constants.ts`:
  `GOLD_PILE_STARTING_COUNT = 3` — both the starting value and the
  ceiling for each gold pile.
- **New bounds helper**, alongside `clampGold`/`clampHeroHp`/etc. in
  `frontend/src/lib/battle/bounds.ts`: `clampGoldPile(value) => clamp(value, 0, GOLD_PILE_STARTING_COUNT)`.
- **Validation** (`frontend/src/lib/persistence/storage.ts`):
  - `hasValidBattleTeamShape` additionally requires `heroPositions` to
    have an entry for every key already present in `heroes`, each either
    `null` or a string matching some `MAP_SPACES` entry's `id`.
  - `isValidPersistedBattleState` additionally requires `goldPiles` to
    have exactly the 3 keys that are `MAP_SPACES`' `kind: "gold"` ids,
    each a number in `[0, GOLD_PILE_STARTING_COUNT]`.
  - Both reuse the existing clear-on-failure convention — a map-shape
    mismatch invalidates the whole persisted battle state, same as an
    out-of-range HP does today.
- **Migration** (the `battleMigrations` record in `storage.ts`, currently
  empty, built for exactly this): `battleMigrations[1]` upgrades a raw
  schema-1 payload to schema 2 — per intent's Constraints ("upgrades in
  place rather than resetting"):
  - For each side, add `heroPositions`: every hero id already present
    under that side's `heroes` maps to `null` (its team's respawn area).
  - Add top-level `goldPiles`: each of the 3 gold-pile ids from
    `MAP_SPACES` maps to `GOLD_PILE_STARTING_COUNT` (3).
  - Everything else (`gold`, `heroes`, `structures`) passes through
    unchanged. The migrated object then flows into the normal
    `isValidPersistedBattleState` check like any freshly-loaded payload.
- `createInitialTeamState`/`createInitialBattleState`
  (`frontend/src/lib/battle/reducer.ts`) are updated to populate
  `heroPositions` (all `null`) and `goldPiles` (all
  `GOLD_PILE_STARTING_COUNT`) on a brand-new battle, matching what the
  migration invents for an upgraded one — a fresh battle and an upgraded
  mid-battle reload end up in the same shape either way.

## Map Logic
- New `BattleAction` variants in `battleReducer`
  (`frontend/src/lib/battle/reducer.ts`), alongside the 4 existing ones:
  - `SET_HERO_POSITION` (`side`, `heroId`, `spaceId: MapSpaceId | null`) —
    a pure replace on that hero's `heroPositions` entry. No validation
    that `spaceId` is reachable from the hero's previous space, no
    deployment-tower check — per intent's Out of Scope, the app only
    records where a player says a hero is.
  - `SET_GOLD_PILE` (`pileId: MapSpaceId`, `value: number`) — clamps
    through `clampGoldPile` and replaces that one entry in the top-level
    `goldPiles` map. Never touches either team's `gold` — per intent,
    these are deliberately unlinked.
  - Both follow the existing reducer's no-op convention (return the same
    state reference when the clamped/targeted value doesn't actually
    change).
- **Defeat → respawn area** is driven from the UI layer, not the
  reducer: when a `setHeroHp` call brings a hero to 0, the call site
  (inside `useBattle`, or `BattleBoardScreen`/`BattleMapScreen`'s HP
  handler) also calls `setHeroPosition(side, heroId, null)` in the same
  gesture. This is two dispatches rather than one combined action,
  mirroring the rest of this codebase's one-mutator-one-field philosophy
  (no mutator reads or changes a second field) — HP and position are
  still two independently-replaceable fields, just triggered together by
  this one user action. Respawning (dragging the hero back out) is the
  ordinary `setHeroPosition` call, unprompted by any HP change.
- **A destroyed Structure (HP 0) disappears from the Map** — purely
  reactive rendering (`structures[slot] === 0` hides that structure's
  icon on the board), not a new piece of state. Matches intent's
  "reusing the same HP state the Battle Board already tracks rather than
  a separate flag."
- The win condition (`getBattleWinner`, `lib/battle/selectors.ts`) is
  completely unchanged — it only ever reads `structures.bit`, which the
  Map screen doesn't touch. "End Battle" stays available from either
  screen's `OverflowMenu` once `winner !== null` (below), since the
  battle itself doesn't care which screen is showing.

## Layout
- **New screen `BattleMapScreen`**
  (`frontend/src/components/screens/BattleMapScreen/`), structured as:
  - A top bar matching `BattleBoardScreen`'s (same `OverflowMenu`, same
    menu items/logic — "New Draft" always, "End Battle" when
    `winner !== null`), plus the new `ViewToggle` (below).
  - The board itself: a single `position: relative` wrapper around the
    board art (`/map/board.png`, `aspect-ratio: 1 / 1` to match
    `Map.png`'s native square dimensions so percent-based coordinates
    stay accurate at any rendered width), with one absolutely-positioned
    layer per space kind:
    - Structure icons (existing `/structures/tower-{red,blue}.png` /
      `bit-{red,blue}.png`, reused as-is) at each `kind: "tower"`/`"bit"`
      space's `xPct`/`yPct`, hidden when that structure's HP is 0.
    - Gold piles: a read-only marker (existing gold icon + the pile's
      current count, no controls) at each `kind: "gold"` space, hidden
      once that pile reaches 0 — same reactive convention as a
      destroyed Structure disappearing (Map Logic, above). Rendered on
      its own top
      stacking layer (highest `z-index` of the three pin kinds), so a
      hero token or structure icon landing near a pile can never
      visually bury it. The 3 piles are also where heroes actually stand
      (Data Model, above), so the marker is deliberately *not*
      interactive here — a `NumberStepper` squeezed onto the same node
      as 1-2 hero tokens has nowhere to go without overlapping them.
    - Hero tokens: new `MapToken` component at each hero's current
      `heroPositions` space (or in a respawn area strip, if `null`).
      Reuses `hero.battleToken` art (no new per-hero art) inside a small
      colored ring — `border-color: var(--color-p1)` /
      `var(--color-p2)` matching the existing Tower/Bit team colors —
      since the Map mixes both teams on one board, unlike the Battle
      Board's two separate panels. A small name tag sits just below the
      token (own absolutely-positioned element, like the structure
      labels below), so identifying a hero never requires dragging it or
      opening the Board.
  - **Multiple heroes sharing a space** fan out via a small CSS offset
    per index within that space's group (computed at render time by
    grouping all heroes whose `heroPositions[heroId]` equals that
    space's id) — purely visual, no new state, no cap on how many can
    stack (matching the physical game's unlimited post-deployment
    stacking). This explicitly includes **both teams sharing one node**:
    the 3 gold-pile nodes are the graph's only shared front-line spaces
    (Data Model, above), so a p1 and a p2 token can legitimately fan out
    together right on top of a gold pile — exactly the case the colored
    ring (red/blue) exists to keep legible, not just same-team stacking.
  - **Two `RespawnAreaStrip` components** (new,
    `frontend/src/components/RespawnAreaStrip/`), one per side, flanking
    the board — left/right columns rather than above/below it, so the
    board itself can run larger — each renders that side's `MapToken`s
    whose `heroPositions` entry is `null`. This renames intent 04's
    "holding area" to "respawn area" throughout the UI (component name,
    on-screen label, code comments); intent 04's own wording still says
    "holding area" and should be updated to match when next touched.
  - **New `MapTeamStatusPanel` component** (new,
    `frontend/src/components/MapTeamStatusPanel/`), one per side, sitting
    above that side's `RespawnAreaStrip` in the same flanking column — a
    read-only complement to the Map's purely positional view, added so a
    quick HP/gold check doesn't always need a trip to the Battle Board.
    This was chosen over merging the Board and Map into one screen: the
    Board's per-hero editing controls need the full 2×2 card grid they
    already have, which doesn't fit in a narrow side column without
    either losing those controls or widening the column enough to crowd
    the board back down — so the two screens (and the toggle between
    them) stay exactly as intent 04 scoped them; this panel only adds a
    glance-level summary alongside the Map, nothing editable. Renders:
    - The team label and gold total (icon + plain number — no
      `NumberStepper`; this panel has no editable controls at all).
    - Each of the team's 4 heroes: name + HP (small heart icon + number,
      dimmed at `hp === 0` — same reactive convention `HeroCard`'s
      battle variant already uses, just without the token art or level).
    - Each of the 4 structures: short label (Top/Middle/Bottom/Bit) + HP,
      dimmed at `hp === 0` (same convention `StructureSlot`'s
      `reactiveStyling` already uses for Towers).
    - No new props beyond what `BattleMapScreen` already receives
      (`battleState[side]`, that side's `Hero[]`) — this is a rendering-
      only addition, not a data-plumbing one.
  - **New `GoldPilesBar` component** (new,
    `frontend/src/components/GoldPilesBar/`), centered below the
    board/respawn-column row, spanning the same width — this is where
    `setGoldPile`'s actual `NumberStepper`s live, since the board itself
    only shows a read-only marker (above). One entry per gold-pile
    space, each a gold icon + `NumberStepper(value, min: 0, max:
    GOLD_PILE_STARTING_COUNT)` under a short position label (e.g. "NE" /
    "Mid" / "SW", matching that pile's rough location on the board) so
    it's clear which stepper controls which marker.
- **Drag and drop**: native HTML5 drag-and-drop (`draggable`,
  `onDragStart`/`onDragOver`/`onDrop`) — no new dependency, consistent
  with specs/03's `ConfirmDialog` precedent of reaching for the platform
  primitive before adding a library. `MapToken.onDragStart` puts
  `{ side, heroId }` in the drag payload; every space and both respawn
  area strips are drop targets that parse the payload and call
  `setHeroPosition`. This is desktop/mouse-oriented — see Open Items for
  why that's an acceptable default here, not an oversight.
- **Zoom and pan**, so the whole board doesn't have to stay visible at
  once (useful once the full plain-space catalog fills it in): the
  board art and every pin layer sit inside one additional wrapper that
  takes a CSS `transform: translate(panX, panY) scale(zoom)`; the
  viewport around it clips with `overflow: hidden` at a fixed size, so
  zooming/panning only ever affects what's *visible* — it never touches
  a space's underlying `xPct`/`yPct`, which stay in the board's own
  coordinate space regardless of zoom level. `zoom` steps through a
  fixed set (100% default, then 150% / 200% / 250%) via a small
  +/−/Reset control that sits outside the transformed layer (so it
  never moves or scales itself); scroll-wheel zoom is a bonus on top of
  the buttons, not a replacement for them. Panning is click-and-drag,
  clamped so the board can never be dragged past its own edge into
  empty space. This is entirely local UI state —
  `BattleMapScreen`'s own `useState`, not a `BattleState` field — a
  reload always starts back at 100%, un-panned, same as switching away
  from the Map and back.
- **New shared `ViewToggle` component**
  (`frontend/src/components/ViewToggle/`) — a small two-option
  Board/Map control, placed in both `BattleBoardScreen`'s and
  `BattleMapScreen`'s top bar next to the `OverflowMenu` (not inside it —
  per intent, this is a core, frequently-used action, unlike the menu's
  exceptional ones). Calls a shared `onSwitchView(target: "battle" | "map")`
  prop that both screens receive from `page.tsx`.
- `page.tsx` wiring: a new `view === "map"` branch renders
  `BattleMapScreen` with the same `p1Heroes`/`p2Heroes`/`battleState`/
  `winner`/`onNewDraft`/`onEndBattle` props `BattleBoardScreen` already
  takes, plus `setHeroPosition`/`setGoldPile` from `useBattle` and the
  shared `onSwitchView` (also newly passed to `BattleBoardScreen`).

## Assets
- `Map.png` (`~/Documents/Playground/BattleForBiternia/Map Assets/Map.png`,
  2502×2500px) is staged into a new `specs/Battle Map/` folder (this
  intent's own feature-named source-art folder, per CLAUDE.md's "source
  art assets it uses live in `specs/<Feature Name>/`" convention —
  distinct from the existing `specs/Battle Board/` folder intents 02-03
  already populated, which this intent also reuses hero tokens and
  structure icons from, unchanged), then copied into
  `frontend/public/map/board.png` for the app to serve.
- No other new art: hero tokens, Tower/Bit icons, and the gold icon are
  all already in `frontend/public/heroes-tokens/` and
  `frontend/public/structures/` from intent 02, reused as-is per
  intent's Constraints.

## UI Design Reference
A "Battle Map" artboard was added to the same Claude design artifact as
intents 01-03 ("BfbHelper — App Flow"), right after "Battle Board —
Controls": https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK. It depicts
the same in-progress battle the Board/Controls artboards already show
(same heroes, HP, gold, structure state), now positioned on the real
`Map.png` art, and resolves (as a starting point, not a final decision)
several things this spec left open above:
- The respawn-area strips flank the board left/right, each with a
  working `MapTeamStatusPanel` (team + gold, then a labeled "Heroes"
  section of name/HP rows, then a labeled "Structures" section of
  label/HP rows, visually separated by a divider, both dimmed reactively
  at 0 HP) sitting above it.
- `MapToken`'s ring is sized tight to the hero art itself (not a fixed
  oversized box) and reads clearly once the hero's own token art is
  rendered at roughly 46px tall — both figures worth matching in build.
  Each on-board token also carries a small name tag beneath it (own
  out-of-flow element, same technique as the structure HP tags below),
  so identifying a hero never depends on the status panel or a drag.
- Every Tower/Bit icon is centered exactly on its dial in the board art,
  measured against the full-resolution source rather than a downscaled
  preview — the plain-space catalog (still an Open Item below) should
  get the same treatment. The mockup's 6 on-board heroes are likewise
  now positioned against the real 15-node structure (Data Model, above)
  rather than scattered across open terrain: 2 per side sit on that
  side's own exclusive front-line nodes, and one hero from each side
  shares one of the gold-pile nodes together — a concrete example of the
  cross-team stacking the fan-out logic (Layout, above) has to handle.
  These are still illustrative placements, not the nodes' measured
  coordinates (the same Open Item as the structure spaces).
- Zoom (100%/150%/200%/250%, buttons + scroll-wheel) and click-drag pan,
  clamped so the board can't be dragged past its own edge, plus a
  corner-brackets "fit" icon in place of a text "Reset" — no numeric
  zoom readout, since it wasn't adding anything the +/− buttons didn't
  already convey.
- The 3 gold-pile markers on the board are read-only (icon + count,
  always rendered above hero tokens/structure icons so a token landing
  nearby can never cover one) and disappear at 0, same as a destroyed
  Structure. The actual `−`/number/`+` steppers live in a `GoldPilesBar`
  below the board instead, each independently clamped to 0-3 — the
  mockup tried the steppers directly on the board first, but a gold
  node is also a shared front-line node heroes stand on, and the
  controls had nowhere to go without overlapping a token.
This is a prototype for visual direction only, same caveat as intents
01-03's references — not implemented code, and expected to evolve
during build-out.

## Deployment
No change from v1-v3 — same static Vercel deployment, no new infra.

## Open Items for Implementation (not yet decided)
- **The 15 nodes' actual coordinates.** Data Model above now
  fixes the full node graph's shape and count, so this is down to
  reading each node's precise `xPct`/`yPct` off the full-resolution
  board art — unlike intent 02's Hero Base HP table, that's not a quick
  card-by-card lookup, and guessing at percentages from a downscaled
  preview ships wrong data (this spec's own earlier Tower/Bit placements
  needed a full-resolution re-measure for exactly this reason). A small
  throwaway dev-only tool (click the rendered board, copy out
  `{xPct, yPct}` under the cursor) is a reasonable way to make this
  tractable during build, rather than hand-measuring pixels in an image
  editor.
- **Touch/pointer support**, for both drag-and-drop and the zoom/pan
  control: native HTML5 drag-and-drop doesn't work on touchscreens
  without extra polyfill work, and the zoom/pan wrapper above only
  wires up mouse click-and-drag plus scroll-wheel zoom, not touch-drag
  panning or pinch-to-zoom (the on-screen +/−/Reset buttons still work
  on touch, since those are ordinary button taps). Left out of scope
  here since CLAUDE.md's two manual-QA baselines (13.3" laptop, 24"
  monitor) are both desktop/mouse targets — revisit if a touch target
  is ever added.
- The fan-out offset math (how far apart stacked tokens shift when
  several heroes share one space). With only 15 nodes for up to 8
  heroes, a 3- or 4-hero pileup isn't a rare edge case to maybe revisit
  later — a full team retreating to its own Bit after a wipe is the
  expected shape of a losing team's board, and a contested shared
  front-line node stacking heroes from both sides at once (above) is
  normal mid-battle play. The mockup only ever demonstrates 2 heroes
  sharing a space; the offset math needs to hold up at 4+ before this
  ships.
- **Intent 04 itself still says "holding area"** throughout — this spec
  and the mockup have already moved to "respawn area" (Layout, above),
  so `intent/04_battle-map.md` needs the same rename next time it's
  touched, per CLAUDE.md's intent/spec staleness check.
