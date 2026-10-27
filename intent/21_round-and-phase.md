# Intent 21: Round and Phase

## Problem
Every round of Battle for Biternia runs through four phases (Orders,
Movement, Action, Cleanup), and the app doesn't track which round or phase
the game is in. Players keep it in their heads. The step that's easiest to
forget is at the end of Cleanup, where initiative has to be passed by hand
(intent 05's badge).

Intent 05 left the round counter and phase tracking out of scope, since no
rule depends on the round number. For the v2.0 goal, playing without the
rulebook beside you, knowing where you are in the round is what matters.
This is that piece.

## Scope
This phase covers only:
- **Round and phase on both battle screens** (decided 2026-10-28). The
  Battle Board and the Battle Map both show the current round and phase,
  e.g. Round 3, Movement. This also covers the `BACKLOG.md` item "Show the
  current round number".
- **Phase names only, all four shown** (decided 2026-10-28 on the
  canvas). The four phases sit in a row with the current one
  highlighted, so the next phase is always in view. No summary of what
  happens in each phase: that's left to the "Show token and Artifact
  rules in the app" `BACKLOG.md` item.
- **One control steps forward through the phases** (decided 2026-10-28),
  usable on both screens. Orders, Movement, Action, Cleanup, then the next
  round's Orders. Moving from Cleanup to Orders adds 1 to the round and
  passes initiative to the other player, the last step of Cleanup. No
  confirm when starting a new round.
- **The same control steps back** (decided 2026-10-28), one phase at a
  time, undoing exactly what the forward step did. Stepping back from
  Orders to the previous round's Cleanup takes 1 off the round and passes
  initiative back. It can't go back past Round 1, Orders.
- **The initiative badge stays tappable** (decided 2026-10-28), as a
  manual correction. Tapping it passes initiative without changing the
  round or phase.
- **The battle starts at Round 1, Orders** (decided 2026-10-28), with
  initiative on the draft's coin-flip winner as today. Deployment is a
  setup step, not a tracked phase.
- **The Win screen shows the round** (decided 2026-10-28) the game ended
  in, e.g. Player 1 wins in Round 7.

## Proposed Outcome
Player 2 holds initiative in Round 3. The Board shows Round 3, with
Cleanup highlighted among the four phases. The players take their gold,
level up and draw, then advance the phase: the app shows Round 4, Orders, and
initiative passes to Player 1. One of them advanced too early, so they
step back: Round 3, Cleanup again, and initiative is back with Player 2.

## Rules (from the rulebook)
- Each round has four phases: Orders, Movement, Action, Cleanup (p. 7).
- Cleanup: each team gains 2 gold, players may level up, discard and draw
  to 8 cards, then the player with initiative passes the marker to their
  opponent. After that, the next round starts (p. 12).
- Heroes are deployed before Round 1, as part of setup (p. 7).
- No rule depends on the round number (intent 05).

The app tracks the round and phase and passes initiative when a new round
starts. Every other step of a phase stays at the table.

## Users
Same as intents 01-20: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Adds the current round and phase to the persisted
  battle state. Advancing from Cleanup also changes the initiative holder.
- **Battle Board and Battle Map.** Both show the round and phase and have
  the control. The initiative badge keeps working as it does.
- **Win screen.** Shows the round the game ended in.

## Constraints
- React + TypeScript frontend, consistent with intents 01-20. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on both battle screens.
- Adding the round and phase is a schema change. An existing saved battle
  **upgrades in place** to Round 1, Orders instead of resetting, the same
  approach intents 04 and 05 used. Players correct it with the control.

## Out of Scope (deferred to later phases)
- **Automation when a phase starts**, such as each team's +2 gold when
  Cleanup starts. Parked as its own `BACKLOG.md` item (2026-10-28): undoing
  it on a step back has edge cases of its own.
- **The round each hero was defeated.** Its own `BACKLOG.md` item, which
  builds on this round counter.
- **Turn-by-turn tracking inside a phase**: whose move or activation is
  next, which heroes have moved or passed (as in intent 05).
- **3-4 player variant**, deferred along with intents 01-20.

## Session Lifecycle
- The round and phase are part of the persisted battle state. Reloading
  mid-battle keeps them, like HP, gold and initiative.
- Starting a new draft resets them to Round 1, Orders along with the rest
  of the battle state.
- Switching between the Board and the Map doesn't change them. Both
  screens read the same state.
