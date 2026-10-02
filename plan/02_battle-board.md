# Plan: BfbHelper v2 — Battle Board

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/02_battle-board.md](../intent/02_battle-board.md) and
> [../specs/02_battle-board.md](../specs/02_battle-board.md). Written after
> the fact on `feat/battle-board` — implementation started before this doc
> existed, so M0–M9 are already done; this records what was actually built,
> including the visual-fidelity iterations against the mockup.

## Context

Intent and spec were done and stable going in (merged via PR #13/#14), plus
a reviewed UI mockup (the "Battle Board" artboard on the shared "BfbHelper
— App Flow" design artifact, right after the Results screen). This plan
turns that into a concrete build checklist for `frontend/`, extending the
v1 Hero Draft Picker codebase rather than starting a new app.

No new tooling decisions — same stack as v1 (Next.js static export, CSS
Modules, Vitest + RTL). See
[01_hero-draft-picker.md](01_hero-draft-picker.md)'s Tooling Decisions.

## Architecture

```
frontend/
  public/
    structures/        # tower-red/blue, bit-red/blue, gold.png — from specs/Battle Board/
    heroes-tokens/      # 19 map-token PNGs (one per hero) — from specs/Battle Board/
  src/
    lib/
      battle/
        constants.ts    # TOWER_STARTING_HP, BIT_STARTING_HP, HERO_STARTING_LEVEL,
                         # HERO_MAX_LEVEL, TEAM_STARTING_GOLD, TOWER_SLOTS
      persistence/
        schema.ts        # + VIEW_STORAGE_KEY ("bfbhelper:battle-view")
        storage.ts        # + loadBattleView/saveBattleView
      draft/
        types.ts           # Hero += battleToken: string, baseHp: number
    data/
      heroes.ts              # HERO_ROSTER backfilled with baseHp + battleToken per hero
    components/
      HeroCard/                # + "battle" variant (horizontal: 80x120 token + info column)
      StructureSlot/            # new: icon + short label + HP, optional accent border
      BattleTeamPanel/           # new: header (label + gold badge), 2x2 hero grid, structures row
      screens/
        BattleBoardScreen/        # new: 2-col grid of BattleTeamPanel
        ResultsScreen/              # + "Start Battle" button alongside "New Draft"
    app/
      page.tsx                      # + view: "results" | "battle" state, persisted
```

Key decisions:
- **`view` is a separate persisted key** (`bfbhelper:battle-view`), not
  folded into `DraftState`/`PersistedDraftV1` — it's UI navigation, not
  draft data. Only `"battle"` is ever written; absence means `"results"`.
  **Deviation from spec:** the spec as originally written said a reload
  always lands back on Results ("nothing new to lose"); the user asked
  mid-build for the Battle Board to survive a reload instead, so this was
  added and the spec updated to match.
- **`HeroCard`'s `"battle"` variant uses `hero.battleToken`, not
  `hero.portrait`.** `portrait` is the existing cropped trading-card art
  (used by `"slot"`/`"result"`); reusing it for Battle Board was tried
  first and rejected — it baked in its own HP numeral (redundant with the
  new explicit HP badge) and didn't match the mockup, which deliberately
  used the separate Map Assets hero tokens. `battleToken` points at
  `frontend/public/heroes-tokens/<id>.png`.
- **Hero card layout is horizontal**, not stacked: a fixed 80×120 token
  image on the left, name/class + HP badge + level meter in a column to
  its right — matching the mockup's `BattleBoard.dc.html` structure
  exactly (verified by reading the artboard's source), not just
  approximated from memory.
- **Gold lives in the panel header** as a pill badge (icon + "N Gold")
  next to the team label, not as a separate row below Structures — also
  matching the mockup exactly, corrected after an earlier pass put it in
  its own row.
- **Structure labels are short** ("Top"/"Middle"/"Bottom"/"Bit"), and the
  Bit slot's border uses the team's accent color
  (`var(--color-p1)`/`var(--color-p2)`) to flag it as the team's most
  vulnerable structure — both per the mockup.
- **`BattleBoardScreen` uses a 2-column CSS grid** (`minmax(0,1fr)`, 32px
  gap, 1180px max-width), not a fixed-width flex row — needed so
  `StructureSlot`'s 4-column grid actually holds equal column widths
  (grid items default to `min-width: auto`, which let "Middle Tower"-
  length labels blow out their column before this was fixed, and before
  labels were shortened).
- **`justify-content`/`align-items: safe center`** on `BattleBoardScreen`'s
  scrollable content area — plain `center` on an overflowing scrollable
  flex axis clips content past the container instead of making it
  reachable by scrolling (a real bug hit during build: team headers and
  gold badges were silently invisible, not just off-screen).
- No new tests were added for `BattleTeamPanel`/`BattleBoardScreen`
  themselves (no interactive behavior to test yet — static props-in
  rendering); the roster/schema-level additions are covered by existing
  suites (see Test Scenarios below).

## Hero Roster Data — Base HP & Battle Token

Backfilled onto the existing `HERO_ROSTER` (id/name/class already existed
from v1); `baseHp` from intent/02's roster table, `battleToken` from the
Map Assets set's per-hero token PNGs (distinct from the card art used for
`portrait`):

| id | baseHp | battle-token source asset |
|---|---|---|
| agatha-trunch | 10 | AgathaTrunch_Minotaur.png |
| baldwin | 9 | Baldwin_Bard.png |
| boreas | 10 | Boreas_Hunter.png |
| caligar | 10 | Caligar_Cleric.png |
| ceralin | 10 | Ceralin_Fighter.png |
| cynthia | 8 | Cynthia_FireMage.png |
| cyrus | 9 | Cyrus_Paladin.png |
| dazeem | 8 | Dazeem_IceMage.png |
| dolgolae | 10 | Dolgolae_Yomp.png |
| felix | 9 | Felix_Duelist.png |
| ken-obi | 9 | KenObi_Apprentice.png |
| kerrick | 8 | Kerrick_Wizard.png |
| kunoichi | 9 | Kunoichi_Assassin.png |
| longshanks | 10 | Longshanks_Pirate.png |
| motley | 10 | Motley_Monk.png |
| runika | 8 | Runika_Artificer.png |
| sedusa | 9 | Sedusa_Gorgon.png |
| sterling | 7 | Sterling_Archer.png |
| vladiator | 10 | Vladiator_Barbarian.png |

Plus `Tower_Red/Blue.png`, `Bit_Red/Blue.png`, `Gold_Icon.png` → copied
into `frontend/public/structures/` as `tower-red.png`, `tower-blue.png`,
`bit-red.png`, `bit-blue.png`, `gold.png`.

All source assets live in `specs/Battle Board/`, copied from
`~/Documents/Playground/BattleForBiternia/Map Assets/` per CLAUDE.md's
"source art lives in specs/<Feature Name>/" convention. The initial pass
only copied the 8 hero tokens that happened to appear in the mockup's one
example draft; the remaining 11 were backfilled once the real app (which
can draft any of the 19) needed full coverage.

## Milestone Checklist

- [x] M0. Extend `Hero` type (`baseHp: number`, `battleToken: string`) and
      backfill `HERO_ROSTER` with both fields for all 19 heroes.
- [x] M1. `lib/battle/constants.ts`: static starting-state constants
      (Tower/Bit HP, hero starting level, max level, team starting gold,
      tower slot names).
- [x] M2. Asset pipeline: copy all 19 hero tokens + Tower/Bit/Gold icons
      into `specs/Battle Board/` (source), then into
      `frontend/public/heroes-tokens/` and `frontend/public/structures/`
      (served, kebab-case filenames matching `HeroId`).
- [x] M3. `StructureSlot` component: icon + short label + HP, optional
      side-accent border (used for Bit).
- [x] M4. `HeroCard` `"battle"` variant: horizontal layout (80×120 token +
      info column), explicit HP badge (heart icon + value, HP-colored) and
      level meter (pips + "N/4"), HP visually weighted above level per the
      mockup.
- [x] M5. `BattleTeamPanel` component: header (team label + gold pill
      badge), 2×2 hero grid, "Structures" section (4-column grid, Bit's
      border side-accented).
- [x] M6. `BattleBoardScreen` component: 2-column grid of both teams'
      panels (1180px max-width), "← New Draft" footer.
- [x] M7. Wire into `app/page.tsx`: `view: "results" | "battle"` state,
      persisted via `loadBattleView`/`saveBattleView`
      (`bfbhelper:battle-view`); `ResultsScreen` gets a "Start Battle"
      button; starting a new draft or leaving the Battle Board both reset
      `view` back to `"results"`.
- [x] M8. Visual QA against the mockup, several corrective rounds after
      user review of running screenshots:
      1. Fixed a `justify-content: center` + `overflow: auto` clipping
         bug that made team headers/gold badges invisible (not just
         off-screen) — switched to `safe center`.
      2. Added `view` persistence (initially out of scope per the spec,
         changed on request).
      3. Replaced `hero.portrait` (cropped trading-card art, duplicate
         baked-in HP numeral) with `hero.battleToken` (clean map-token
         art) for the `"battle"` variant, matching the mockup's intent.
      4. Fixed unequal `StructureSlot` column widths (`min-width: auto`
         letting long labels blow out a grid track) — first via
         `min-width: 0`, then more simply by shortening labels to match
         the mockup ("Top" not "Top Tower").
      5. Re-read the mockup's actual `BattleBoard.dc.html` source (rather
         than relying on memory) and corrected the hero-card layout from
         stacked/single-row to the mockup's true horizontal 2×2 layout,
         moved gold into the header, and added the side-accented Bit
         border.
      6. Dropped the mockup's static-preview caption below the panels —
         removed per user request, not carried into the real screen.
- [x] M9. `tsc --noEmit`, `eslint --max-warnings=0`, and the full Vitest
      suite (61 tests) all green after each round above.
- [ ] M10. Manual click-through on the deployed (not just local dev)
      build, and a final visual sign-off from the user against the
      mockup. **Not yet done — pending user review of the current
      working tree.**

## Test Scenarios

No new standalone test files were added for this feature's UI components
(`StructureSlot`, `BattleTeamPanel`, `BattleBoardScreen`) — they're pure
props-in rendering with no logic to unit-test yet (no interactivity until
intent 03). Coverage added instead at the data layer:

Roster (`data/heroes.test.ts`):
1. Every hero has a positive `baseHp` (added).
2. Every hero has a `battleToken` file on disk under
   `frontend/public/` (added, mirrors the existing portrait-file check).

Existing v1 suites (draft logic, persistence, `useDraft`, `page.test.tsx`)
are unaffected and still pass — this feature only adds fields/files, it
doesn't change `DraftState` or the draft reducer/selectors.

## Follow-ups / Open Items

- **M10 above** — final manual QA + user sign-off against the mockup is
  still open as of this doc being written.
- **No new deploy step.** Same Vercel static export as v1; nothing in
  `next.config.ts` or the Vercel project changes for this feature.
- **Intent 03 (interactivity)** is next per
  [../intent/02_battle-board.md](../intent/02_battle-board.md)'s Out of
  Scope section — damage tracking, leveling, gold spend/earn, and the win
  condition all build on top of this static board rather than changing it.
