# Intent 24: Respawn Window

## Problem
A defeated hero isn't gone for good: its Hero card goes into the discard
pile, cycles through the action deck, and the hero respawns when that card
is drawn. There's no timer, so players can't tell when a fallen hero will
be back without counting cards in their head. The app shows a defeated
hero as dimmed on the Board and in the respawn area on the Map, but
nothing about when it returns.

The deck is never shuffled and its size follows the heroes' levels, so the
app already knows enough to estimate it. Intent 21's round counter gives
the estimate a round to count from. For the v2.0 goal, playing without the
rulebook beside you, this replaces card counting with a glance.

## Scope
This phase covers only:
- **A respawn window for each defeated hero** (decided 2026-10-28). It
  estimates the rounds in which the hero's card will be drawn, from
  fastest to slowest. This covers the `BACKLOG.md` item "Show the round
  each hero was defeated", which asked for the round it fell; the window
  is what players wanted that round for.
- **The estimate** (decided 2026-10-28):
  - Cards ahead of the hero's card = 4 + team level − living heroes. The
    team level is intent 20's, and still counts the fallen hero's levels.
  - Each Cleanup draws between 3 cards (slowest) and 8 cards (fastest).
    The slowest draw is one per living hero.
  - The hero's card is the one after the cards ahead. It's drawn after
    (cards ahead + 1) ÷ 8 Cleanups at the fastest, and (cards ahead + 1) ÷
    living heroes at the slowest, both rounded up. The defeat round's own
    Cleanup counts as the first.
  - With no hero left standing, the slowest draw would be 0 cards, so only
    the fastest round is shown, e.g. Round 4+.
- **Shown as round numbers** (decided 2026-10-28), e.g. Round 4–6: the
  rounds whose Cleanup draws the card, not the round the hero fights
  again. If both ends are the same round, one round is shown. The window
  is shown alone, without the round the hero fell.
- **On both battle screens** (decided 2026-10-28), the Battle Board and
  the Battle Map. Where it sits and how it looks are settled in the
  spec/design.
- **Set automatically, then fixed** (decided 2026-10-28). The window is
  computed when a hero's HP is set to 0, from that moment's round, team
  level and living heroes. Later level-ups, defeats, respawns or round
  steps don't change it.
- **Cleared on respawn** (decided 2026-10-28). The window goes away when
  the hero's HP goes above 0, whether it respawned or a mistaken 0 was
  fixed. A later defeat sets a new window.
- **No overdue warning** (decided 2026-10-28). If the current round goes
  past the window and the hero still hasn't been drawn, the window stays
  as it is. The table knows where its cards are.

## Proposed Outcome
Player 1's team is at levels 1, 2, 2 and 3, a team level of 8. In Round 3,
Ceralin falls to 0 HP. Three heroes are still standing, so 4 + 8 − 3 = 9
cards are ahead of her card, and hers is the 10th. At 8 cards a Cleanup
it's drawn in the second, Round 4. At 3 a Cleanup it's drawn in the
fourth, Round 6. Her card on the Board and her token in the Map's respawn
area show Round 4–6. In Round 5's Cleanup, Player 1 draws her card, raises
her HP and drags her onto the board: the window disappears.

## Rules (from the rulebook)
- Each player starts with a 12-card basic action deck, draws 4 of them and
  adds 1 starting power card per hero, for a hand of 8 (p. 6).
- Each level-up adds one of the hero's power cards to the hand (p. 12).
- In Cleanup, each player may discard any number of cards, then draws up
  to a hand size of 8. When the deck is empty, the discard pile is turned
  over, never shuffled (p. 12).
- Defeated heroes aren't assigned action cards (p. 7).
- A defeated hero's card goes into the discard pile and cycles through the
  deck. When it would be drawn, the hero returns at full health in a space
  with a friendly Tower or the Elemental Bit, ready for the next round
  (p. 12).

So the cards cycling through the deck are 12 + team level − 8 in hand.
The ones on living heroes are discarded after the fallen hero's card,
which leaves 4 + team level − living heroes ahead of it. A new power card
from a later level-up goes into the hand, behind the hero's card, so the
count doesn't change after the defeat.

The app estimates when. Drawing the card, raising the HP and placing the
hero stay at the table.

## Users
Same as intents 01-23: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Each defeated hero keeps its respawn window, set when
  its HP reaches 0 and cleared when it goes back above 0.
- **Battle Board.** A defeated hero's card shows its window.
- **Battle Map.** A defeated hero shows its window there too.

## Constraints
- React + TypeScript frontend, consistent with intents 01-23. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on both battle screens.
- Adding the window is a schema change. An existing saved battle
  **upgrades in place**: a hero already at 0 HP shows no window until its
  next defeat, the same approach intents 04, 05 and 21 used.

## Out of Scope (deferred to later phases)
- **Respawning on its own.** Players still raise the HP and drag the hero
  onto the board when its card is drawn, as today.
- **Tracking the actual deck, hand or discards.** The window is an
  estimate, not a card count.
- **Updating the window** as other heroes fall or respawn (decided against
  2026-10-28): a window that moves is harder to plan around.
- **3-4 player variant** (6-card decks, 4-card hands), deferred along with
  intents 01-23.

## Session Lifecycle
- The windows are part of the persisted battle state. Reloading
  mid-battle keeps them, like HP and the round.
- Starting a new draft clears them along with the rest of the battle
  state.
- Switching between the Board and the Map doesn't change them. Both
  screens read the same state.
