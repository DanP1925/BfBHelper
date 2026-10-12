# Intent: BfbHelper (v8 — Immobilize)

## Problem
Several heroes immobilize enemies, and the app doesn't track it anywhere.
In the physical game the immobilized hero's standee is laid on its side,
but players using the app's Battle Map instead of standees have nowhere
to record it. They have to remember it until the hero next moves, which
breaks the product vision of playing with just the cards.

The backlog's hero playability review lists Immobilize as one of three
general effects (along with +1 Attack and Confuse) that are always
available, whoever is in the battle. Boreas, Dazeem, Longshanks and
Sedusa all apply it, and Boreas's Bear Trap immobilizes the enemy that
triggers it.

(v1 = Hero Draft Picker, intent 01. v2 = Battle Board, intent 02. v3 =
Battle Controls, intent 03. v4 = Battle Map, intent 04. v5 = Initiative
Indicator, intent 05. v6 = +1 Attack Tokens, intent 06. v7 = Confuse
Tokens, intent 07.)

## Scope for v8
This phase covers only:
- **An Immobilize on/off state per hero**, for every hero on both teams.
  It starts off. It's not a count: a hero is either lying down or
  standing.
- **Always available.** Immobilize is a general status, not a
  hero-specific one. It's shown for every hero in every battle, whichever
  heroes were drafted.
- **Shown and edited on the Battle Board.** Each hero's card gets an
  Immobilize control next to the +1 Attack and Confuse controls.
  - **One tap toggles it**, like Confuse. It's muted when off and lit
    when on, so an immobilized hero reads at a glance.
  - Its exact look and placement are settled in the spec/design.
  - **Always editable,** including when the hero is at 0 HP or in the
    respawn area. As in intent 03, the app never blocks a value from
    changing.
- **Shown on the Battle Map.** Display only, in the team status panel
  on the hero's token line under its name, next to the +1 Attack and
  Confuse icons. Shown only while the hero is immobilized. Not on the
  hero tokens on the board, the same as Confuse (decided 2026-10-12).
  Editing it from the Map is left to the token display revisit in
  `BACKLOG.md`'s Follow-ups.
- **Moving is never blocked.** An immobilized hero can still be dragged
  on the Map as usual. The app doesn't stop the drag or clear the state.
  The player taps it off on the Board when the hero stands up.
- **Manual only.** Players set and clear it by hand. The app never
  clears it on its own (see Out of Scope). This is the same
  manual-tracker approach as intents 03-07.

## Proposed Outcome
When a card immobilizes a hero, a player taps that hero's Immobilize
control on the Board. The hero's card and its line on the Map show it.
The next time that hero would move, the owning player leaves it where it
is and taps the control off instead. Nobody has to remember which heroes
are lying down.

## Rules (from the rulebook)
Keyword definitions, p. 11 of `battle-for-biternia_rules_web.pdf`:

> When a Hero becomes immobilized, turn their standee on its side. The
> next time that Hero would move, for any reason, stand it back up
> instead of moving it.

- There's **no Immobilize token** in the box. The state is the standee's
  position.
- When a hero is **defeated**, its standee is removed from the board
  (Defeated Heroes, step 1), so in the physical game defeat ends
  Immobilize on its own. The app still leaves clearing it to the players,
  like every other token and status (decided 2026-10-12).

The app shows the state only. Players apply the "stand up instead of
moving" rule themselves.

### Who uses it
| Hero | Source |
|---|---|
| Boreas (Hunter) | Power cards, and the Bear Trap token when triggered |
| Dazeem (Ice Mage) | Power cards |
| Longshanks (Pirate) | Power cards (alongside Stun and Confuse) |
| Sedusa (Gorgon) | Power cards |

## Users
Same as intents 01-07: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Adds a per-hero immobilized flag to the persisted
  `BattleState`, next to each hero's HP, level, +1 Attack count and
  Confuse flag in `BattleTeamState`. No separate store.
- **Battle Board.** Each hero's card (the `HeroCard` battle variant)
  gets the Immobilize toggle in its token row, reusing intent 07's
  `TokenToggle` with its own icon and label.
- **Battle Map.** The `MapTeamStatusPanel` token line shows an
  Immobilize icon for immobilized heroes. Display only. The hero tokens
  on the board are unchanged.

## Constraints
- React + TypeScript frontend, consistent with intents 01-07. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on both the Battle Board
  and the Battle Map.
- `BattleState` is persisted at schema version 5 (intent 07) and is in
  use. Adding the flag is a schema change, and an existing saved battle
  **upgrades in place** instead of resetting (as intents 04-07 do), with
  every hero not immobilized.
- Fresh hero state comes from `createInitialHeroState` in
  `lib/battle/reducer.ts`. The flag should start off there, so new
  battles and upgraded saves agree.

## Out of Scope (deferred to later phases)
- **Automatic clearing.** Not when the hero is dragged on the Map, not
  on defeat or respawn, and not when a round passes.
- **Blocking or warning on a drag** of an immobilized hero.
- **A marker on the Map's hero tokens** (e.g. a tilted or greyed token).
  The status panel is enough (decided 2026-10-12).
- **Editing on the Map.** Left to the token display revisit in
  `BACKLOG.md`.
- **A "clear all" shortcut.** One tap per hero.
- **Who applied it.** It doesn't matter for the rules, so the app only
  stores on/off.
- **Immobilize on the Win Screen.** It's passing combat state, not part
  of a battle's final result.
- **Stun.** It's resolved with the physical cards (see `BACKLOG.md`).
- **Bear Trap and Ice Wall markers.** They're hero-specific backlog
  items. This intent only provides the Immobilize state they lead to.
- **3-4 player variant**, deferred along with intents 01-07.

## Session Lifecycle
- The Immobilize state is part of the persisted battle state. Reloading
  mid-battle keeps it.
- Starting a new draft clears it along with the rest of the battle
  state.
- Switching between Board and Map doesn't change it. Both screens read
  the same state.
- A hero being defeated (HP to 0), respawning or moving doesn't clear
  it. Players clear it by hand.
