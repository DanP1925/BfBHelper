# Intent 23: Hero Roles

## Problem
During the draft, the pool shows all 19 heroes in alphabetical order. To
plan a team, players have to remember what each hero does, or look it up,
and scan the whole pool to find, say, the healers still left. Games like
Dota or Heroes of the Storm give each hero a role, so players can
narrow the pool to the kind of hero they need.

The rulebook prints a Type for each hero (e.g. "Mobile Tank"), but all 19
are different, so they can't group the pool. The project owner uses
their own three roles instead.

This is a v2.0 item: it's about making the draft easier to use, without
changing any rules.

## Scope
This phase covers only:
- **Three roles, one per hero** (decided 2026-10-28). Each hero has
  exactly one role, from the project owner's own categorization:
  - **Damage (8):** Agatha Trunch, Boreas, Cynthia, Dolgolae, Felix,
    Kunoichi, Sterling, Vladiator.
  - **Utility (8):** Ceralin, Dazeem, Ken Obi, Kerrick, Longshanks,
    Motley, Runika, Sedusa.
  - **Support (3):** Baldwin, Caligar, Cyrus.
- **A role filter above the pool** (decided 2026-10-28). Four options:
  All, Damage, Utility and Support. Picking one shows only that role's
  remaining heroes. The pool stays alphabetical, as it is today. Where
  the filter sits and how it looks are settled in the spec/design.
- **Each option shows how many are left** (decided 2026-10-28). The
  count is the number of unpicked heroes in that role, so players see
  at a glance what's left to draft. An option with 0 left can't be
  selected.
- **Back to All when the turn passes** (decided 2026-10-28). The filter
  starts on All, and goes back to All whenever the turn passes to the
  other player. On a shared device, the next player then never starts
  their pick with a pool their opponent filtered.
- **The filter is the only place roles appear** (decided 2026-10-28).
  Pool cards don't carry a role label, and the rulebook's printed Type
  isn't shown.

## Proposed Outcome
Player 1 has initiative and the pool shows All, with counts reading
Damage 8, Utility 8 and Support 3. They pick Caligar. It's Player 2's
turn, and they select Support: only Baldwin and Cyrus show. They pick
Cyrus, then select Damage and pick Sterling. The turn passes back to
Player 1, so the filter is on All again and Support now reads 1. Later,
after Baldwin is drafted, Support reads 0 and can't be selected.

## Rules (from the rulebook)
- The draft is a fixed pick order with no limit on what kind of hero a
  team takes (p. 6).
- Each hero's profile prints a two-word Type, e.g. Agatha Trunch "Mobile
  Tank" and Caligar "Healer Support" (pp. 15–19). The rulebook doesn't
  define the Type words or tie them to any rule.

The roles here are the app's own, not the rulebook's, and they don't
limit what anyone can pick.

## Users
Same as intents 01-22: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Hero data.** Each hero gets a role.
- **Draft screen.** The role filter above the hero pool, which
  shows only the matching heroes. No change to the draft order, the
  team panels or the done view.

## Constraints
- React + TypeScript frontend, consistent with intents 01-22. No backend.
- The filter isn't stored: draft state and its saved shape don't change.
- Must fit the 13.3" laptop (1280x800 CSS px) on the draft screen, along
  with the pool's fit-to-screen grid.

## Out of Scope (deferred to later phases)
- **Role labels on the pool cards** (decided against 2026-10-28).
- **The rulebook's printed Type** (decided against 2026-10-28).
- **Team-balance help** (decided against 2026-10-28): no role makeup per
  team, and no warnings or suggestions. The rulebook sets no balance
  rule.
- **Roles outside the draft**: the Battle Board, the map and the
  draft's done view.
- **Heroes with two roles.** Each hero has exactly one.
- **3-4 player variant**, deferred along with intents 01-22.

## Session Lifecycle
- The filter isn't saved. A reload shows All, and the draft itself
  resumes as before.
