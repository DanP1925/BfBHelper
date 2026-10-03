# Intent: BfbHelper (v4 — Battle Map)

## Problem
Intents 02-03 gave players a Battle Board that tracks every team's gold,
hero HP/level, and structure HP — but it says nothing about *where*
anything is. The physical game is played on a shared board: heroes stand
in specific spaces, move between them each round, and several rules
(Ranged/Area attack legality, a Tower blocking the path to its Bit,
farming bonus gold) depend entirely on who's standing where. Today,
players must still track all of that on the physical board/standees
themselves — the app has no idea positioning even exists.

Per the project's product vision, the app's role is to let players run
the physical game with just the cards, while the app tracks everything
else. This intent extends that to the board itself: a Battle Map screen
that represents the shared game board digitally, so hero/structure
position and on-board gold piles move off the physical board and onto
the app, the same way intents 02-03 already did for HP/level/team gold.

(v1 = Hero Draft Picker, intent 01. v2 = Battle Board, intent 02. v3 =
Battle Controls, intent 03.)

## Scope for v4
This phase covers only:
- **One new screen**: the **Battle Map** — a single shared board (not a
  mirrored two-panel layout like the Battle Board) showing both teams'
  heroes, both teams' Structures (3 Towers + 1 Bit each), and the
  board's 3 neutral bonus-gold piles, each positioned on the space it
  currently occupies.
- **A defined set of named spaces** (a graph of nodes drawn over the
  board art) that a hero can snap onto — not freeform pixel dragging.
  Towers and Bits occupy their own fixed, named spaces (reusing the
  Top/Middle/Bottom/Bit naming the Battle Board already uses) and never
  move. The gold-pile spaces are likewise fixed. The remaining plain
  spaces making up the rest of the board's path network exist so heroes
  have everywhere else to stand — cataloging *every one* of them,
  exactly as drawn on the board art, is this intent's job, the same way
  intent 02 read Base HP values off each hero's card. Fidelity here is
  purely visual (see Free hero placement, below, for why it doesn't
  need to be rules-accurate) but this intent catalogs the board
  faithfully rather than simplifying it.
- **A per-team holding area for heroes with no board position.** Every
  hero starts here — before its first deployment, and again any time
  it's defeated (0 HP) — rather than defaulting onto a board space. A
  player drags a hero out of their team's holding area onto a board
  space to deploy or respawn it; nothing picks a space on the player's
  behalf, and a defeated hero returns to its holding area automatically.
  The holding area sits outside the board art itself and is never
  shared between teams.
- **Free hero placement, no movement-rule enforcement.** A player drags
  a hero's token to whichever space matches where that hero actually is
  in the physical game. The app does not validate that the move was
  legal (adjacency, a Tower blocking the path to the Bit, one move per
  Movement Phase) — same player-driven-only philosophy as intent 03's
  HP/gold controls. The board's path lines are part of the board art
  itself; the app doesn't reason about which spaces connect to which.
- **Interactive bonus-gold piles.** The 3 neutral gold spaces each
  display a count (starting at 3) with a manual control to decrease it
  as tokens are taken off the physical board, and reset it. This is
  separate, board-level state — distinct from each team's gold total
  (already tracked on the Battle Board/Controls) — and adjusting one
  never changes the other; a player who farms there still updates their
  team's gold total by hand, same as today.
- **Free, instant switching between the Battle Map and the existing
  Battle Board/Controls screen**, available at any point while a battle
  is in progress — not gated to a particular phase of the physical
  round. The two screens show complementary facets of the same ongoing
  battle: the Map shows *where* everything is, the Board shows *how
  much HP/level/gold* everything has. Unlike "New Draft"/"End Battle"
  (intent 03's overflow menu, reserved for rare/exceptional actions),
  switching screens is a core, frequently-used action and needs its own
  always-visible control, not a buried menu item.

## Proposed Outcome
While a battle is in progress, a persistent toggle lets players flip
between the Battle Board and a new Battle Map at any time. The Battle
Map shows one shared board with both teams' hero tokens, Towers, Bit,
and the 3 neutral gold piles, each sitting on a named space. Players
drag a hero's token out of its team's holding area onto a space to
deploy it, and between spaces afterward to reflect moves made in the
physical game's Movement Phase — a defeated hero returns to its team's
holding area until it's dragged back out to respawn. Gold piles tick
down as tokens are taken off the physical board. Neither screen blocks
the other — a player can check who's standing where on the Map, then
flip back to the Board to adjust HP after an attack, as often as the
physical game requires.

## Structures & Gold Piles on the Map
From the rulebook (`battle-for-biternia_rules_web.pdf`):
- Each team's 3 Towers and 1 Bit occupy fixed board spaces that never
  change — they're set up once and only ever destroyed, never moved.
  These are the same Top/Middle/Bottom/Bit structures the Battle Board
  already tracks HP for (intent 02/03); the Map just adds *where* they
  are, it doesn't introduce new structure state. A Structure at 0 HP
  disappears from the Map entirely — permanent, since Towers/Bit never
  respawn — reusing the same HP state the Battle Board already tracks
  rather than a separate flag.
- 3 board spaces start the game with 3 gold tokens each (Standard
  Setup, step 2) — a shared, neutral resource any hero from either team
  can take from (the "Farm" action), unrelated to which team's half of
  the board they sit on.
- Out of scope, mentioned here only for context: Ranged/Area attack
  legality, Tower-blocks-path-to-Bit, one-move-per-Hero-per-round — all
  real rules that depend on position, none enforced by this intent (see
  Out of Scope below).

## Heroes on the Map
- **Holding area, not a default space.** A hero with no board position
  yet — not deployed, or defeated and waiting to respawn — sits in its
  team's holding area rather than appearing somewhere on the board by
  default. A player drags it out onto a board space to deploy or
  respawn it; nothing picks a space on the player's behalf.
- **Deployment** follows from the holding area: per the rulebook, a
  hero's first board space must be one of its own team's Tower spaces.
  This intent doesn't enforce that rule either (see Out of Scope) — the
  holding area just gives the hero somewhere to start before a player
  places it, matching the physical game's deploy step without
  validating where it lands.
- **Defeat (0 HP)** pulls a hero's token off its current space and
  returns it to its team's holding area — not the desaturated
  "defeated" style the Battle Board leaves in place, and not
  disappearing outright either. This mirrors the physical rule (the
  standee is removed from the board) while keeping the hero visible and
  ready for a player to drag back out once it respawns.
- **Multiple heroes sharing a space** (the physical game allows
  unlimited stacking after deployment) fan out visually within that
  space rather than fully overlapping; a player drags any individual
  token directly off the cluster to move it — no intermediate list or
  picker.
- **Team identification**: since the Map mixes both teams' heroes on
  one shared board (unlike the Battle Board's two separate panels),
  every hero token gets a colored ring/badge — red or blue, matching
  that team's existing Tower/Bit colors — so it's clear at a glance
  whose hero is whose, in the holding areas and on the board alike.

## Layout
- A single shared board (the `Map.png` board art), not two mirrored
  team panels — the first screen in this project that isn't laid out
  that way, since the physical board itself isn't split by team.
- Hero tokens (reusing each hero's existing `battleToken` art, already
  used on the Battle Board) sit on top of the board art at their
  current space, fanned out where several share one space (see Heroes
  on the Map above).
- Two holding-area strips, one per team, outside the board art itself
  (e.g. above/below or beside the board) — where every undeployed or
  defeated hero on that team sits until a player drags it onto a board
  space.
- Structures reuse the existing Tower/Bit icon art (`public/structures/`)
  at their fixed spaces; gold piles reuse the existing gold icon
  (`public/structures/gold.png`) plus their count.
- A persistent Map/Board toggle sits somewhere both screens share (e.g.
  a header, consistent across this and the Battle Board) — exact
  placement is a spec/design decision, not this intent's.

## Users
Same as intents 01-03: players of Battle for Biternia using the app
alongside the physical cards — this is the point where the app also
takes over the physical board and standees, not just the HP/gold
trackers.

## Affected Systems
Builds directly on intent 03's battle state: the Battle Map reads and
writes the same per-battle state already holding each team's heroes,
gold, and structures — it adds each hero's current space and the 3
gold-pile counts to that same persisted state, rather than introducing
a separate, disconnected data store. Intent 03's screen (Battle
Board/Controls) and overflow menu are otherwise unchanged; this intent
only adds the toggle to reach the new Map screen from it (and back).

This intent also introduces new board art
(`~/Documents/Playground/BattleForBiternia/Map Assets/Map.png`) that
needs to be brought into the app's assets, per the same convention
specs/02 already set for that folder.

## Constraints
- React + TypeScript frontend, consistent with intents 01-03 — no
  backend.
- Reuses existing hero token (`battleToken`) and structure/gold icon
  art — no new per-hero or per-structure art needed, only the board
  background itself.
- Intent 03 already ships a persisted `BattleState` (schema version 1)
  to real users. Adding hero position and gold-pile state is a schema
  change — an existing saved battle **upgrades in place** rather than
  resetting: the new fields get invented defaults (every hero starts in
  its team's holding area, each gold pile at 3), so a mid-battle reload
  right after this ships keeps the battle's real HP/level/gold progress
  instead of losing it.

## Out of Scope (deferred to later phases)
- **Any movement-rule enforcement**: adjacency/path legality, a Tower
  blocking movement or ranged attacks to the space behind it, one move
  per Hero per Movement Phase, deployment limits (max 2 heroes per
  space during initial deployment), and which space a hero leaves its
  holding area onto (a deploying/respawning hero should land on its own
  team's Tower or Bit per the rulebook, but the app doesn't check this
  either). The app only records where a player says a hero is — same
  manual-tracking-only philosophy as intent 03's HP/gold controls.
- **Linking gold piles to team gold.** Decrementing a gold pile never
  changes either team's gold total; that stays a fully separate manual
  action on the Battle Board/Controls, same as today.
- **The Catapult/Jungle variant** (4 extra board spaces, optional per
  the rulebook) — not modeled; no catapult art exists in the project's
  assets today.
- **Turn/phase structure or initiative enforcement** (whose turn it is
  to move, alternating moves) — the app doesn't referee the Movement
  Phase, only displays where things are.
- **3-4 player variant layouts** — deferred along with intents 01-03.
- Any new structure HP/level/gold interactivity beyond what intent 03
  already provides — the Map is a positional complement to the Board,
  not a replacement for any of its controls.

## Session Lifecycle
- Each hero's current space (or holding-area status, if undeployed or
  defeated) and the 3 gold-pile counts are new fields on the same
  persisted battle state intent 03 already reloads from — reloading the
  Map mid-battle must preserve them exactly like HP/level/gold already
  are.
- Starting a new draft resets this state the same way it already resets
  the rest of battle state (intent 03) — a fresh battle's heroes return
  to their team's holding area (not a default board space) and the gold
  piles reset to 3.
- Switching between the Map and Battle Board screens doesn't persist
  separately from the rest of the view state — same `view` mechanism
  intent 03 introduced (`"results" | "battle" | "win"`), extended with
  this intent's new screen.
