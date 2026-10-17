# Intent 14: To the Pain Arena

## Problem
Felix's level-4 power card sends him and one enemy hero into the "To the
Pain" Arena: a separate board, off the main map, where only those two
fight until one of them is defeated. The Battle Map has nowhere to put
them. Players using the app instead of the physical board would have to
leave both heroes on their old spaces and remember they're really in the
Arena. That breaks the product vision of playing with just the cards.

The backlog's hero playability review lists the Arena as a hero-specific
feature: it only matters when Felix is in the battle. Unlike the tokens
of intents 09-13, it's a place on the Map, not a value on a hero card.

## Scope
This phase covers only:
- **An Arena panel on the Battle Map,** outside the board art and not
  one of its spaces, standing in for the physical Arena. Heroes in it
  have no board position, like heroes in a respawn area. Its exact
  placement and look are settled in the spec/design.
- **Hero-specific and level-gated** (decided 2026-10-17). The panel is
  shown only while Felix is in the battle, drafted on either team,
  **and** at level 4, **and** not defeated (not at 0 HP and not in his
  respawn area). Otherwise it's hidden. There's no "start duel" control:
  the panel is simply there, empty, until heroes are dragged in.
- **Never hides an occupied Arena** (decided 2026-10-17). While any
  hero is in the Arena, the panel stays visible, whatever Felix's level
  or state. So a level lowered by hand mid-duel, or Felix losing the
  duel and going to his respawn area, never hides a hero. Once the
  Arena is empty again, the rule above applies.
- **Only Felix and one enemy can go in** (decided 2026-10-17). The panel
  accepts Felix and Felix's enemies, at most one enemy at a time. Any
  other drop (Felix's allies, a second enemy) is silently rejected, the
  same way a respawn area rejects the other team's heroes.
- **Dragged in and out by hand,** in any order (decided 2026-10-17).
  The Arena can briefly hold just Felix or just the enemy, and either
  hero can be dragged out at any time, onto any board space or back to
  their respawn area, to fix a mistake. The app never checks whether a
  duel is valid.
- **Ending the duel** (decided 2026-10-17). The defeated hero goes to
  their respawn area through the existing 0-HP behaviour (intent 04).
  The player drags the survivor out to their team's Bit; the app never
  moves the survivor itself, following intent 04's rule that nothing
  picks a space on the player's behalf.
- **Map only** (decided 2026-10-17). Nothing changes on the Battle Board:
  positions are the Map's job, and the Board shows none.

## Proposed Outcome
Felix reaches level 4 and an empty Arena appears on the Map. His player
plays the To the Pain card and drags Felix and the targeted enemy from
their spaces into the Arena. They fight over the next few rounds, with
HP edited on the Board as usual. When the enemy hits 0 HP, it goes back
to its respawn area on its own, and the player drags Felix out of the
Arena onto his team's Bit.

## Rules (from the rulebook and Felix's card)
- The box has **1 To the Pain Arena** (p. 3). The rulebook has no
  further Arena rules, and Felix's hero card only carries *En Garde*.
- Per `BACKLOG.md` and Felix's level-4 power card (confirmed
  2026-10-17): Felix and one enemy hero go to the Arena, a single
  isolated space where only those two can interact. **Nobody can leave
  until one of them is defeated.** The defeated hero goes through the
  normal defeat/respawn flow, and the survivor returns to their own Bit.

The app holds where the heroes are. Players enforce who may enter and
when they may leave.

## Users
Same as intents 01-13: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Adds which heroes are in the Arena to the persisted
  `BattleState`, alongside each hero's position (`heroPositions`). No
  separate store.
- **Hero-specific visibility.** The Arena follows the backlog's
  visibility rule through Felix, with the extra level-4 and
  not-defeated conditions above.
- **Battle Map.** A new Arena drop target with the existing hero tokens
  (`MapToken`) inside, next to the board and respawn areas
  (`RespawnAreaStrip`). Drag and drop works as it does between spaces
  and respawn areas today.
- **Defeat handling.** A hero dropping to 0 HP inside the Arena goes to
  their respawn area, the same as from a board space.

## Constraints
- React + TypeScript frontend, consistent with intents 01-13. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on the Battle Map, next
  to the board, respawn areas and status panels.
- `BattleState` is persisted and in use. Recording the Arena is a
  schema change, and an existing saved battle **upgrades in place**
  instead of resetting (as intents 04-13 do), with the Arena empty.
- No new art is required beyond what the spec/design picks for the
  panel. Heroes inside reuse their `battleToken` art.

## Out of Scope (deferred to later phases)
- **Enforcing the Arena rules.** The app never stops a hero leaving
  before a defeat, never requires both heroes to go in together, and
  never checks that the enemy was a legal target.
- **Moving the survivor automatically** to their Bit.
- **Anything on the Battle Board,** such as an "In the Arena" marker on
  hero cards.
- **A "start duel" or "end duel" control.** The Arena is just a place.
- **Felix's *En Garde*** (+1 Attack while alone in his space). The Map's
  grouping already shows it, per `BACKLOG.md`.
- **The other hero-specific features** (Favored Enemy, Bear Trap, Ice
  Wall, Artifacts). They're separate backlog items.
- **3-4 player variant**, deferred along with intents 01-13.

## Session Lifecycle
- Who is in the Arena is part of the persisted battle state. Reloading
  mid-battle keeps it.
- Starting a new draft clears it along with the rest of the battle
  state.
- Switching between Board and Map doesn't change it. Both screens read
  the same state.
- A hero in the Arena stays there until dragged out or defeated. A
  passed round, Felix's level changing or another hero's defeat doesn't
  move anyone.
