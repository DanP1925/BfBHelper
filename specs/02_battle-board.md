# Spec: BfbHelper v2 — Battle Board

> **DRAFT.** This reflects architecture decisions for the current,
> simplified v2 scope (same-device, 2-player, static/read-only, no
> backend). Nothing described here has been built yet, and details
> (especially under "Open items for implementation") are expected to
> change once build-out begins. See
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
- **No new persisted state.** The Battle Board renders entirely from:
  - The already-completed `DraftState` (`initiative` + `picks`)
    persisted under the existing `bfbhelper:hero-draft` key
    (`frontend/src/lib/persistence/schema.ts`) — unchanged by this
    intent.
  - Static constants for everything else (Tower/Bit starting HP, hero
    starting level, team starting gold) — see Data Model below.
- Which screen is showing (Results vs. Battle Board) is **local,
  non-persisted UI state**, e.g. a `view: "results" | "battle"` flag
  in `frontend/src/app/page.tsx` that defaults to `"results"` once
  `draft.phase === "done"`, and flips to `"battle"` when the player
  clicks a "Start Battle" action on the Results screen.
  - This matches intent/02's Session Lifecycle: nothing is lost on
    reload, because nothing on the Battle Board can change yet — a
    reload simply lands back on the Results screen, from which "Start
    Battle" is available again.

## Data Model
- Extend the existing `Hero` type
  (`frontend/src/lib/draft/types.ts`) with a static `baseHp: number`
  field, and backfill `HERO_ROSTER`
  (`frontend/src/data/heroes.ts`) with each hero's Base HP from the
  roster table in intent/02 (sourced from the card art in
  `frontend/public/heroes/`).
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
- New `BattleBoardScreen` component
  (`frontend/src/components/screens/BattleBoardScreen/`), mirroring
  `ResultsScreen`'s two-column team layout.
- New `BattleTeamPanel` component — distinct from the existing
  draft-time `TeamPanel` (which only renders 4 hero slots) — that
  renders, per team: the 4 `HeroCard`s (extended with level/Base HP
  captions), the 3 Tower slots, the Bit, and the gold total, per
  intent/02's "mirrored side panels" layout.
- Reuses `HeroCard` where possible. Towers/Bit have no existing card
  art, so they likely need a new small presentational component (e.g.
  `StructureSlot`) showing just a name + HP.

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
- UI Design Reference mockup (see above).
- Exact visual treatment for Tower/Bit slots (icon/art vs. text-only),
  since they have no existing card art the way heroes do.
- Whether `view: "results" | "battle"` lives as raw `useState` in
  `page.tsx` or is folded into `useDraft`'s own phase model (e.g. a
  new `"battle"` phase) — functionally equivalent, implementation
  detail.
- Exact gold display treatment (plain number vs. a capped meter/bar
  hinting at the ~10 soft ceiling from intent/02).
