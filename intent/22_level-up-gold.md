# Intent 22: Level-Up Gold

## Problem
Leveling up a hero costs gold: the hero's current level plus one. In the
app, level and team gold are separate controls, so after every level-up
the player has to work out the price and take it off the team's gold by
hand. The price changes with each level, so players look it up in the
rulebook, and it's easy to forget to pay or to pay the wrong amount.
Intent 19 already made the HP follow the level; the gold is the part left
by hand.

The level can also be typed in, which makes it easy to set a wrong level
and, with this intent, would let a typed jump skip paying for the levels
in between.

This is a v2.0 item: automation that removes a common human error and a
rulebook lookup, without taking the table out of control.

## Scope
This phase covers only:
- **Level up, gold down** (decided 2026-10-28). Raising a hero's level by
  1 takes its cost from that team's gold, on its own. The cost is the
  hero's current level plus one: 2 gold for level 1 to 2, 3 for 2 to 3,
  4 for 3 to 4.
- **Ken Obi pays one less** (decided 2026-10-28). His trait, "Become the
  Master", makes each of his level-ups cost one less gold: 1, 2 and 3.
  Everything else here uses his price: the cost shown, the can't-afford
  check and the refund on a level-down. He's the only hero with a
  discount.
- **Can't afford it, can't level up** (decided 2026-10-28). When the team
  has less gold than the next level costs, the level's + is unavailable,
  as it already is at level 4. Level and gold stay as they are. If the
  gold count itself is wrong, players fix it by hand first.
- **Level down, gold back** (decided 2026-10-28). Lowering a level by 1
  refunds what that level cost: level 3 to 2 gives back 3 gold. With
  intent 19's HP undo, a misclicked level-up is fully reversed.
- **Defeated heroes pay too** (decided 2026-10-28). A level change on a
  hero at 0 HP costs or refunds gold like any other; only the HP stays at
  0 (intent 19).
- **No phase limit** (decided 2026-10-28). The level control works in any
  phase, as it does today, so mid-round corrections stay possible. Intent
  21's Cleanup reminder covers when to level up.
- **The next cost is shown when affordable** (decided 2026-10-28, on the
  canvas). Each hero shows what their next level-up costs, so nobody
  needs the rulebook. When the team can't afford it, or the hero is at
  level 4, no cost is shown and the + is unavailable. Where it sits and how it looks are settled in the
  spec/design.
- **The level is read-only** (decided 2026-10-28; was its own
  `BACKLOG.md` item). The level can no longer be typed in. It changes only
  through its steppers, one level and one payment at a time. HP, gold and
  token counts stay typeable.
- **Gold stays editable by hand.** The team gold control works as it does
  today, for income, corrections and anything the app doesn't automate.

## Proposed Outcome
In Cleanup, Player 1 has 5 gold. Ceralin, at level 1, shows a next cost
of 2. The player raises her to level 2: gold drops to 3 and her HP goes
up by 1. Her next cost now reads 3, and the player raises her again: gold
is 0 and she's at level 3. Her + is now unavailable and shows no cost,
since the team has no gold left. The player meant to level
a different hero, so they lower Ceralin back to 2: the team gets 3 gold
back. On Player 2's side, Ken Obi at level 1 shows a next cost of 1,
and the team's last gold coin is enough to raise him to level 2.

## Rules (from the rulebook)
- The cost to level up a hero is their current level plus one; e.g. level
  2 to 3 costs 3 gold (p. 12).
- Pay the gold, then raise the level by one, which also raises the hero's
  HP by one (p. 12).
- A hero can level up several times in one turn, if the team has enough
  gold, paying for each level individually (p. 12).
- In Cleanup, each team gains 2 gold, then players may pay gold to level
  up any number of heroes (p. 12).
- Ken Obi's trait, "Become the Master": it costs one less gold for him
  to level up; at level 4 he gains +1 Attack (his hero card).
- Level 4 is the maximum; a hero reaching a new level picks a new power
  card, and the Ultimate only at level 4 (p. 12).

The app takes the gold. Picking the new power card stays at the table.

## Users
Same as intents 01-21: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Changing a hero's level now also changes that team's
  gold, on top of the HP from intent 19. No new stored state: the saved
  battle shape doesn't change.
- **Battle Board.** The hero card's level control: read-only number, +
  unavailable and no cost shown when unaffordable, else the next cost
  shown. Team gold
  updates as levels change. The team level from intent 20 follows the
  hero levels as before.

## Constraints
- React + TypeScript frontend, consistent with intents 01-21. No backend.
- No schema change, so existing saved battles keep working as they are.
- Must fit the 13.3" laptop (1280x800 CSS px) on the Battle Board.

## Out of Scope (deferred to later phases)
- **Limiting level-ups to Cleanup** once intent 21 tracks the phase
  (decided against 2026-10-28).
- **Making HP, gold or token counts read-only.** Only the level changes.
- **Each team's +2 gold when Cleanup starts.** Already its own
  `BACKLOG.md` item ("Automate steps when a phase starts").
- **Picking the new power card** on a level-up.
- **Ken Obi's +1 Attack at level 4** (decided 2026-10-28). It's a combat
  bonus, not gold, and stays a +1 Attack token placed by hand. Parked as
  its own `BACKLOG.md` item.
- **3-4 player variant**, deferred along with intents 01-21.

## Session Lifecycle
- Nothing new is stored. The gold taken or refunded is ordinary team
  gold, kept on reload and reset by a new draft like the rest of the
  battle state.
