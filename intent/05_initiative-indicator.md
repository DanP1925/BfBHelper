# Intent: BfbHelper (v5 — Initiative Indicator)

## Problem
Initiative decides who goes first in almost every part of a round of
Battle for Biternia: deployment, each Movement Phase, each Action Phase,
channeled effects, and Tower/Bit attacks. It also changes hands every
round. Today the app shows initiative only on the Draft Board, where the
pre-draft coin flip decides it (`draft.initiative`). Once the battle
starts, neither the Battle Board nor the Battle Map says who has it, so
players fall back on the physical initiative marker or their memory.
That's the last piece of round-level state still kept off the app, and
in the first full playtest (2026-10-10, see `BACKLOG.md`) the players
noticed it was missing.

Per the project's product vision, the app tracks everything except the
cards. This intent brings the initiative marker into the app.

(v1 = Hero Draft Picker, intent 01. v2 = Battle Board, intent 02. v3 =
Battle Controls, intent 03. v4 = Battle Map, intent 04.)

## Scope for v5
This phase covers only:
- **An initiative badge on both battle screens.** One central badge,
  not a marker on each team's side, shows which player holds
  initiative. It reads "Player 1" or "Player 2" in that team's color,
  the same names the Results screen and the Map's panels already use.
  It's at the top right of the header both screens share, next to the
  overflow menu, so switching between Board and Map doesn't move it.
- **Tap the badge to pass initiative** to the other player. There's no
  separate button. It's the app's version of the rulebook's last
  Cleanup step ("The player with initiative passes the initiative
  marker to their opponent"). Since that happens every round, it's on
  the always-visible badge, not an overflow-menu item. Tapping again
  passes initiative back, so a wrong tap is fixed with another tap. No
  confirm dialog or separate undo is needed. Because there's no button
  to suggest it, the badge itself has to look tappable (e.g. a swap
  icon or button styling). The exact look is a spec/design decision.
- **Initiative carries over from the draft.** Per the rulebook, the
  player who won the pre-draft coin flip keeps the initiative marker for
  deployment and Round 1. The battle starts with initiative on
  `draft.initiative`, not a new coin flip.

## Proposed Outcome
During a battle, both the Board and the Map show which player holds
initiative. At the end of each round's Cleanup Phase, a player taps the
badge and initiative moves to the other player. Players can look at the
app instead of the physical initiative marker to see who moves,
activates, or attacks with Towers first.

## Rules (from the rulebook)
From `battle-for-biternia_rules_web.pdf`:
- **Draft Your Heroes, step 1:** "Randomly select who will go first, and
  give that player the initiative marker." This is the coin flip the app
  already does before the draft.
- **Deploy Your Heroes:** the player with initiative deploys first.
- **The Game Round:** four phases (Orders, Movement, Action, Cleanup).
  Cleanup ends with players passing the initiative marker and moving on
  to the next round.
- **Who goes first with initiative:** first to move or pass in the
  Movement Phase, first to activate in the Action Phase, first to
  resolve channeled effects, and first to pick a Tower or Bit to attack.
- **Cleanup, last step:** "The player with initiative passes the
  initiative marker to their opponent."

Initiative always alternates. No rule lets a player keep it or take it
out of turn, so a tap that always hands it to the other player covers
every case. No rule depends on
the round number either (respawn timing comes from the deck cycling, not
from counting rounds), so the app doesn't need to count rounds.

## Users
Same as intents 01-04: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Adds the current initiative holder to the persisted
  `BattleState`, the same state that already holds HP, level, gold,
  structures, hero positions and gold piles. No separate store.
- **Battle Board and Battle Map screens.** Both get the badge, in the
  header area they already share, at the top right next to the
  `OverflowMenu`.
- **Draft state.** Only read: the battle's starting initiative comes from
  `draft.initiative`. The Draft Board's own initiative display doesn't
  change.

## Constraints
- React + TypeScript frontend, consistent with intents 01-04. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on both battle screens
  without squeezing the Map's board area or the Board's team panels.
- `BattleState` is persisted at schema version 2 (intent 04) and is in
  use. Adding the initiative holder is a schema change, and an existing
  saved battle **upgrades in place** instead of resetting, the same
  approach intent 04 used. The new field defaults to `draft.initiative`,
  which is still persisted alongside the battle. If that's wrong for a
  battle already a few rounds in, players fix it by tapping the badge.

## Out of Scope (deferred to later phases)
- **A round counter.** No rule depends on the round number, so it's
  extra information rather than something needed to play. Possible
  later addition (e.g. rounds played on the Win Screen).
- **Phase tracking** (Orders / Movement / Action / Cleanup). The app
  doesn't track where in the round the players are.
- **Turn-by-turn tracking inside a phase**: whose move or activation is
  next, which heroes have already moved or passed. Initiative only tells
  players who goes *first*; alternating from there stays at the table.
- **Automatic Cleanup effects**: gold income, level-ups, card draws,
  token expiry. Passing initiative changes only the initiative holder,
  the same manual-only approach as intents 03-04.
- **Automatic initiative passing** triggered by anything else in the app.
- **3-4 player variant**, deferred along with intents 01-04.

## Session Lifecycle
- The initiative holder is part of the persisted battle state. Reloading
  mid-battle keeps it, just like HP, gold and positions.
- Starting a new draft resets it along with the rest of the battle
  state. The next battle starts with initiative on that draft's
  coin-flip winner.
- Switching between Board and Map doesn't change it. Both screens read
  the same state.
