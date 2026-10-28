# Intent 28: JRPG Theme

## Problem
The app's look doesn't match the game's. The Battle Board and Battle Map use
a plain dark-brown UI with serif type (Cinzel and Spectral), while
everything Biternia puts on the table is vibrant 16-bit JRPG fantasy: the
hero cards are pixel-art sprites in gold frames with gem corners, pixel
lettering on dark text boxes, and the map is an SNES-style tileset. The
hero portraits and the map sit inside the app like pasted-in pictures
instead of belonging to it.

This is a v2.0 item: the app should feel like part of the game the players
are holding, so they stay in that world instead of switching between a
game and a tool.

## Scope
This phase covers only:
- **The art direction is the cards and the map** (decided 2026-10-29).
  "Vibrant 16-bit JRPG fantasy": pixel-art frames, gold-and-gem trim and
  pixel lettering, as on the hero cards and the map. Not the rulebook
  cover's painted, anime-style look, which would clash with the sprites.
- **A dark base** (decided 2026-10-29), like the cards' text boxes, with
  vibrant gold and gem frames and accents. The map, the hero portraits and
  the structure art stay as they are.
- **Original pieces, inspired by the cards** (decided 2026-10-29). Frames,
  panels, buttons and icons are drawn new in the same pixel style and
  colors. Nothing is cut out of the publisher's card or map art.
- **The Battle Board and the Battle Map** (decided 2026-10-29), the screens
  players spend the game on. This includes the top bar they share (view
  toggle, round and phase, initiative, the ⋯ menu) and the pop-ups that
  open from them: the token picker, the ⋯ menu, confirm dialogs and the
  hero card's tooltips.
- **The look only, not the layout** (decided 2026-10-29). Colors, type,
  frames, buttons and backgrounds change. Nothing moves or resizes, so the
  theme doesn't collide with the backlog items that change the layout.
- **Static** (decided 2026-10-29). Hover and press states can change, but
  nothing animates on its own.
- **Token containers, not tokens** (decided 2026-10-29). Token chips, the
  picker and the status panels get the new frame. Each token's icon and
  color stay as they are.

Where each font goes, the exact palette and every frame's design are
settled in the spec and its design on the canvas.

## Proposed Outcome
The players open the Battle Board. The two team panels sit in gold frames
with gem corners, like the hero cards beside the board, and the team
names, labels and the round and phase read in pixel lettering. Ceralin's
HP, her level and Player 1's gold are as easy to read from across the
table as before. They switch to the Map: the board now sits in a matching
frame, the team status panels and respawning areas share it, and adding a
Chill token to Dazeem opens a picker in the same style, with the same
frost-cyan Chill icon as before. Nothing has moved, and nothing scrolls
on the laptop that didn't before. Starting a new draft takes them to the
Draft screen, which still has the old look until its own item lands.

## Users
Same as intents 01-27: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Global styles.** A new palette, type and shared frame and button
  styles for the themed screens.
- **Battle Board and Battle Map.** Every panel, control and pop-up on them
  is restyled. No behavior changes.
- **No battle state change.** Nothing new is stored.

## Constraints
- React + TypeScript frontend, consistent with intents 01-27. No backend.
- **Readability wins over flavor** (decided 2026-10-29). HP, gold, levels
  and every other number stay readable at a glance, even if that limits the
  pixel font to titles and labels.
- **No lost space on the laptop** (decided 2026-10-29). At 1280x800 (the
  13.3" laptop), nothing shrinks or starts scrolling compared to today, so
  frames can't eat into the room the Board and Map already fill.
- **Team colors keep their hues** (decided 2026-10-29): Player 1 blue,
  Player 2 red, only tuned in brightness or saturation, so the themed
  screens still match the ones that aren't themed yet.
- **Token colors keep working**: they were tuned against dark panels, which
  the dark base keeps.

## Out of Scope (deferred to later phases)
- **The Draft screen**, and **the Start, Results and Win screens**, each a
  new `BACKLOG.md` item (decided 2026-10-29). Until they land, the app has
  two looks.
- **Token redesign.** It stays in the `BACKLOG.md` item "Review every
  token's display together".
- **Animations and decorative motion.** Defeat, level 4, coin-flip and
  turn-passing animations keep their own items.
- **Layout changes.** Merging the Board and Map, moving the gold-pile
  controls and hiding an empty respawn area keep their own items.
- **The cover's painted style**, and generic tabletop textures such as
  wood or felt (decided against 2026-10-29).
- **3-4 player variant**, deferred along with intents 01-27.

## Session Lifecycle
- Nothing new is stored. The theme is the same for every battle, on reload
  and after a new draft.
