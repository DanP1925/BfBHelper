# Intent 30: Respawn Full HP

## Problem
When a defeated hero's card is drawn, the hero respawns at full health and
goes back on the board. In the app, respawning is dragging the hero from
the respawn area onto a Map space, but that only moves the hero: the HP
stays at 0. Players have to remember to raise it by hand, and work out
the hero's max HP (Base HP plus level) to do it.

This is a v2.0 item: automation that removes a common human error, and
one less thing to look up in the rulebook.

## Scope
This phase covers only:
- **Respawning sets full HP** (decided 2026-11-02). When a hero is dragged
  from the respawn area onto a Map space, their HP is set to their
  current max HP: Base HP plus their level. The drag is the only trigger,
  as it's already the respawn step.
- **Only from 0 HP** (decided 2026-11-02). The HP is set only if it's 0
  when the hero leaves the respawn area. A hero above 0 keeps their HP:
  every hero at battle start, or one whose HP was already raised by hand.
- **The respawn window clears as before**. Intent 24 already clears it
  when HP goes above 0, so it goes away with the same drag.
- **HP stays editable by hand**, for corrections and anything the app
  doesn't automate.

## Proposed Outcome
In Round 5's Cleanup, Player 1 draws Ceralin's card. She's at level 2 with
a Base HP of 10, and her HP reads 0 with her respawn window beside it.
Player 1 drags her from the respawn area onto the space with their top
Tower: her HP reads 12 and the window disappears. Had Player 1 already
raised her HP to 12 by hand, the drag would only have moved her.

## Rules (from the rulebook)
- A hero's maximum HP is their Base HP plus their current level (p. 6).
  No card, token or Artifact changes it (confirmed 2026-11-02).
- When you would draw a Hero card, place it on your Hero mat and set its
  health marker at full health. Then return the hero's standee to any
  space with one of your Towers (not destroyed) or your Elemental Bit
  (p. 12).

The app sets the HP. Where the hero is placed stays with the table.

## Users
Same as intents 01-29: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Moving a hero at 0 HP from the respawn area onto a Map
  space also sets their HP to Base HP plus level. No new stored state: the
  saved battle shape doesn't change.
- **Battle Map.** No new UI. The drag out of the respawn area works as
  today.
- **Battle Board.** No new UI. The hero's HP updates with the drag.

## Constraints
- React + TypeScript frontend, consistent with intents 01-29. No backend.
- No schema change, so existing saved battles keep working as they are.

## Out of Scope (deferred to later phases)
- **A "Respawn" button on the Board** (decided against 2026-11-02). It
  would set HP without placing the hero on the Map.
- **Undoing a mistaken respawn** (decided against 2026-11-02). Setting the
  HP back to 0 by hand moves the hero to the respawn area, with a new
  window from the current round.
- **Checking where the hero is placed** (decided against 2026-11-02). The
  app doesn't limit the drop to a friendly Tower or Bit space.
- **3-4 player variant**, deferred along with intents 01-29.

## Session Lifecycle
- Nothing new is stored. The HP set on respawn is ordinary hero HP, kept
  on reload and reset by a new draft like the rest of the battle state.
