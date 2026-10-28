# Intent 27: Defeat Animation

## Problem
A hero falling or a Tower being destroyed is one of the biggest moments in
a battle. In the app, it happens with no motion at all. When an HP value
reaches 0 on the Battle Board, the hero's portrait or the Tower's icon
turns gray at once. On a shared screen, players who weren't watching
the stepper can miss which hero fell or which Tower went down. A Bit
at 0 HP changes nothing on the Board, apart from "End Battle" appearing
in the menu.

Intent 10 animated the draft's key moments. This intent gives the battle's
key moment the same treatment, following the same rules: it is cosmetic,
it never blocks input, and it respects reduced motion.

## Scope
This phase covers only:
- **A defeat animation on the Battle Board** (decided 2026-10-28). When
  a hero's HP goes from above 0 to exactly 0, its portrait animates into
  the gray "defeated" look it already has.
- **A destruction animation for structures** (decided 2026-10-28). When
  a Tower's or a Bit's HP goes from above 0 to exactly 0, its icon on the
  Board animates into the gray "destroyed" look.
- **The Bit gets the destroyed look** (decided 2026-10-28). Today only
  Towers turn gray at 0 HP. The Bit now keeps the same gray look after its
  animation, like a Tower. "End Battle" still appears in the menu, as in
  intent 03.
- **Board only** (decided 2026-10-28). HP only changes on the Board, so
  that's where players are looking. The Map doesn't animate. It shows the
  result next time it's opened, as it does today: the hero in its respawn
  area, the structure gone.
- **On the card only** (decided 2026-10-28). The portrait or icon itself
  animates. There's no banner, callout or effect that covers the rest of
  the screen.
- **Every time HP reaches 0** (decided 2026-10-28). It plays whether the
  value was lowered with the stepper or typed in. That includes a mistaken
  0, and a hero defeated again after respawning. Lowering a hero's level
  never takes HP to 0 (intent 19), so it never triggers this.
- **No reverse animation** (decided 2026-10-28). Raising HP back above 0,
  whether for a respawn or a fix, clears the gray look at once, as it
  does today.
- **Animations never block input**, as in intent 10. The HP is saved the
  moment it changes, and the animation is cosmetic. Players can keep
  tapping right away. Fast taps may cut the animation short, and a reload
  mid-animation loses nothing.
- **Reduced motion is respected.** With the OS "reduce motion" setting
  on, nothing animates: the gray look just appears, as it does today.
- **Heroes and structures animate differently** (decided 2026-10-28).
  The exact motion and styling are settled in the spec/design.

## Proposed Outcome
In Round 4, Player 2 lowers Ceralin's HP from 1 to 0 on the Battle Board.
Her portrait animates into the gray defeated look, so everyone at the
table sees who fell. Later, Player 1's Middle Tower drops to 0 and its
icon animates to gray in the same way. When Player 2's Bit finally
reaches 0, it gets the same animation and stays gray, and "End Battle"
is waiting in the menu. Switching to the Map shows
Ceralin in her respawn area and the destroyed structures gone, with no
replay.

## Users
Same as intents 01-26: players of Battle for Biternia using the app
alongside the physical cards, sharing one screen.

## Affected Systems
- **Battle Board.** The hero cards and the structure slots animate when
  their HP reaches 0. The Bit's slot gains the gray destroyed look.
- **Battle state.** No change. The animation follows the HP value, which
  is saved as it is today.

## Constraints
- React + TypeScript frontend, consistent with intents 01-26. No backend.
- No change to persisted battle state, so existing saved battles keep
  working as they are.
- Must work on the 13.3" laptop (1280x800 CSS px).

## Out of Scope (deferred to later phases)
- **A Map version of the animation**, played on the Map or replayed the
  next time it's opened (decided against 2026-10-28).
- **A banner or screen-level callout** naming who fell (decided against
  2026-10-28).
- **A respawn animation** when a hero's HP goes back above 0.
- **A victory moment** for the Bit or on the Win Screen.
- **Sound.**
- **3-4 player variant**, deferred along with intents 01-26.

## Session Lifecycle
- The animation holds no state. A reload shows the gray look already in
  place, with no replay.
