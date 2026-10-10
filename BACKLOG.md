# Backlog

Untriaged ideas and feedback not yet scoped into an `intent/` doc. When an item
is picked up, link the intent/PR that covers it and check it off.

## From playtest 2026-10-10

First full physical game played alongside the app, at `79d851b` (intent 04 —
Battle Map merged). Paused mid-game; everything not listed below worked smoothly.

Teams: Caligar, Vladiator, Sterling, Ceralin vs Cynthia, Motley, Agatha Trunch,
Ken Obi.

- [ ] **Keep Map zoom/pan when switching tabs.** Switching Board → Map resets
  zoom to 100% and un-pans, because zoom/pan is local state in
  `BattleMapScreen` and the screen unmounts on a view toggle. Lift that state
  into `page.tsx`. Resetting on page reload is fine — no persistence needed.
  *Size: small polish PR, no new intent.*
- [ ] **Initiative indicator + passing it each round.** Neither the Battle
  Board nor the Battle Map shows who has initiative; it's only shown on the
  Draft Board (`draft.initiative`, decided by the pre-draft coin flip).
  Initiative flips every round — the player without it gets it — so both
  screens need a display plus a "next round" control to pass it. Possibly a
  round counter too. *Size: small intent (05).*
- [ ] **Status tokens: +1 Attack and Confuse.** Not tracked anywhere; needed
  even by the heroes played in this game. Other heroes need further
  hero-specific features as well. Check the rulebook for how each token is
  applied, how long it lasts, and when it's removed before scoping. *Size:
  larger intent.*
