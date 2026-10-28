# Spec 28: JRPG Theme

> **DRAFT.** Architecture for intent 28's scope. Build-out has not started
> yet. See [../intent/28_jrpg-theme.md](../intent/28_jrpg-theme.md) for the
> product-level problem, scope, and behavior this spec exists to satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-27: React + TypeScript,
  Next.js, static build, no backend.
- **CSS only.** The theme is a new look on existing elements: no new
  component, no new state, no change to any component's markup beyond one
  attribute on two screen roots (intent's "The look only, not the layout"
  and "No battle state change").
- **One switch: `data-theme="jrpg"`** on the root `<div>` of
  `BattleBoardScreen` and `BattleMapScreen`. Everything the theme touches
  is a descendant of one of those two roots:
  - The top bar (`ViewToggle`, `PhaseControl`, `InitiativeBadge`,
    `OverflowMenu`) is rendered inside each screen.
  - The pop-ups (`TokenPicker`'s popover, `OverflowMenu`'s dropdown,
    `ConfirmDialog`, the hero card's tooltips) render in place: the
    frontend has no `createPortal` and no `<dialog>`, so they sit inside
    the screen root too (intent's "the pop-ups that open from them").
  - `DraftBoardScreen`, `StartScreen`, `ResultsScreen` and `WinScreen`
    don't carry the attribute, so they keep today's look exactly (intent's
    Out of Scope), even where they share a component (`HeroCard` on the
    Draft, Results and Win Screen).
- **Three layers**, all keyed on the attribute:
  1. **Tokens** in `app/globals.css`, under `[data-theme="jrpg"]`:
     today's `--color-*` and `--font-*` custom properties get new values
     there, and new `--jr-*` ones are added (see Data Model). Since every
     component module already reads these properties, colors and fonts
     switch on their own.
  2. **Recipes**, also as `--jr-*` properties: the box-shadow lists for
     the gold frame, the stone plate, the raised key and the gold bar, so
     each component's override is one or two lines and every frame looks
     the same.
  3. **Shape overrides** in each component's own `.module.css`, under
     `:global([data-theme="jrpg"]) .className { … }`: square corners,
     thicker borders paid back from padding, the recipes, the gem corners.
     They stay next to the rules they override, and an unthemed screen
     never matches them.
- **No theme switcher.** The attribute is fixed in the two screens'
  markup. When the Draft and the other screens get the look (their own
  `BACKLOG.md` items), they add the same attribute and their own
  overrides, and the tokens are already there.
- **What doesn't change:** `useBattle`, `battleReducer`, persistence, every
  handler and prop, every component's DOM structure, the hero portraits,
  the map art, the structure and gold icons, and every token's icon and
  color (intent's "Token containers, not tokens").

## State Management
- **No state change.** Nothing is stored and nothing is computed: the
  theme is the same for every battle, on reload and after a new draft
  (intent's Session Lifecycle).
- **`BattleBoardScreen` and `BattleMapScreen`:** the root
  `<div className={styles.screen}>` becomes
  `<div className={styles.screen} data-theme="jrpg">`. That's the only
  TSX change outside `app/layout.tsx`.

## Data Model
- **No change** to `BattleState`, `DraftState`, `persistence/schema.ts` or
  any schema version: saved battles load unchanged.
- **Fonts** (`app/layout.tsx`), loaded with `next/font/google` like Cinzel
  and Spectral today, and added to `<html>`'s `className`:
  ```ts
  const pixelify = Pixelify_Sans({
    variable: "--font-pixelify",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
  });
  const rubik = Rubik({
    variable: "--font-rubik",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
  });
  ```
  Cinzel and Spectral stay: the unthemed screens still use them.
- **Tokens** (`app/globals.css`), the values from the canvas (see UI Design
  Reference):
  ```css
  /* JRPG theme (intent/28): the Battle Board and Battle Map. Taken from
   * the hero cards: gold frames with gem corners, dark purple text
   * boxes, pixel lettering. */
  [data-theme="jrpg"] {
    /* Today's tokens, re-valued. */
    --color-bg: #15121d;
    --color-panel-bg: #221d2e;
    --color-border: #3b3350;
    --color-muted: #a59db8;
    --color-muted-strong: #d8d1e7;
    --color-text: #f6f2fc;
    --color-button-border: #5a5070;
    --color-p1: #56aab1; /* same hue as #4f9aa0, brighter */
    --color-p2: #d4705f; /* same hue as #c1665a, brighter */
    --font-heading: var(--font-pixelify), monospace;
    --font-body: var(--font-rubik), sans-serif;

    /* New: the frame palette. */
    --jr-gold: #f4c443;
    --jr-gold-light: #fde68f;
    --jr-gold-dark: #b8770f;
    --jr-ink: #0a0810;
    --jr-gem: #9ee8f3;
    --jr-gem-dark: #3a9cb1;
    --jr-stone: #5f5679;
    --jr-stone-light: #8a80a6;
    --jr-well: #1a1624;
    --jr-on-gold: #2b1a04;

    /* New: the recipes (see JRPG Theme Logic). */
    --jr-frame-shadow: 0 0 0 2px var(--jr-ink), inset 0 0 0 2px var(--jr-gold-dark),
      inset 0 0 0 3px var(--jr-ink);
    --jr-plate-shadow: 0 0 0 1px var(--jr-ink);
    --jr-key-bg: linear-gradient(#4b4265, #352e49);
    --jr-key-bg-hover: linear-gradient(#5c5180, #40385a);
    --jr-key-shadow: inset 1px 1px 0 rgb(255 255 255 / 0.2), inset -1px -1px 0 rgb(0 0 0 / 0.4);
    --jr-key-shadow-pressed: inset -1px -1px 0 rgb(255 255 255 / 0.14),
      inset 1px 1px 0 rgb(0 0 0 / 0.45);
    --jr-bar-shadow: inset 0 2px 0 var(--jr-gold-light), inset 0 -2px 0 var(--jr-gold-dark);

    background-color: var(--color-bg);
    background-image:
      linear-gradient(180deg, rgb(21 18 29 / 0) 0, var(--color-bg) 420px),
      repeating-conic-gradient(#201a2d 0 25%, var(--color-bg) 0 50%);
    background-size: 100% 100%, 8px 8px;
  }
  ```
- **Not re-valued:** `--color-gold` and every token color
  (`--color-confuse`, `--color-immobilize`, `--color-death-mark`,
  `--color-shield`, `--color-stone`, `--color-chill`,
  `--color-favored-enemy`, `--color-artifact`) and `--color-hp`. +1 Attack
  is drawn in `--color-gold`, so the frames use the new `--jr-gold`
  instead, and +1 Attack stays as it is (intent's "Token containers, not
  tokens"). The dark base keeps every token color readable, as they were
  tuned against dark panels (intent's Constraints).

## JRPG Theme Logic
Five recipes, each drawn from the hero cards. Every override is one of
them.

| Recipe | Look | Used by |
|---|---|---|
| **Gold frame** | 3px `--jr-gold` border, `--jr-gold-light` top edge and `--jr-gold-dark` bottom edge (a pixel bevel), `--jr-frame-shadow`, on `--color-panel-bg`. Large frames get a cyan gem on each top corner. | `BattleTeamPanel .panel` (with gems), `MapTeamStatusPanel .panel` (2px, smaller gems), `OverflowMenu .dropdown`, `ConfirmDialog .panel`, `TokenPicker .popover` (2px), the Map's `.zoomControls` (2px); the Map's `.board` as a box-shadow only (see below) |
| **Stone well** | 2px `--jr-stone` border with a `--jr-stone-light` top edge, `--jr-plate-shadow`, on `--jr-well`: the cards' dark text box | `HeroCard .battleCard`, `StructureSlot .slot` |
| **Stone plate** | The stone well's look on a small control: every pill (`border-radius: 999px`) becomes a square plate | `BattleTeamPanel .pill` (gold and team level), `ViewToggle .toggle`, `PhaseControl .pill` (round and phase), `GoldPilesBar .item`, `InitiativeBadge .badge` (border in the holder's team color, as today) |
| **Raised key** | `--jr-key-bg`, 1px `--jr-ink` border, `--jr-key-shadow`; hover `--jr-key-bg-hover`; `:active` swaps to `--jr-key-shadow-pressed` | `NumberStepper .button`, `OverflowMenu .trigger`, `ConfirmDialog .cancelButton`, the Map's `.zoomButton` |
| **Gold bar** | `--jr-gold` background, `--jr-bar-shadow`, `--jr-on-gold` text: the cards' title rails | `ViewToggle`'s selected option, `PhaseControl .current`, `ConfirmDialog .confirmButton` |

Other overrides:
- **Square corners everywhere** on the themed screens: `border-radius: 0`
  on every element that has one, token chips (`TokenChip`,
  `TokenToggle`, `ArtifactToggle`, `TokenPicker .add`) and `MapToken`
  included. Each keeps its own token color border and fill.
- **Gems:** `::before` and `::after` on the framed element (which gets
  `position: relative`), 14px squares at -9px (10px at -7px on the Map's
  status panels): `--jr-gem` with a `--jr-gem-dark` shade, a
  `--jr-gold-dark` rim and an ink outline. Absolutely placed, so they take
  no room.
- **The JRPG cursor:** `OverflowMenu .item` gets a small `--jr-gold`
  triangle (`::before`, CSS borders) on `:hover` and `:focus-visible`,
  in 24px of left padding. The dropdown is a pop-up, so the extra
  padding moves nothing on the screen.
- **Pixel level pips:** `HeroCard .levelPip` square, `--jr-stone` when
  empty and `--jr-gold` with a 1px bevel when filled.
- **HP badge:** `HeroCard .hpBadge` square, its `--color-hp` border 2px.
- **Portraits:** `HeroCard .battleTokenWrapper` gets square corners and no
  frame (decided 2026-10-29: the gold portrait frame drawn on the canvas
  was dropped). The respawn band (spec 24) and the defeat animation (spec
  27) are untouched.
- **Team rules stay:** the 2px rules under each team name
  (`BattleTeamPanel .header`, `MapTeamStatusPanel .header`) keep their
  team color and width.
- **Respawn area and holders:** `RespawnAreaStrip .strip`,
  `ArenaPanel .box`, `BearTrapHolder .box` and `IceWallHolder .box` keep
  their dashed outline, as a 2px dashed `--jr-stone` rim on `--jr-well`.
  Their drag-over states keep today's highlight.
- **Fonts, by role** (intent's "Readability wins over flavor"):
  - Pixel lettering (`--font-heading`, now Pixelify Sans): team names,
    hero names, section labels, the round and phase labels, the view
    toggle, button labels and dialog titles. Team names, section labels,
    phases and dialog titles already read `--font-heading`, so they need
    no override. Hero names (`HeroCard .battleName`), `ViewToggle .option`
    and the button labels read `--font-body` today and get one.
  - Clean text (`--font-body`, now Rubik): body text and **every number**.
    The three numbers that read `--font-heading` today switch to
    `--font-body`: `PhaseControl .roundValue`, `HeroCard .respawnValue` and
    `MapTeamStatusPanel .respawnWindow`.
  - Titles get a 1-2px `--jr-ink` `text-shadow`, as on the cards.
- **Hover and press only.** Existing transitions stay. Nothing animates on
  its own, and nothing new plays under reduced motion (intent's "Static").

## Layout
- **No element changes its outer size** (intent's "No lost space on the
  laptop"). The frontend sets `box-sizing: border-box` on everything, so:
  - **A thicker border is paid back from padding**, pixel for pixel. For
    example, `BattleTeamPanel .panel` goes from a 1px border with 20px
    padding to 3px with 18px, and `MapTeamStatusPanel .panel` from 1px
    with `14px 12px` to 2px with `13px 11px`. The same applies to every
    plate, well and key.
  - **Everything else is drawn outside the layout:** outlines, bevels and
    insets are `box-shadow`, and gems and the cursor are absolutely placed
    pseudo-elements.
- **The Map's board keeps its full size.** `.board` keeps its 1px border
  (as `--jr-ink`), and the gold frame is a `box-shadow` stack outside it
  (`0 0 0 3px` gold, `0 0 0 4px` gold-dark, `0 0 0 6px` ink). `.board`'s
  `overflow: hidden` clips its children, not its own shadow.
- **Gems fit in the existing gutters:** the Board's `.scrollArea` has
  32px of vertical padding around the team panels, and the Map's 24px, so
  a gem 9px (or 7px) outside a panel's corner isn't clipped and adds no
  scroll.
- **Fonts:** a bigger x-height or wider glyphs could make a label wrap or
  a fixed-width box overflow. Pixelify Sans is only for short labels, and
  every number uses Rubik. Check it at 1280x800 (see Open Items).
- **Both QA screens:** at 1280x800 (must pass) and 2560x1440, the Board
  and the Map show no new scrollbar and no element moves, compared with
  `main`.

## Assets
- **No image assets.** Frames, gems, bevels, the cursor and the background
  dither are CSS. Nothing is cut out of the publisher's card or map art
  (intent's "Original pieces").
- **Two fonts**, both on Google Fonts under the SIL Open Font License:
  Pixelify Sans and Rubik. `next/font` self-hosts them at build time, as
  it does Cinzel and Spectral.

## UI Design Reference
On the same canvas as intents 01-27 ("BfbHelper — App Flow"):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

Version 117 adds a row titled **"Intent 28 — JRPG Theme"** below the
Battle Board column, with two artboards:
- **"Battle Board — JRPG Theme"** is the "Battle Board" artboard with the
  theme layered on top: the gold-framed team panels with gems, the hero
  cards and structure slots as stone wells, the plates, raised keys and
  gold bars in the top bar and team headers, square token chips, and the
  framed ⋯ menu with the JRPG cursor and the End Battle dialog.
- **"Battle Map — JRPG Theme"** does the same to the "Battle Map"
  artboard: the board in a gold frame drawn outside its box, framed status
  panels with small gems, stone respawn wells, the gold-piles plates and
  the framed zoom controls.
- Both have a **Tweaks** switch for the type: "Pixel titles, clean text"
  (Pixelify Sans for titles and labels, Rubik for text and numbers, the
  default and this spec's choice) or "All pixel" (Pixelify Sans
  throughout).
- Version 118 removes the gold frame around the Board's hero portraits
  (decided 2026-10-29).

The Map artboard predates intents 14, 16 and 18, so it has no Arena, Ice
Wall or Bear Trap holder. Those follow the same recipes (see JRPG Theme
Logic).

This is a prototype for visual direction only, the same caveat as
earlier intents' references. If a revised canvas supersedes these
choices, it wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra. The two new fonts are self-hosted by `next/font`, so there are no
runtime calls to Google.

## Open Items for Implementation
- **Type pairing.** This spec takes the canvas default, "Pixel titles,
  clean text". If the user prefers "All pixel" after seeing it in the
  app, `--font-body` takes Pixelify Sans too. Check that the numbers stay
  readable at a glance at 1280x800 either way (intent's Constraints).
- **Check the layout in the browser** at 1280x800 and 2560x1440 with
  `/qa-screens`, against `main`: no new scrollbar on the Board or the Map,
  the team panels and the Map's board the same size, and no label wrapping
  in the new fonts. Measure a few boxes (team panel, hero card, status
  panel, board) with `getBoundingClientRect` before and after, rather than
  by eye.
- **The pieces missing from the canvas:** the Arena, Ice Wall and Bear
  Trap holders, the hero card's tooltips and the token picker's popover
  on the Map. Check each in the app against the recipes, and show the user
  before calling it done.
- **Focus rings:** today's `:focus-visible` outlines use `--color-gold`
  or a token color. Check they still read on the new frames, especially
  a gold outline on a gold bar.
- **Tests.** One test per screen that its root has `data-theme="jrpg"`,
  and one that `DraftBoardScreen`'s root doesn't. jsdom doesn't apply the
  CSS, so the look itself is checked in the browser. No e2e change.
- **Folding the overrides in.** Once every screen has the theme (the two
  new `BACKLOG.md` items), the `:global([data-theme="jrpg"])` overrides
  can become each component's base rules and the old look can be
  removed. That's for the last of those items, not this one.
