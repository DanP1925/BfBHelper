# Intent 25: Cleanup Gold

## Problem
The first step of every Cleanup is that each team gains 2 gold. Intent 21
made the app track the phase, but the gold is still added by hand, after
the phase control has already moved to Cleanup. It's easy to forget, or
to add it twice when two players both remember.

Intent 21 parked this as part of "automation when a phase starts", since
undoing it on a step back has edge cases of its own. This intent takes
just the gold and settles those edge cases. The other phase steps stay
with that `BACKLOG.md` item.

This is a v2.0 item: automation that removes a common human error, without
taking the table out of control.

## Scope
This phase covers only:
- **Action to Cleanup pays 2 gold** (decided 2026-10-28). When the phase
  control steps forward from Action into Cleanup, each team's gold goes
  up by 2, on its own.
- **Only the forward step pays** (decided 2026-10-28). Stepping back from
  the next round's Orders into Cleanup adds nothing: that step undoes the
  round change, and the gold was already paid on the way in.
- **Stepping back from Cleanup takes it back** (decided 2026-10-28).
  Stepping back from Cleanup to Action takes 2 gold off each team, never
  going below 0. This keeps intent 21's rule that a step back undoes
  exactly what the forward step did. If a team already spent the gold,
  for example on a level-up, players undo the level-up first (intent 22
  refunds it) or fix the gold by hand.
- **No cue** (decided 2026-10-28). Only the team gold number changes:
  there's no "+2" note or other sign that the app added it.
- **Gold stays editable by hand**, as in intent 22, for corrections and
  everything the app doesn't automate.

## Proposed Outcome
In Round 3, Player 1 has 1 gold and Player 2 has 4. The players finish the
Action phase and advance: the app shows Cleanup, and the gold reads 3 and
6. Player 1 spends 2 to raise Ceralin to level 2, leaving 1. Then they
notice Player 2 still had an activation left in Action. They lower
Ceralin back to level 1, which refunds the 2, and step back to Action:
the gold is back at 1 and 4, as before Cleanup. Had they stepped back
without undoing the level-up, Player 1's gold would have stopped at 0,
since it can't drop the full 2.

## Rules (from the rulebook)
- Cleanup, step 1: each team gains 2 gold (p. 12).
- Cleanup, step 2: each player may pay gold to level up any number of
  heroes (p. 12).
- The game includes 25 gold tokens (p. 2).

The app adds the gold. Leveling up, discarding, drawing and the rest of
Cleanup stay at the table, as in intents 21 and 22.

## Users
Same as intents 01-24: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** The phase step from Action to Cleanup also adds 2 to
  each team's gold, and the step back from Cleanup to Action takes it
  off. No new stored state: the saved battle shape doesn't change.
- **Battle Board and Battle Map.** No new UI. Wherever team gold shows,
  it updates with the phase step.

## Constraints
- React + TypeScript frontend, consistent with intents 01-24. No backend.
- No schema change, so existing saved battles keep working as they are.

## Out of Scope (deferred to later phases)
- **Other phase-start automation.** It stays in the `BACKLOG.md` item
  "Automate steps when a phase starts".
- **A "+2 gold" cue** when Cleanup starts (decided against 2026-10-28).
- **Capping gold at the 25 tokens in the box.** Gold has no upper limit,
  as today.
- **3-4 player variant**, deferred along with intents 01-24.

## Session Lifecycle
- Nothing new is stored. The gold added or taken back is ordinary team
  gold, kept on reload and reset by a new draft like the rest of the
  battle state.
