# Intent 19: Level-Up HP

## Problem
When a hero levels up, their HP goes up by 1 too. In the app, level and
HP are separate controls (intent 03 kept them independent on purpose), so
after every level-up the player has to remember to add the HP by hand.
It's easy to forget during Cleanup, while gold, cards and several heroes
are all being handled at once. A forgotten point of HP changes fights
later.

This is a v2.0 item: a small piece of automation that removes a common
human error, without taking the table out of control.

## Scope
This phase covers only:
- **Level up, HP up** (decided 2026-10-28). Raising a hero's level by 1
  also raises their current HP by 1, on its own. A 10-base hero at 6 HP,
  level 1, ends at 7 HP, level 2.
- **Level down, HP down** (decided 2026-10-28). Lowering a level by 1
  takes 1 HP off, so undoing a misclicked level-up leaves HP where it
  started. HP never goes below 0 this way.
- **One step, one HP.** Each step of the level control moves one level
  and one HP. Taking a hero from level 1 to 3 adds 2 HP.
- **No bump for a defeated hero** (decided 2026-10-28). At 0 HP, a level
  change in either direction leaves HP at 0. The hero stays defeated
  until the players respawn them, which they do at full health anyway.
- **The flat 15 HP ceiling stays** (decided 2026-10-28). The app still
  has no idea of a hero's max HP (base + level). A bump that would pass
  15 stops at 15. In normal play it can't happen, since the largest real
  max is 14 (base 10, level 4).
- **HP stays editable by hand.** The HP control works as it does today,
  for damage, healing and corrections.

## Proposed Outcome
In Cleanup, a player pays 2 gold and raises Ceralin from level 1 to 2 on
the Battle Board. Her HP goes from 6 to 7 by itself. The player clicked
the wrong hero, so they lower the level back: the hero is at level 1 and
6 HP again. A defeated hero at 0 HP is leveled up for later: the level
goes up and HP stays at 0.

## Rules (from the rulebook)
- A hero's maximum HP is their Base HP plus their level, and a hero can
  never have more health than that (p. 4).
- At setup, each hero's max HP track starts at Base HP + 1 (level 1)
  (p. 6).
- Leveling up costs the hero's current level plus one, in gold, and a
  hero can level up several times in one Cleanup, paying for each level
  (p. 12).
- When leveling up, the hero's current health goes up by 1 along with
  the max (confirmed by the user 2026-10-28; the rulebook only states the
  max).
- A respawned hero comes back at full health (p. 12).

The app applies the +1 HP. Players still pay the gold and set a
respawned hero's HP themselves.

## Users
Same as intents 01-18: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Changing a hero's level now also changes that hero's
  HP. This is the first time one battle control changes a second value,
  which intent 03 ruled out. No new stored state: the saved battle shape
  doesn't change.
- **Battle Board.** The hero card's level control. Its HP control and
  look don't change.

## Constraints
- React + TypeScript frontend, consistent with intents 01-18. No backend.
- No schema change, so existing saved battles keep working as they are.
- No new art or layout. Whether the bump gets any visual feedback is
  settled in the spec/design.

## Out of Scope (deferred to later phases)
- **A real max-HP cap** (base + level) in place of the flat 15
  (decided against 2026-10-28).
- **Taking gold on level-up** automatically (cost = current level + 1).
  Parked as its own `BACKLOG.md` item (2026-10-28): it has its own edge
  cases, such as a team that can't afford it and refunds on level-down.
- **Respawning at full health** automatically.
- **3-4 player variant**, deferred along with intents 01-18.

## Session Lifecycle
- Nothing new is stored. The bumped HP is ordinary hero HP, kept on
  reload and cleared by a new draft like the rest of the battle state.
