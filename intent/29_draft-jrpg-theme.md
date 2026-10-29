# Intent 29: Draft JRPG Theme

## Problem
Intent 28 gave the Battle Board and the Battle Map the cards' 16-bit JRPG
look, and left the Draft screen in the old plain dark-brown UI with serif
type. The draft is where every game starts, and the hero cards the players
pick from are the very art the theme was drawn from, so it's where the
mismatch shows most: the card art sits in a screen that looks like a
different game.

This is a v2.0 item: the app should feel like part of the game the players
are holding, from the first pick on.

## Scope
This phase covers only:
- **The Draft screen** (decided 2026-10-29): the header (title, initiative
  and the turn banner), both team panels and their hero slots, the role
  filter, the hero pool and the New Draft button.
- **Intent 28's rules, unchanged** (decided 2026-10-29), so the Draft
  matches the Board and the Map:
  - The art direction is the hero cards and the map: a dark base with
    vibrant gold and gem frames, pixel lettering for titles and labels.
  - Original pieces, inspired by the cards. Nothing is cut out of the
    publisher's card or map art.
  - The look only, not the layout. Colors, type, frames, buttons and
    backgrounds change. Nothing moves or resizes.
  - Static. Hover and press states can change, but nothing animates on its
    own.
- **The pick animation stays** (decided 2026-10-29). Intent 10's
  animations (the picked card fading, the pool closing the gap, the hero
  appearing in its slot) play exactly as today, in the new look.
- **The pool's cards stay bare** (decided 2026-10-29). Each card's art
  already has its own gold frame and gem corners, so it gets no second
  frame. Only what surrounds the cards is themed: the panels behind them
  and their hover and focus states.

How the active turn reads in the new look, and every frame's design, are
settled in the spec and its design on the canvas.

## Proposed Outcome
The players start a new draft. The title and the turn banner read in
pixel lettering, and each team's name sits on a stone plate like the
plates they'll see on the Battle Board. Player 1's turn is as clear as
before.
They filter the pool to Utility: the role filter has the new look, and its
counts are as easy to read as before. They tap Ceralin: her card fades,
the pool closes the gap and she appears in Player 1's first slot, the same
animation as today. After the eighth pick the versus finale still has the
old look until its own item lands, and the Battle Board that follows
matches the Draft.

## Users
Same as intents 01-28: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Draft screen.** Every panel, control and label on it is restyled. No
  behavior changes.
- **Global styles.** Intent 28's palette, type and shared frame and button
  styles, reused.
- **No draft state change.** Nothing new is stored.

## Constraints
- React + TypeScript frontend, consistent with intents 01-28. No backend.
- **Readability wins over flavor**, as in intent 28: the step count, the
  role filter's counts and every other number stay readable at a glance.
- **No lost space on the laptop**, as in intent 28: at 1280x800 (the 13.3"
  laptop), nothing shrinks or starts scrolling compared to today. The pool
  has to keep fitting.
- **Team colors keep their hues**, as in intent 28: Player 1 blue,
  Player 2 red.
- **The screens that share the Draft's components keep their look.** The
  hero cards also appear on the Results and Win screens, which stay
  unthemed.

## Out of Scope (deferred to later phases)
- **The Start, Results and Win screens** (decided 2026-10-29), which keep
  their `BACKLOG.md` item. Until it lands, the app has two looks: Start
  (old), Draft (new), Results (old), Battle Board and Map (new).
- **Folding the theme into each component's base styles** and removing
  the old look, which waits for the item that themes the last screen
  (spec 28's open item).
- **The coin-flip and turn-passing animations**, which keep their own
  `BACKLOG.md` items.
- **Layout changes** to the Draft.
- **A frame around the pool's cards** (decided against 2026-10-29).
- **3-4 player variant**, deferred along with intents 01-28.

## Session Lifecycle
- Nothing new is stored. The theme is the same for every draft, on reload
  and after a new draft.
