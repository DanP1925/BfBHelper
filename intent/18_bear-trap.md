# Intent 18: Bear Trap

## Problem
One of Boreas's power cards places his Bear Trap token on his space. When
an enemy hero triggers it, that hero is immobilized and the trap is
discarded. The Battle Map has nowhere to show it. Players using the app
instead of the physical board have to remember which space is trapped.
That breaks the product vision of playing with just the cards.

The backlog's hero playability review lists Bear Trap as a hero-specific
feature: it only matters when Boreas is in the battle. Like Ice Wall
(intent 16), it's a thing on the Map, not a value on a hero card. Unlike
Ice Wall, it sits on a space, not on a path between two.

## Scope
This phase covers only:
- **One Bear Trap marker on the Battle Map,** snapped to a space
  (decided 2026-10-18). The app records which space it's on, not a free
  position like Ice Wall's.
- **Any board space** (decided 2026-10-18): plain spaces, Towers, Bits
  and gold-pile spaces, but not the Arena. The app doesn't check that
  it's the space Boreas is on.
- **Dropping between spaces does nothing** (decided 2026-10-18). The trap
  stays where it was, the same as dragging a hero today. It doesn't snap
  to the nearest space.
- **An off-board holder in Boreas's team column** (decided 2026-10-18).
  The trap starts in a small Bear Trap holder on the Map, outside the
  board art, like Ice Wall's holder. Players drag it from the holder onto
  a space, move it by dragging it to another space (playing the card
  again), and drag it back to the holder to remove it. The holder's
  exact placement and look are settled in the spec/design.
- **Hero-specific, at any level** (decided 2026-10-18). The holder and
  the trap are shown only while Boreas is in the battle, drafted on
  either team. This follows the backlog's visibility rule (decided
  2026-10-10). He counts as in the battle at 0 HP and in the respawn
  area too.
- **Triggering is manual** (decided 2026-10-18). When an enemy hero steps
  on the trap, the player turns on Immobilize on that hero's card
  (intent 08) and drags the trap back to the holder. The app never does
  either on its own, and never stops a hero from being dragged onto or
  across the trapped space.
- **Removed by hand only** (decided 2026-10-18). The app never sends the
  trap back to its holder on its own, including when Boreas is defeated.
  This is the same manual-tracker approach as intents 03-17.
- **Editable on the Map.** The trap is a position, like hero tokens, the
  Arena and Ice Wall, so dragging it there is an exception to the Map
  being read-only for tokens (decided 2026-10-15).
- **Map only** (decided 2026-10-18). Nothing changes on the Battle Board,
  including Boreas's card.

## Proposed Outcome
Boreas is drafted, and the Bear Trap sits in its holder in his team's
column on the Map. His player plays the Bear Trap card and drags the trap
from the holder onto Boreas's space. Both players see the trapped space.
Later an enemy hero is dragged onto it: that player turns on Immobilize on
the hero's card and drags the trap back to the holder. When the card is
played again, the trap goes onto Boreas's new space.

## Rules (from the rulebook and Boreas's card)
- Boreas's power card (confirmed 2026-10-18) places the Bear Trap on
  Boreas's own space. It can be played at any level. Playing it again
  moves the trap that's already on the board.
- An enemy hero that triggers the trap is immobilized, and the trap is
  discarded.
- The box has **1 Bear Trap** (p. 3).
- Per the Tokens rules (p. 11), tokens associated with a defeated hero
  are discarded, and Bear Trap is named as an example. So the trap
  leaves the board when Boreas is defeated.

The app shows where the trap is. Players apply triggering and the defeat
rule themselves.

## Users
Same as intents 01-17: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Adds the trap's position (in the holder, or a board
  space) to the persisted `BattleState`. No separate store.
- **Hero-specific visibility.** The trap follows the backlog's
  visibility rule through Boreas.
- **Battle Map.** A new draggable trap marker and its holder, next to the
  board, respawn areas, Arena and Ice Wall holder. Board spaces become
  drop targets for the trap as well as for heroes. The map's space data
  (`mapSpaces.ts`) doesn't change.

## Constraints
- React + TypeScript frontend, consistent with intents 01-17. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on the Battle Map, next to
  the board, respawn areas, Arena, Ice Wall holder and status panels.
- The trap shares its space with any hero tokens there. How the two sit
  together is settled in the spec/design.
- `BattleState` is persisted and in use. Recording the trap is a schema
  change, and an existing saved battle **upgrades in place** instead of
  resetting (as intents 04-17 do), with the trap in its holder.
- No new art is required beyond what the spec/design picks for the
  marker and holder.

## Out of Scope (deferred to later phases)
- **Snapping to the nearest space** when dropped between spaces.
- **Enforcing the rules,** such as checking the trap goes on Boreas's
  space, or rejecting a hero drag onto the trapped space.
- **Triggering automatically,** such as immobilizing an enemy dropped on
  the trap or sending the trap back to its holder.
- **Removing the trap automatically** when Boreas is defeated.
- **Placing it in the Arena.**
- **Anything on the Battle Board,** such as a "Bear Trap placed" marker
  on Boreas's card.
- **Editing other tokens on the Map.** It stays read-only for hero
  tokens (decided 2026-10-15).
- **3-4 player variant**, deferred along with intents 01-17.

## Session Lifecycle
- The trap's position is part of the persisted battle state. Reloading
  mid-battle keeps it.
- Starting a new draft clears it, sending the trap back to its holder,
  along with the rest of the battle state.
- Switching between Board and Map doesn't change it. Map zoom and pan
  don't move it off its space.
- The trap stays where it is until dragged. A passed round, Boreas
  moving, his level or HP changing, or his defeat doesn't move it.
