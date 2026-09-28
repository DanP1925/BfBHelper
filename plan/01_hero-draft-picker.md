# Plan: BfbHelper v1 — Hero Draft Picker

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/01_hero-draft-picker.md](../intent/01_hero-draft-picker.md)
> and [../specs/01_hero-draft-picker.md](../specs/01_hero-draft-picker.md).
> No application code exists yet — `frontend/` is an empty stub. This doc
> is updated and checked off incrementally as implementation proceeds, in
> the PR(s) that do that work.

## Context

The repo has zero application code so far — `frontend/` and `backend/` are
empty stub folders with only placeholder READMEs. Intent and spec are done
and stable, including a reviewed UI mockup (3 screens: Start, Draft Board,
Results). This plan turns that into a concrete, dependency-ordered build
checklist so implementation can proceed incrementally without re-deriving
architecture decisions each session.

Decisions already made with the user (not re-litigated below): frontend
framework **Next.js** + TypeScript, styling **plain CSS / CSS Modules**,
testing **Vitest + React Testing Library** for the draft logic and
persistence layer.

## Tooling Decisions

- **Next.js (App Router) + TypeScript**, `output: 'export'` in
  `next.config` so the build stays a plain static bundle deployable to
  either Vercel or Netlify (keeps that spec open item genuinely open).
  `images.unoptimized: true` — no Image Optimization API under static
  export, so plain `<img>` for the ~20 local hero PNGs. `next/font/google`
  still works under static export (it's build-time), so Cinzel/Spectral
  loading is unaffected.
- **CSS Modules** — no Tailwind, no CSS-in-JS.
- **Vitest + React Testing Library + jsdom** for the draft logic and
  persistence layer (not full UI/e2e coverage).
- Next.js's App Router here is a pure tooling choice — this feature has no
  real multi-route navigation (Start/DraftBoard/Results are phases of one
  view, not routes).

## Architecture

```
frontend/
  next.config.ts          # output: 'export', images: { unoptimized: true }
  vitest.config.ts
  public/heroes/           # 19 hero portraits + card-back.png, copied from specs/Hero Cards/
  src/
    app/
      layout.tsx            # next/font/google (Cinzel, Spectral), globals.css
      globals.css            # CSS custom properties for the mockup's palette
      page.tsx                # 'use client'; useDraft(); switches Start/DraftBoard/Results by phase
    data/
      heroes.ts                 # static HERO_ROSTER: Hero[], HeroId union
      heroes.test.ts             # 19 unique ids, each resolves to a public/heroes/*.png
    lib/
      draft/
        types.ts, sequence.ts, coinFlip.ts, reducer.ts, selectors.ts
        + matching *.test.ts files
      persistence/
        schema.ts, storage.ts (load/save/clear + validation)
        + storage.test.ts
      useDraft.ts + useDraft.test.tsx
    components/
      HeroCard/, TeamPanel/, HeroPool/, TurnBanner/  (each with .module.css)
      screens/StartScreen/, DraftBoardScreen/, ResultsScreen/
    test/setup.ts
```

Key decisions:
- `DraftState = { initiative: PlayerId; picks: Record<PlayerId, HeroId[]> }`
  is the *only* stored/dispatched state; phase, step, turn, remaining pool,
  and per-player team slots are all derived in `selectors.ts` from that plus
  the fixed step sequence `[1,2,2,2,1]`. Keeps the reducer trivial to test
  and the persisted payload minimal.
- Coin flip runs in `useDraft`'s `startNewDraft()`, not inside the reducer —
  `NEW_DRAFT` carries the already-decided initiative as payload, so tests
  never need to mock `Math.random`.
- `PICK_HERO` carries an explicit `player` field; the reducer no-ops any
  pick where `player` doesn't match the derived current-turn player. Makes
  "only the current turn's side can pick" a directly testable input rather
  than an implicit UI-only invariant.
- Screens (`StartScreen`, `DraftBoardScreen`, `ResultsScreen`) are pure
  props-in/callbacks-out; `useDraft()` is called exactly once, in
  `app/page.tsx`.

## Hero Roster Data

id — name — class — source asset (in `specs/Hero Cards/`):

| id | name | class | source asset |
|---|---|---|---|
| agatha-trunch | Agatha Trunch | Minotaur | AgathaTrunch_Minotaur.png |
| baldwin | Baldwin | Bard | Baldwin_Bard.png |
| boreas | Boreas | Hunter | Boreas_Hunter.png |
| caligar | Caligar | Cleric | Caligar_Cleric.png |
| ceralin | Ceralin | Fighter | Ceralin_Fighter.png |
| cynthia | Cynthia | Fire Mage | Cynthia_FireMage.png |
| cyrus | Cyrus | Paladin | Cyrus_Paladin.png |
| dazeem | Dazeem | Ice Mage | Dazeem_IceMage.png |
| dolgolae | Dolgolae | Yomp | Dolgolae_Yomp.png |
| felix | Felix | Duelist | Felix_Duelist.png |
| ken-obi | Ken Obi | Apprentice | KenObi_Apprentice.png |
| kerrick | Kerrick | Wizard | Kerrick_Wizard.png |
| kunoichi | Kunoichi | Assassin | Kunoichi_Assassin.png |
| longshanks | Longshanks | Pirate | Longshanks_Pirate.png |
| motley | Motley | Monk | Motley_Monk.png |
| runika | Runika | Artificer | Runika_Artificer.png |
| sedusa | Sedusa | Gorgon | Sedusa_Gorgon.png |
| sterling | Sterling | Archer | Sterling_Archer.png |
| vladiator | Vladiator | Barbarian | Vladiator_Barbarian.png |

(plus `card-back.png` from `CardBack.png` for the Start screen)

## Milestone Checklist

- [x] M0. Scaffold Next.js + TypeScript (App Router), `output: 'export'` +
      `images.unoptimized: true`, ESLint, Vitest + RTL + jsdom wired up with
      a passing placeholder test, npm scripts (dev/build/test/lint). Confirm
      `next build` emits a static `out/` dir. Replace frontend/README.md's
      "Scaffold TBD". Adopt the `.gitignore` the scaffold generates (verify
      it covers `node_modules/`, `out/`/`.next/`, and `.DS_Store`) rather
      than hand-writing one — see intent's deferred-`.gitignore` decision.
- [x] M1. Design tokens & globals.css matching the mockup palette (bg
      #181310, text #f3ead9, gold #c9a24b, P1 #c1665a, P2 #4f9aa0), Cinzel +
      Spectral via next/font/google in layout.tsx.
- [x] M2. Copy/rename the 20 PNGs from `specs/Hero Cards/` into
      `frontend/public/heroes/`; author `src/data/heroes.ts`; add the
      roster sanity test.
- [x] M3. Draft logic core (framework-agnostic): types, step sequence, coin
      flip, pure reducer, selectors — full Vitest suite green.
- [x] M4. Persistence layer: schema + load/save/clear with validation and
      corruption/version-mismatch handling — full Vitest suite green.
- [x] M5. useDraft hook: reducer + persistence effect + view-model. Hook
      tests covering resume-from-storage and end-to-end pick sequences.
- [ ] M6. Presentational leaf components: HeroCard, TeamPanel, TurnBanner —
      styled to match the mockup, checked via dev server.
- [ ] M7. Screen components: StartScreen, DraftBoardScreen, ResultsScreen —
      pure props-in, callbacks-out.
- [ ] M8. Wire up app/page.tsx: single useDraft() call, phase switch.
- [ ] M9. Manual QA: full click-through of all 3 screens; persistence across
      reload at multiple points mid-draft; New Draft overwrites an
      in-progress draft; keyboard focus-visible states; a couple of
      viewport widths; `next build` + smoke-test the static `out/` bundle.
- [ ] M10. Deployment: resolve Vercel vs Netlify, add corresponding config,
      first deploy, short deploy note in frontend/README.md.
- [ ] M11. Docs follow-up: update backend/README.md off its stale
      real-time-sync/backend description; note in specs/01_hero-draft-picker.md
      that its open items are now resolved, linking to this plan doc.

## Test Scenarios

Draft logic (`lib/draft/*.test.ts`):
1. Coin flip with injected rng: `<0.5` → p1, `>=0.5` → p2.
2. `NEW_DRAFT` resets any prior state to zero picks.
3. Immediately after `NEW_DRAFT`: initiative player's turn, step 1 of 5, 1
   pick required.
4. After the initiative player's pick: turn passes, step 2, 2 picks
   required.
5. Full 5-step sequence resolves correctly for both initiative assignments.
6. Within a 2-pick step, both picks belong to the same player (not a snake
   draft).
7. A pick from the wrong player's turn is rejected (state unchanged).
8. A pick for an already-picked hero is rejected.
9. A pick for an unknown hero id is rejected.
10. Pool never offers an already-picked hero.
11. Each player's derived team slots contain exactly their picks, in order;
    unfilled slots are empty placeholders.
12. After the 8th total pick, draft transitions to done; further picks are
    no-ops.
13. Step/turn derivation is a pure function of (total picks, initiative):
    cumulative boundaries `[1,3,5,7,8]` match the step sequence exactly.

Persistence (`lib/persistence/storage.test.ts`):
14. `saveDraft` writes JSON with `schemaVersion === CURRENT_SCHEMA_VERSION`.
15. `loadDraft` returns `null` with no persisted key.
16. Resuming mid-draft: round-trip a partial state through save→load,
    derived phase/turn/step match pre-save state.
17. Corrupt/invalid JSON → `loadDraft` returns `null` and clears the key.
18. Missing/wrong-type/unrecognized `schemaVersion` → same.
19. Structurally invalid picks (unknown id, duplicate id, >4 per player, >8
    total) → same.
20. New Draft overwrites an in-progress persisted draft.
21. `clearDraft` removes the key; subsequent `loadDraft()` returns `null`.

Hook-level (`lib/useDraft.test.tsx`, RTL `renderHook`):
22. No persisted state → `phase: 'idle'`.
23. Valid persisted mid-draft state → correct `phase`/turn/step restored.
24. Every `pickHero` call triggers a persistence write.
25. `startNewDraft()` mid-draft immediately persists the fresh state.

## localStorage Schema (resolves spec's open item)

- Single stable key, e.g. `bfbhelper:hero-draft` — versioning lives inside
  the payload, not the key name.
- Payload:
  ```ts
  type PersistedDraftV1 = {
    schemaVersion: 1;
    initiative: 'p1' | 'p2';
    picks: { p1: HeroId[]; p2: HeroId[] };
    updatedAt: string; // informational only
  };
  ```
  No separate `stepIndex`/`phase` fields — always re-derived on load.
- Load-time validation order (any failure clears the key, returns `null`,
  never throws to the UI): JSON parse → `schemaVersion` present/numeric →
  version too old (look up a `migrations` map; none exists yet, so treat as
  corrupt) → version too new (no downgrade path, clear) → structural
  validation (valid player ids, known hero ids, no duplicates, ≤4/player,
  ≤8 total).
- `saveDraft` runs on every reducer state change, including right after
  `NEW_DRAFT`. `clearDraft` runs from `startNewDraft` before writing fresh
  state, and internally whenever `loadDraft` detects corruption.

## Follow-ups / Open Items

- **Hosting** — Vercel vs Netlify still open, carried forward as M10.
- **`backend/README.md`** still describes the descoped real-time-sync/
  backend architecture — flagged as M11, not fixed in this task.
- **Asset licensing/provenance** for the hero portrait art isn't tracked
  anywhere — worth a note before any public deploy.
