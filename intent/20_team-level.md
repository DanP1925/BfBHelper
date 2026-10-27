# Intent 20: Team Level

## Problem
Players want to know which team is ahead in levels, but the app only
shows each hero's level on its own card. Comparing the teams means adding
up eight levels in your head. The Battle Map shows no levels at all, so
from there you can't tell.

This is a v2.0 item: a small QoL summary that saves mental math at the
table.

## Scope
This phase covers only:
- **Team level = level-ups taken** (decided 2026-10-28). Each team's
  level is the number of level-ups its heroes have taken, from 0 to 12:
  4 heroes, each going from level 1 to 4. Both teams start a battle at
  0.
- **Read-only, worked out from hero levels** (decided 2026-10-28). It's
  added up from the heroes' levels, with nothing new stored and nothing
  to edit. Any change to a hero's level control updates it, including
  the level-down undo from intent 19.
- **Defeated heroes still count.** A hero keeps their level when
  defeated, so their level-ups stay in the total.
- **Shown on the Battle Board and the Battle Map** (decided 2026-10-28),
  one number per team. Where it sits and how it looks are settled in the
  spec/design.
- **Just the two numbers** (decided 2026-10-28). No marker for the
  leading team and no gap shown. With values from 0 to 12, the eye can
  compare them.

## Proposed Outcome
At the start of a battle, both teams show a team level of 0. In Cleanup,
Player 1 raises Ceralin from level 1 to 2 and another hero from 1 to 3:
Player 1's team level reads 3 on the Board. A player switches to the Map
mid-round and sees 3 against Player 2's 1, with no trip back to the
Board.

## Rules (from the rulebook)
- Heroes start at level 1 (p. 6), and level 4 is the maximum (p. 12).
- A team has 4 heroes, so it can take 0 to 12 level-ups.
- The rulebook has no "team level". This is an app summary for
  comparing teams, not a game mechanic.

## Users
Same as intents 01-19: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle Board.** Shows each team's level.
- **Battle Map.** Shows each team's level. Its team status panel shows
  no levels today.
- **Battle state.** Read only. No new stored state, and the saved battle
  shape doesn't change.

## Constraints
- React + TypeScript frontend, consistent with intents 01-19. No backend.
- No schema change, so existing saved battles keep working as they are.

## Out of Scope (deferred to later phases)
- **Each hero's level on the Map.** Only the team total is shown there.
- **The Win screen.** It already shows each hero's final level. This
  intent is for comparing teams during the battle.
- **Marking the leading team** or showing the gap between the two.
- **3-4 player variant**, deferred along with intents 01-19.

## Session Lifecycle
- Nothing new is stored. The team level is worked out from hero levels,
  so it's kept on reload and reset by a new draft along with them.
