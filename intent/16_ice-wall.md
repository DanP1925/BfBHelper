# Intent 16: Ice Wall

## Problem
One of Dazeem's power cards places his Ice Wall token on a path between
two map spaces, cutting the link between them. The Battle Map has nowhere
to show it. Players using the app instead of the physical board have to
remember which path is walled off. That breaks the product vision of
playing with just the cards.

The backlog's hero playability review lists Ice Wall as a hero-specific
feature: it only matters when Dazeem is in the battle. Like the Arena
(intent 14), it's a thing on the Map, not a value on a hero card.

## Scope
This phase covers only:
- **One Ice Wall marker on the Battle Map,** placed freely (decided
  2026-10-17). It's dragged anywhere on the board art, and the app
  records only where it was dropped, not which path it's on or which
  two spaces it separates. It doesn't snap to a path.
- **Fixed orientation** (decided 2026-10-17). The marker can't be
  rotated. Players read which path it cuts from where it sits.
- **An off-board holder** (decided 2026-10-17). The wall starts in a
  small Ice Wall holder on the Map, outside the board art, like the
  respawn areas. Players drag it from the holder onto the board, move it
  around the board by dragging it again, and drag it back to the holder
  to remove it. The holder's exact placement and look are settled in the
  spec/design.
- **Hero-specific, at any level** (decided 2026-10-17). The holder and
  the wall are shown only while Dazeem is in the battle, drafted on
  either team. This follows the backlog's visibility rule (decided
  2026-10-10). Unlike the Arena, there's no level gate.
- **Visual only** (decided 2026-10-17). The app never stops a hero from
  being dragged across a walled path, never checks that the wall touches
  Dazeem's space, and never works out adjacency. Players respect the
  wall at the table, as with every move since intent 04.
- **Removed by hand only** (decided 2026-10-17). The app never sends
  the wall back to its holder on its own, including when Dazeem is
  defeated. This is the same manual-tracker approach as intents 03-15.
- **Editable on the Map.** The wall is a position, like hero tokens and
  the Arena, so dragging it there is an exception to the Map being
  read-only for tokens (decided 2026-10-15).
- **Map only** (decided 2026-10-17). Nothing changes on the Battle
  Board, including Dazeem's card.

## Proposed Outcome
Dazeem is drafted, and the Ice Wall sits in its holder on the Map. His player plays the Ice Wall card and drags the wall from the
holder onto the path between Dazeem's space and the next one. Both
players see that the path is cut and move around it. A few rounds later
the card is played again and the wall is dragged onto another path. When
Dazeem is defeated, his player drags it back to the holder.

## Rules (from the rulebook and Dazeem's card)
- Dazeem's power card (confirmed 2026-10-17): "Move your Ice Wall token
  to a path connecting your space with an adjacent one. While the token
  is between them, these spaces are no longer adjacent." The wall sits
  on a path between two spaces, not on a space. It stays until it's
  moved again.
- The card can be played at any level (confirmed 2026-10-17).
- The box has **1 Ice Wall** (p. 3).
- Per the Tokens rules (p. 11), tokens associated with a defeated hero
  are discarded, and Ice Wall is named as an example. So the wall
  leaves the board when Dazeem is defeated.

The app shows where the wall is. Players apply adjacency and the defeat
rule themselves.

## Users
Same as intents 01-15: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Adds the wall's position (in the holder, or a point
  on the board) to the persisted `BattleState`. No separate store.
- **Hero-specific visibility.** The wall follows the backlog's
  visibility rule through Dazeem.
- **Battle Map.** A new draggable wall marker and its holder, next to
  the board, respawn areas and Arena. Drag and drop works as it does for
  hero tokens today. The map's space data (`mapSpaces.ts`) doesn't
  change, since free placement needs no list of paths.

## Constraints
- React + TypeScript frontend, consistent with intents 01-15. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on the Battle Map, next
  to the board, respawn areas, Arena and status panels.
- The wall must stay over the same spot on the board art at any Map
  zoom or pan.
- `BattleState` is persisted and in use. Recording the wall is a schema
  change, and an existing saved battle **upgrades in place** instead of
  resetting (as intents 04-15 do), with the wall in its holder.
- No new art is required beyond what the spec/design picks for the
  marker and holder.

## Out of Scope (deferred to later phases)
- **Snapping to real paths,** or adding a list of the board's paths to
  the map data. Free placement was chosen as the simpler option, since
  nothing is enforced.
- **Enforcing adjacency,** such as rejecting a hero drag across the
  wall or checking the wall touches Dazeem's space.
- **Rotating the wall.**
- **Removing the wall automatically** when Dazeem is defeated.
- **Anything on the Battle Board,** such as an "Ice Wall placed" marker
  on Dazeem's card.
- **Editing other tokens on the Map.** It stays read-only for hero
  tokens (decided 2026-10-15).
- **Boreas's Bear Trap** (decided 2026-10-17). It's a separate backlog
  item. Intent 13 said it works the same way as Ice Wall, but it
  doesn't: Bear Trap sits on a space, Ice Wall on a path. Ice Wall's
  holder and free drag-to-place should still be reused for Bear Trap.
- **The other hero-specific features** (Artifacts). They're separate
  backlog items.
- **3-4 player variant**, deferred along with intents 01-15.

## Session Lifecycle
- The wall's position is part of the persisted battle state. Reloading
  mid-battle keeps it.
- Starting a new draft clears it, sending the wall back to its holder,
  along with the rest of the battle state.
- Switching between Board and Map doesn't change it. Map zoom and pan
  don't move it off its spot on the board art.
- The wall stays where it is until dragged. A passed round, Dazeem's
  level or HP changing, or his defeat doesn't move it.
