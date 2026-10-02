# Intent: BfbHelper (v3 — Battle Controls)

## Problem
Intent 02's Battle Board (see
[02_battle-board.md](02_battle-board.md)) shows both teams' starting
battle state, but it's a static snapshot — level, HP, and gold never
change, so once the physical battle actually starts play immediately
drifts away from what the screen shows. Players are back to tracking
everything on paper/dial trackers themselves.

Per the project's product vision, the app's role is to let players run
the physical game with just the cards, while the app tracks everything
else. This intent takes the next step: let players keep the Battle
Board's numbers in sync with what's happening in the physical game, by
adjusting them directly.

## Scope for v3
This phase covers only:
- **Manual controls** on the existing Battle Board for every value
  that changes during a battle:
  - Each team's **gold** total.
  - Each **hero's current HP**.
  - Each **hero's level**.
  - Each **structure's HP** (3 Towers + Bit, per team).
  - Each control supports both a ±1 tap and direct numeric entry
    (typing the exact new number) — a tap alone would be tedious for
    double-digit structure HP (Tower 11, Bit 16) taking a big hit at
    once.
- **Player-driven only — no automation**, with one exception (the win
  condition, below). The app does not compute or apply any other rule
  on the player's behalf. Concretely, still out of scope for this
  intent:
  - No automatic gold deduction when a hero levels up.
  - No automatic HP recalculation when a hero's level changes (HP and
    level are adjusted independently, each by its own control).
  - No automatic Bit damage when a Tower is destroyed.
  - No gating logic (e.g. preventing Bit damage until a Tower is
    destroyed) — the app never blocks a value from changing.
  - No standalone "reset this battle" action — the only reset path is
    starting a new draft; a misclick is corrected the same way any
    other value is corrected, by hand.
  - Players apply all of the above themselves, the same way they would
    with physical trackers — the app just replaces the trackers.
- **Visual states and the win condition** — see their own sections
  below.

(v1 = Hero Draft Picker from intent 01. v2 = Battle Board from intent
02.)

## Proposed Outcome
While a battle is in progress on the Battle Board, each team's gold
total, each hero's HP and level, and each structure's HP has a small
increase/decrease control next to it. Players tap it to reflect what
just happened in the physical game (damage taken, a hero leveling up,
gold spent or earned, a Tower falling) — one value at a time, with no
side effects on any other value. The Board stops being a one-time
snapshot and becomes the running record of the battle.

## Visual States
Two values get a styling change at their floor, purely reactive to the
current number — no separate flag, nothing the app tracks beyond the
value itself:
- **A hero at 0 HP** shows "defeated" styling. The instant that hero's
  HP is raised above 0 again, the styling clears automatically — heroes
  can respawn mid-battle, so this is just a live reflection of the
  number, not a one-way state.
- **A Tower at 0 HP** shows "destroyed" styling, the same reactive way.
  Towers don't respawn in the physical game, but the app doesn't
  enforce that — the HP control stays fully editable (e.g. to correct
  a misclick). Locking it would be the one place this intent enforces
  a rule instead of just tracking a number, which cuts against the
  rest of this intent's design.
- The Bit has no equivalent styling of its own — reaching 0 HP is the
  win trigger, below, not a cosmetic state.

## Win Condition
This is the one place this intent detects something rather than
purely tracking numbers:
- When either team's Bit reaches 0 HP, an **"End Battle"** action
  becomes available. Reaching 0 does *not* immediately end anything —
  it only exposes the action. This avoids a misclick (overshooting a
  -1 tap, or a stray number typed into the Bit's direct-entry field)
  instantly ending the match with no way back.
- Confirming "End Battle" navigates to a new **Win Screen**:
  - Both teams' heroes are shown, in a two-panel layout mirroring the
    Battle Board/Results screen — not just the winner's.
  - The winning team's panel is visually emphasized/focused; the
    losing team's is secondary. (Exact visual treatment is a spec/
    design decision, not this intent's.)
  - Each hero shows its final level and HP (the same info already
    shown on the Battle Board), in the team's existing slot order —
    sorting by level is a later idea, not in this intent.
  - Structures (Towers/Bit) are not shown on the Win Screen.
  - The only action available from the Win Screen is starting a new
    draft — there's no path back to the Battle Board once confirmed.

## Users
Same as intents 01-02: players of Battle for Biternia using the app
alongside the physical board/components — this is the point in the
flow where the app starts actively following the battle rather than
just displaying its starting state.

## Affected Systems
Builds directly on intent 02's Battle Board: every value this intent
makes editable is a value intent 02 already renders (hero HP/level,
structure HP, team gold) — the Battle Board itself gains controls
rather than being replaced.

This intent also adds one new screen beyond the Battle Board: the Win
Screen reached via the win condition above, reusing the existing
`HeroCard` "battle" variant and two-panel layout rather than
introducing new visual components.

This intent also introduces the first **mutable, persisted battle
state** — until now, the Battle Board was fully re-derived on every
render from static constants and the draft. Once a player can nudge a
value, it has to survive a reload like draft state already does, or
every accidental refresh mid-battle silently resets the game. The
spec for this intent needs to define that persistence.

## Constraints
- React + TypeScript frontend, consistent with intents 01-02 — no
  backend.
- Builds on the existing static constants from intent 02
  (`frontend/src/lib/battle/constants.ts`): `TOWER_STARTING_HP` (11),
  `BIT_STARTING_HP` (16), `HERO_STARTING_LEVEL` (1), `HERO_MAX_LEVEL`
  (4), `TEAM_STARTING_GOLD` (0) — these remain each value's starting
  point; this intent adds the ability to move away from them.

## Value Bounds
Each control needs a floor/ceiling so it can't be pushed into a
nonsensical state:
- **Gold**: floor 0, no ceiling (intent 02's "10 is a practical
  ceiling" was a soft display guide, not a hard limit).
- **Hero level**: floor 1, ceiling `HERO_MAX_LEVEL` (4) — matches the
  rulebook's level range.
- **Hero HP**: floor 0, ceiling **15** — a flat cap, the same for
  every hero regardless of their individual base HP or current level
  (confirmed by the project owner). Level and HP stay independently
  adjustable; this ceiling doesn't recalculate off either.
- **Structure HP**: floor 0, ceiling = that structure's own starting HP
  (11 for a Tower, 16 for the Bit) — kept per-structure rather than a
  shared flat cap, since Tower and Bit are different structures with
  different roles (unlike heroes, who share one flat HP ceiling
  because they already sit in a tight, similar HP band).

## Out of Scope (deferred to later phases)
- All automation listed under Scope above (gold cost deduction,
  HP-from-level computation, Tower→Bit chip damage, gating logic) —
  this intent is manual tracking only, with the single exception of
  the win condition above; a future intent may layer more rules on top
  of these same values.
- Undo/redo or a change history for any value.
- Per-action logging or a battle summary/recap.
- 3-4 player variant layouts — deferred along with intent 01/02.

## Session Lifecycle
- Reloading the Battle Board mid-battle must preserve every value a
  player has adjusted (gold, hero HP/level, structure HP) — this is
  new: intent 02 had nothing to lose on reload since nothing could
  change yet.
- Starting a new draft (leaving the Battle Board entirely) resets
  battle state back to intent 02's starting values, the same way
  `clearDraft()` already resets the `view` flag — exact mechanics for
  the spec.
