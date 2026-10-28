# Intent 26: Level 4 Animation

## Problem
Level 4 is a hero's maximum level and the point where they pick their
Ultimate. It's the biggest step in a hero's growth, but in the app it looks
like any other level-up: the last level pip fills in and the next-cost
label disappears. On a shared screen, players who didn't tap the + can
miss that a hero just maxed out.

This is a v2.0 item: polish that makes a key moment of the game visible at
the table.

## Scope
This phase covers only:
- **It plays on every 3 to 4** (decided 2026-10-28). Each time a hero's
  level goes from 3 to 4 through the + on their Battle Board card, that
  card plays a short burst. This includes raising them again after undoing
  a misclick (4 to 3 to 4): the level-up really happened again, and nothing
  new needs to be stored to tell the two apart.
- **Defeated heroes too** (decided 2026-10-28). A hero at 0 HP who reaches
  level 4 gets the burst like any other, as they pay for it like any other
  (intent 22).
- **Never on the way down or on reload.** Lowering a level never animates,
  and reloading with a hero already at level 4 shows the card as it is,
  with no burst.
- **A burst only** (decided 2026-10-28). Once it ends, the card looks as it
  does today: full level pips, no next cost. There's no lasting "maxed"
  look.
- **No text cue** (decided 2026-10-28). The burst doesn't say "Pick your
  Ultimate" or anything else. Picking the Ultimate stays at the table.
- **The Battle Board only.** Levels change on the Board. The Battle Map
  doesn't show hero levels, so nothing plays there.
- **Animations never block input** (decided 2026-10-28, as in intent 10).
  The level and gold are saved the instant the + is tapped, and players can
  keep tapping during the burst. There's no tap-to-skip, since it's short
  and blocks nothing.
- **Reduced motion is respected** (decided 2026-10-28, as in intent 10).
  With the OS "reduce motion" setting on, nothing plays: the card changes
  as it does today.
- The exact motion (what moves, speed, easing, styling) is settled in the
  spec/design.

## Proposed Outcome
In Cleanup, Player 1 pays 4 gold to raise Ceralin from level 3 to 4. Her
card plays a short burst that everyone at the table notices, and then
looks as it always has at level 4: full pips, no cost. The player meant to
level Ken Obi instead, so they lower Ceralin back to 3, which plays
nothing. Later they raise her to 4 again, and the burst plays again. On
another screen with "reduce motion" on, the same level-up just fills the
last pip.

## Rules (from the rulebook)
- Level 4 is the maximum; a hero reaching a new level picks a new power
  card, and the Ultimate only at level 4 (p. 12).

The app marks the moment. Picking the Ultimate stays at the table.

## Users
Same as intents 01-25: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle Board.** The hero card plays the burst when its level goes from
  3 to 4.
- **No battle state change.** The animation holds no state: the saved
  battle shape doesn't change.

## Constraints
- React + TypeScript frontend, consistent with intents 01-25. No backend.
- No schema change, so existing saved battles keep working as they are.

## Out of Scope (deferred to later phases)
- **Hero-specific level-4 effects**, such as Ken Obi's +1 Attack. Felix's
  Arena already reacts to level 4 (intent 14).
- **A lasting "maxed" look** on level-4 cards (decided against
  2026-10-28).
- **A "Pick your Ultimate" cue** (decided against 2026-10-28).
- **Animations for other level-ups** (1 to 2, 2 to 3).
- **3-4 player variant**, deferred along with intents 01-25.

## Session Lifecycle
- Nothing new is stored. A level-up is saved the moment the + is tapped,
  so a reload mid-burst shows the hero at level 4 with no animation.
