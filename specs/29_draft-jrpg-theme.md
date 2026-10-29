# Spec 29: Draft JRPG Theme

> **BUILT.** Architecture for intent 29's scope, all built in one PR. See [../intent/29_draft-jrpg-theme.md](../intent/29_draft-jrpg-theme.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-28: React + TypeScript,
  Next.js, static build, no backend.
- **Spec 28's mechanism, reused.** The theme is switched on by
  `data-theme="jrpg"` on a screen's root, its tokens and recipes are already
  in `app/globals.css`, and each component's shape overrides sit in its own
  module under `:global([data-theme="jrpg"]) .className { … }`. This spec
  adds the attribute to one more root and writes the Draft's overrides
  (intent's "Intent 28's rules, unchanged").
- **One switch:** `data-theme="jrpg"` on the root `<div>` of
  `DraftBoardScreen`. Everything on the Draft (`TurnBanner`, `TeamPanel`,
  `RoleFilter`, `HeroPool` and the `HeroCard`s inside them) renders inside
  it.
- **The other screens keep their look** (intent's Constraints). `HeroCard`
  is shared with `ResultsScreen` and `WinScreen`, but the Draft only uses
  its `pool` and `slot` variants, and every override is keyed on the
  attribute, so the Results and Win cards can't match. `StartScreen` keeps
  no attribute.
- **What doesn't change:** `useDraft`, the draft reducer, persistence,
  every handler and prop, every component's DOM structure, the role
  filter's behavior, the pool's and slots' fit-to-height sizing
  (`useFitGrid`, `useHeightFitColumns`), the hero card art, and intent 10's
  pick animation (see Draft Theme Logic for the one line it needs).

## State Management
- **No state change.** Nothing is stored and nothing is computed: the theme
  is the same for every draft, on reload and after a new draft (intent's
  Session Lifecycle).
- **`DraftBoardScreen`:** the root
  `<div ref={rootRef} className={styles.screen}>` gains
  `data-theme="jrpg"`.

## Data Model
- **No change** to `DraftState`, `persistence/schema.ts` or any schema
  version: saved drafts load unchanged.
- **No new font.** Jersey 15 and Rubik are already loaded in
  `app/layout.tsx` (spec 28).
- **Three tokens re-valued** in the `[data-theme="jrpg"]` block of
  `app/globals.css`. The empty-slot tokens are only read by the Draft
  (`TeamPanel .emptySlot` and `.emptyLabel`, and `RoleFilter`'s disabled
  option), so the Board and the Map don't change:
  ```css
  --color-slot-empty-bg: var(--jr-well);
  --color-slot-empty-border: var(--jr-stone);
  --color-slot-empty-label: #6b6285; /* the old #5c5142's contrast, on purple */
  ```
- **`--color-gold`, on the Draft's root only.** Spec 28 kept
  `--color-gold` for +1 Attack and gave the frames `--jr-gold`. The Draft has
  no tokens, and every gold on it is decoration: the title, "Draft
  complete", the pool's hover border and every focus outline. So
  `DraftBoardScreen.module.css` re-values it on its own themed root:
  ```css
  :global([data-theme="jrpg"]).screen {
    --color-gold: var(--jr-gold);
  }
  ```
  This also reaches `TurnBanner`'s "Draft complete", whose color is an
  inline `var(--color-gold)`, with no TSX change.

## Draft Theme Logic
Each override uses one of spec 28's recipes (stone well, stone plate,
raised key, gold bar). The Draft uses no gold frame.

| Element | Today | Themed |
|---|---|---|
| `TeamPanel .panel` | No box: a header above the slots | **Unchanged: no frame** (decided 2026-10-29, on the canvas). A gold frame with gems, like the Board's team panels, was drawn first and dropped |
| `TeamPanel .header` | `--color-panel-bg`, 3px rule in the team color on its turn, `--color-border` otherwise | **Stone plate** (decided 2026-10-29): `--jr-well`, a 2px `--jr-stone` border on the top and sides with a `--jr-stone-light` top, `--jr-plate-shadow`, square. The 3px bottom rule stays, so the active turn reads as it does today (intent's Proposed Outcome). Jersey 15 (`--font-heading`) with an ink `text-shadow` |
| `TeamPanel .emptySlot` | 1px dashed rim, rounded | **Stone well** with a dashed rim, like `RespawnAreaStrip`: 2px dashed `--jr-stone` on `--jr-well`, square |
| `HeroCard .slot` | 1px `--color-border`, rounded | **Stone well**: 2px `--jr-stone` with a `--jr-stone-light` top edge, `--jr-well`, square. No outer `--jr-plate-shadow`: `.slotList` clips anything outside a slot |
| `HeroCard .slotName` | Spectral | Jersey 15, as the Board's `.battleName`. `.slotClass` stays Rubik |
| `HeroCard .poolCard` | 2px transparent border, gold on hover, rounded | **Bare** (intent's "The pool's cards stay bare"): no override. Its corners stay round like the printed card's, as the Map's hero tokens stay round (spec 28). Hover and focus turn `--jr-gold` through the re-valued `--color-gold` |
| `RoleFilter .filter` | Pill, 1px border | **Stone plate**: square, 2px `--jr-stone` border with a `--jr-stone-light` top, `--jr-plate-shadow` |
| `RoleFilter .option` | Pill | Square. The selected option is a **gold bar** (`--jr-gold`, `--jr-bar-shadow`, `--jr-on-gold` text). `.label` gets Jersey 15, and `.count` stays Rubik (intent's "Readability wins over flavor") |
| `.newDraftButton` | Outline button, rounded | **Raised key**: `--jr-key-bg`, 1px `--jr-ink` border, `--jr-key-shadow`, hover and `:active` as spec 28. Label in Jersey 15 |
| `.title` | Cinzel, `--color-gold` | Jersey 15 (`--font-heading`, automatically) in `--jr-gold`, with a 2px ink `text-shadow` as the cards' names |
| `.subtitle` ("Initiative: Player 1") | Spectral, uppercase | Jersey 15: a label |
| `TurnBanner .bannerText` | Cinzel, team color | Jersey 15 (automatically), team color as today, ink `text-shadow` |
| `TurnBanner .stepLabel` ("Step 3 of 5") | Spectral | Rubik (automatically): it carries numbers |
| `.header`, `.footer` rules | 1px `--color-border` | Unchanged: `--color-border` is re-valued |

Other rules:
- **Pick animation** (intent's "The pick animation stays"): its keyframes,
  timings and stand-in don't change. Three details:
  - **Team color:** `useDraftPickAnimation` reads `--color-p1` or
    `--color-p2` for the slot's flash from `document.documentElement`,
    which has the unthemed hue. It reads them from the screen's root
    (`rootRef.current`) instead, so the flash uses the themed team color,
    like the turn banner beside it. That's the only change to a `.ts`
    file.
  - **The slot's box-shadow:** the reveal animates the slot's
    `box-shadow` (its glow), and the themed slot has none, so nothing is
    overridden while it plays.
  - The fade-out stand-in is appended to `<body>`, outside the themed
    root, and copies the pool image's corner radius, which doesn't change.
- **Hover and press only.** Nothing new animates on its own, and nothing
  new plays under reduced motion (intent's "Static").

## Layout
- **No element changes its outer size** (intent's "No lost space on the
  laptop"), as in spec 28: thicker borders are paid back from padding, and
  outlines and bevels are `box-shadow`.
  - `TeamPanel .header`: 10px padding with only a 3px bottom border →
    `8px 8px 10px` padding with 2px top and side borders, so its height and
    width don't change.
  - `RoleFilter .filter`: 1px border with 3px padding → 2px with 2px.
  - `HeroCard .slot`: 1px border → 2px. The extra pixel on each side is paid
    back from `.slotInfo`'s 8px padding (→ 7px), so the card's width is
    unchanged. The 5:4 image wrapper loses 2px of width, and so 1.6px of
    height, and the caption's Jersey 15 name sets a tighter line than
    Spectral: as built, a filled slot is about 7px shorter, never taller.
  - `TeamPanel .emptySlot` sizes by `aspect-ratio` with no padding, so a
    2px border changes nothing outside it.
- **Fonts and fit-to-height sizing.** The slots and the pool size their
  cards to the height they're given, so a header or role filter that came
  out taller would shrink every card. Jersey 15 and Rubik set tighter lines
  than Cinzel and Spectral (spec 28 measured shorter boxes, never taller),
  so the cards keep their size or grow slightly, up to their caps (150px
  for a slot, 260px for a pool card). As built, every card keeps its size
  (see Open Items).
- **Both QA screens:** at 1280x800 (must pass) and 2560x1440, the Draft
  shows no new scrollbar, the pool keeps its column count, and no card is
  narrower than on `main`.

## Assets
- **No new assets.** Plates, wells and bevels are CSS. Nothing is cut out
  of the publisher's art (intent's "Intent 28's rules, unchanged").

## UI Design Reference
On the same canvas as intents 01-28 ("BfbHelper — App Flow"):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

Version 121 adds a row titled **"Intent 29 — Draft JRPG Theme"** beside
intent 28's, under the Draft column, with one artboard:
- **"Draft — JRPG Theme"** is the Draft as built today (the full-card
  pool, the cropped slot cards), drawn with one 120px slot column where
  the app fits one or two 150px columns to the height. It's mid-draft as the
  "Draft — Mid-Selection" artboard: step 3, Player 1 to pick, filtering
  Damage. It shows the team names on stone plates over the team-color
  rule, the filled slots as stone wells and the empty ones as dashed
  wells, the bare pool cards with a gold hover, the role filter's stone
  plate and gold bar, and the raised New Draft key. It's interactive:
  picks, the filter and New Draft work. The pick animation isn't drawn
  (the "Draft — Pick Animation" artboard has it).

Its palette, fonts and recipes are copied from intent 28's "Battle Board
— JRPG Theme" artboard. Its **Team panel** tweak compares five looks for
the team panels: "Stone header" (the default, and what's built), "Stone
frame", "Gold header", "No frame" and "Gold frame" (the first draft,
dropped 2026-10-29).

As with every earlier reference, the canvas is a prototype for visual
direction only. If a revised canvas supersedes these choices, it wins over
what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra and no new font.

## Open Items for Implementation
- ~~**Check the layout in the browser** at 1280x800 and 2560x1440 against
  `main`.~~ **Decided:** measured mid-draft with `getBoundingClientRect` on
  both servers. Every width matches: the team panels (310px, two slot
  columns, at 1280x800; 150px at 2560x1440), the slots (150px), the pool
  cards (121px and 260px) and the pool's columns (4 and 7). Some heights
  are shorter, none taller: the team header 44px against 45px, the role
  filter 36px against 43px, a filled slot about 7px. The pool scrolls at
  1280x800 exactly as on `main`, and nothing else scrolls.
- ~~**`--color-slot-empty-label`'s value.**~~ **Decided:** `#6b6285` kept.
  In the screenshots the "Empty" label is as faint as on `main` and still
  legible.
- ~~**Tests.**~~ **Decided:** `page.test.tsx` checks that the Draft is
  themed (one root, around the role filter and New Draft) and the Start
  screen isn't. `DraftBoardScreen.test.tsx` checks the root carries the
  attribute around the banner, the panels and the pool. In
  `useDraftPickAnimation.test.tsx`, the document has the unthemed team
  colors and the hook's root the themed ones, and the flash uses the root's
  (jsdom doesn't inherit custom properties, so they're set on the root
  itself). No e2e change. With the coin flip matched, the Results screen
  at 1280x800 is pixel-identical to `main`'s and has no themed root. The
  Win screen wasn't screenshot-compared: it uses `HeroCard`'s `result`
  variant and no Draft component, and no override matches it without the
  attribute. In the browser, a pick's flash used the themed team color,
  and the slot was a stone well again after it.
