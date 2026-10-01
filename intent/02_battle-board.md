# Intent: BfbHelper (v2 — Battle Board, 2-player)

## Problem
Once heroes are drafted (v1's Hero Draft Picker, see
[01_hero-draft-picker.md](01_hero-draft-picker.md)), the physical game
moves into the actual battle. Tracking that battle normally relies on
several physical components beyond the hero/action cards — notably
Tower HP trackers (3 per team) and Bit HP trackers (1 per team).

Per the project's product vision, the app's role is to let players run
the physical game with just the cards, while the app tracks everything
else. This intent scopes the first step toward that for the battle
phase: a screen that represents both teams' starting battle state —
drafted heroes plus the Towers and Bit each team defends — digitally.

## Scope for v2
This phase covers only:
- **One feature**: the **Battle Board** — a screen showing both teams
  side by side, each with their 4 drafted heroes (with level and base
  HP), 3 Towers (Top, Middle, Bottom), 1 Bit, and the team's gold
  total.
- **Static, read-only display only.** No interactivity — players
  cannot yet record damage, destroy a Tower, level up a hero, spend/
  earn gold, or detect a win. Interactivity is explicitly deferred to
  the next intent (03).

(v1 = Hero Draft Picker from intent 01.)

## Proposed Outcome
Once a draft completes (the Results screen from intent 01), players
can proceed to a Battle Board screen that lays out both teams' battle
starting state side by side: team/side, 4 drafted heroes (each at
level 1, with their base HP shown), 3 Towers at full HP, 1 Bit at full
HP, and the team's gold total (starting at 0). This mirrors the
physical game's setup state and gives players a shared visual
reference as the physical battle begins — without yet tracking changes
during play.

## Structures (Towers & Bit)
From the rulebook (`battle-for-biternia_rules_web.pdf`):
- Each team defends 3 Towers — **Top**, **Middle**, **Bottom** — and
  1 **Bit**. Towers and Bit are collectively called "Structures."
- Towers protect and isolate the Bit: a team's Bit cannot be targeted
  or damaged until at least one of that team's Towers is destroyed.
- **Starting HP**: Towers = **11** each, Bit = **16**. (Confirmed by
  the project owner — the rulebook text doesn't print these numbers
  directly; they live on the physical HP tracker dial components.)
- Destroying a Tower deals 3 damage to that team's Bit; a defeated
  Hero also deals 3 damage to their own team's Bit (noted here for
  context — this damage/HP-tracking logic is not implemented until
  intent 03).

## Hero Level, Base HP & Team Gold
From the rulebook:
- Each Hero has a level, 1 (starting) through 4 (max). Leveling up
  costs gold and is a Cleanup Phase action during play — not
  implemented in this intent, so every hero displays at **level 1**.
- Each Hero also has a fixed **Base HP**, printed on their Hero card
  (the heart icon), which the Battle Board displays alongside level.
  (A Hero's actual max HP in play is Base HP + level, but that
  computed value isn't needed until HP tracking exists in intent 03 —
  this intent just shows the static Base HP per the card.)
- Gold is tracked per team (shared by both players on a team), used to
  level up Heroes. Each team starts a battle at **0 gold**.
- Gold has no hard rulebook maximum, but **10** is a practical ceiling
  — teams rarely exceed it. This is a soft guide for sizing the gold
  display (e.g. a counter/meter), not a validation limit.

### Hero Roster — Base HP
Read directly off each Hero's card image
(`frontend/public/heroes/*.png`), to extend the name + class/type
roster data already entered for intent 01:

| Hero | Base HP | Hero | Base HP |
|---|---|---|---|
| Agatha Trunch | 10 | Ken Obi | 9 |
| Baldwin | 9 | Kerrick | 8 |
| Boreas | 10 | Kunoichi | 9 |
| Caligar | 10 | Longshanks | 10 |
| Ceralin | 10 | Motley | 10 |
| Cynthia | 8 | Runika | 8 |
| Cyrus | 9 | Sedusa | 9 |
| Dazeem | 8 | Sterling | 7 |
| Dolgolae | 10 | Vladiator | 10 |
| Felix | 9 | | |

## Layout
Two mirrored side panels, consistent with intent 01's Results screen
team-panel style:
- Each panel shows **one team's own** 4 heroes (name, level, and base
  HP), 3 Towers (Top/Middle/Bottom), Bit, and the team's gold total —
  the structures and resources that team defends/owns, not a shared
  map view.
- Towers and Bit display at full starting HP (11 and 16 respectively);
  heroes display at level 1 with their base HP; gold displays at 0 —
  since no damage/leveling/gold tracking exists yet in this intent.

## Users
Same as intent 01: players of Battle for Biternia using the app
alongside the physical board/components — this screen gives them a
shared visual reference once the draft is done and the actual battle
begins.

## Affected Systems
Builds directly on intent 01's Hero Draft Picker: the Battle Board
consumes the finished draft's two teams of 4 heroes as input.
Navigating from the draft's Results screen into this new Battle Board
screen is in scope, so the flow from draft → battle is connected.

## Constraints
- React + TypeScript frontend, consistent with intent 01 — no
  backend.
- Tower (11 HP) and Bit (16 HP) starting values, hero starting level
  (1), per-hero base HP (see roster table above), and team starting
  gold (0) are all static data — no database needed.
- Draft team data is read from the same client-side draft state
  (`localStorage`) already produced by intent 01 — no new data model
  for hero selection.

## Out of Scope (deferred to later phases)
- **Interactivity**: recording damage to Towers/Bit, marking a Tower
  destroyed, leveling up a hero, earning/spending gold, detecting the
  win condition (Bit destroyed) — becomes intent 03, built on top of
  this intent's static board.
- Hero current/max HP **in-battle tracking** (damage taken, healing,
  the Base HP + level computation) — as opposed to the static Base HP
  this intent displays per the Hero card, which never changes.
- 3-4 player variant layouts (more Towers/Bits, team-of-two
  structure) — deferred along with the 3-4 player variant in intent
  01.
- Anything from the physical game's turn phases (Orders/Movement/
  Action/Cleanup) beyond this static display.

## Session Lifecycle
No new persisted state is introduced by this intent — the Battle
Board is derived entirely from the already-completed draft state from
intent 01.
- Reachable once a draft is complete, via an explicit action from the
  Results screen (e.g. "Start Battle").
- Reloading the Battle Board screen simply re-renders from the same
  persisted draft state — there's nothing new to lose.
- No separate "battle in progress" state is tracked yet; that begins
  in intent 03 once HP tracking/interactivity is added.
