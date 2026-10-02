# Spec: BfbHelper v2 — Battle Board

> **DRAFT.** This reflects architecture decisions for the current,
> simplified v2 scope (same-device, 2-player, static/read-only, no
> backend). Build-out is in progress (`feat/battle-board`); details may
> still change. See
> [../intent/02_battle-board.md](../intent/02_battle-board.md) for the
> product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as v1 (see
  [01_hero-draft-picker.md](01_hero-draft-picker.md)): React +
  TypeScript, Next.js, static build, no backend.
- The Battle Board is a new screen component added alongside the
  existing `StartScreen` / `DraftBoardScreen` / `ResultsScreen` family
  in `frontend/src/components/screens/`.

## State Management
- The Battle Board's own content renders entirely from:
  - The already-completed `DraftState` (`initiative` + `picks`)
    persisted under the existing `bfbhelper:hero-draft` key
    (`frontend/src/lib/persistence/schema.ts`) — unchanged by this
    intent.
  - Static constants for everything else (Tower/Bit starting HP, hero
    starting level, team starting gold) — see Data Model below.
- Which screen is showing (Results vs. Battle Board) is a
  `view: "results" | "battle"` flag in `frontend/src/app/page.tsx`
  (plain `useState`, not folded into `useDraft`'s phase model), that
  flips to `"battle"` when the player clicks "Start Battle" on the
  Results screen.
  - **This is persisted**, under its own `bfbhelper:battle-view` key
    (`frontend/src/lib/persistence/schema.ts`,
    `loadBattleView`/`saveBattleView` in
    `frontend/src/lib/persistence/storage.ts`) — separate from
    `PersistedDraftV1` since it's UI navigation, not draft data. Only
    `"battle"` is ever written; the key's absence means `"results"`.
    Reloading while on the Battle Board stays there.
  - In `page.tsx`, `view` is re-derived from storage every time
    `draft.phase` transitions *into* `"done"`, and reset to a
    not-yet-hydrated `null` whenever it leaves `"done"` — so it's never
    stale, driven by `draft.phase` rather than needing every "New
    Draft"/"Start Draft" call site to separately remember to reset it.
    `clearDraft()` (called by both `startNewDraft` and `returnToStart`)
    also clears `bfbhelper:battle-view`, since it's meaningless without
    the draft it refers to — this is what actually resets it back to
    `"results"`, structurally rather than by UI convention.
  - Revises intent/02's Session Lifecycle note that a reload "lands
    back on the Results screen" — that was the v1 behavior before this
    was made to persist.

## Data Model
- Extend the existing `Hero` type
  (`frontend/src/lib/draft/types.ts`) with a static `baseHp: number`
  field, and backfill `HERO_ROSTER`
  (`frontend/src/data/heroes.ts`) with each hero's Base HP from the
  roster table in intent/02 (sourced from the card art in
  `frontend/public/heroes/`).
- Also extend `Hero` with `battleToken: string` — the standalone
  map-token art (no card chrome, no baked-in stats), distinct from
  `portrait`'s cropped trading-card art. All 19 tokens are copied into
  `frontend/public/heroes-tokens/` from `specs/Battle Board/`
  (originally the Map Assets set) — see UI Design Reference below for
  why: the mockup intentionally avoided the cropped card art, and the
  Battle Board's `HeroCard` `"battle"` variant follows that.
- New static constants, e.g. in `frontend/src/lib/battle/constants.ts`:
  - `TOWER_STARTING_HP = 11`
  - `BIT_STARTING_HP = 16`
  - `HERO_STARTING_LEVEL = 1`
  - `TEAM_STARTING_GOLD = 0`
  - `TOWER_SLOTS = ["top", "middle", "bottom"] as const`
- None of this is persisted — it's recomputed fresh on every render
  from the hero roster plus these constants, since nothing can change
  yet in this intent.

## Battle Board Logic
- On entering the Battle Board, each team's 4 heroes are the same
  `Hero[]` already derived for the Results screen
  (`draft.teamSlots.p1`/`p2` → `getHeroById`), now also rendered with
  `level` (always `HERO_STARTING_LEVEL`) and `baseHp` (from the roster
  data).
- Each team panel additionally renders the 3 fixed Tower slots
  (Top/Middle/Bottom, each at `TOWER_STARTING_HP`), 1 Bit (at
  `BIT_STARTING_HP`), and a gold total (always `TEAM_STARTING_GOLD`).
- No computation beyond this — no HP math, no level-up cost math, no
  win-condition check. All of that is intent 03.

## Layout
This section mirrors the design artifact's BattleBoard artboard
pixel-for-pixel (structure, spacing, colors), not just in spirit — see
UI Design Reference below.
- New `BattleBoardScreen` component
  (`frontend/src/components/screens/BattleBoardScreen/`): both team
  panels in a 2-column CSS grid (`repeat(2, minmax(0, 1fr))`, 32px
  gap, 1180px max-width, centered), not `ResultsScreen`'s fixed-width
  flex layout.
- New `BattleTeamPanel` component — distinct from the existing
  draft-time `TeamPanel` (which only renders 4 hero slots). Per team:
  - Header: team label + a gold pill badge (icon + "N Gold") on the
    same row, not a separate row.
  - A 2×2 grid of `HeroCard`s (`"battle"` variant) — each card is
    **horizontal**: the hero's `battleToken` art fixed at 80×120 on
    the left, name/class + HP badge + level meter stacked in a column
    to its right (not stacked vertically like `"slot"`/`"result"`).
  - A "Structures" section: heading, then a 4-column grid of
    `StructureSlot`s (Top/Middle/Bottom Tower, Bit) with short labels
    ("Top", not "Top Tower" — "Structures" already gives context). The
    Bit slot's border uses the team's accent color
    (`var(--color-p1)`/`var(--color-p2)`) to call out that it's the
    team's most vulnerable structure.
- Tower/Bit icons and the Gold icon use the pixel-art assets copied
  into `frontend/public/structures/` from `specs/Battle Board/`
  (originally the Map Assets set) — not text-only.
- The mockup's static-preview caption below both panels is not carried
  into the real screen — removed per user request.

## UI Design Reference
- A first-pass visual mockup of the Battle Board is tracked as the
  "Battle Board" artboard on the same Claude design artifact as
  intent 01 ("BfbHelper — App Flow"), placed right after the Results
  screen:
  https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK
- This is a prototype for visual direction only — not implemented
  code — and is expected to evolve once build-out begins. It reuses
  the existing app's palette/typography (see `globals.css`). Hero
  portraits, Tower/Bit icons, and the Gold icon are the pixel-art
  tokens from `specs/Battle Board/` (originally
  `~/Documents/Playground/BattleForBiternia/Map Assets/`), not the
  cropped `HeroCard` art. Each hero shows an explicit HP badge (heart
  icon + number) and a level meter (pips + "1/4"), with HP visually
  weighted above level, and heroes visually weighted above the
  Structures row.

## Deployment
- No change from v1 — same static Vercel deployment, no new infra.

## Open Items for Implementation (not yet decided)
- None remaining — Tower/Bit visual treatment, the `view` persistence
  model, and gold display (icon + plain number, no meter/bar) were all
  decided during implementation; see Layout and State Management
  above.
