# Intent: BfbHelper (v7 — Confuse Tokens)

## Problem
Several heroes confuse enemies, and the app doesn't track it anywhere,
so players keep the physical tokens next to the board or try to remember
them. A forgotten Confuse token is easy to miss, because it only matters
a round later, at the next Orders Phase. That breaks the product vision
of playing with just the cards. In the first full playtest (2026-10-10,
see `BACKLOG.md`) Agatha Trunch's power card already needed it.

The backlog's hero playability review lists Confuse as one of three
general token types (along with +1 Attack and Immobilize) that are
always available, whoever is in the battle. Agatha Trunch, Baldwin,
Dolgolae, Kerrick and Longshanks all place it.

(v1 = Hero Draft Picker, intent 01. v2 = Battle Board, intent 02. v3 =
Battle Controls, intent 03. v4 = Battle Map, intent 04. v5 = Initiative
Indicator, intent 05. v6 = +1 Attack Tokens, intent 06.)

## Scope for v7
This phase covers only:
- **A Confuse on/off state per hero**, for every hero on both teams.
  It starts off. It's not a count: a confused hero gets one card from
  the top of the action deck however many tokens it holds, so stacking
  has no meaning in the rules (decided 2026-10-11).
- **Always available.** Confuse is a general token, not a
  hero-specific one. It's shown for every hero in every battle, whichever
  heroes were drafted.
- **Shown and edited on the Battle Board.** Each hero's card gets a
  Confuse control next to the +1 Attack chip.
  - **One tap toggles it** (decided 2026-10-11). There's no expand step
    like the +1 Attack chip's − / +, since there's only on or off. It's
    muted when off and lit when on, so a confused hero reads at a glance.
  - Its exact look and placement are settled in the spec/design.
  - **Always editable,** including when the hero is at 0 HP or in the
    respawn area. As in intent 03, the app never blocks a value from
    changing.
- **Shown on the Battle Map.** Display only, in the team status panel
  on the hero's token line under its name, next to the +1 Attack count
  (intent 06). Shown only while the hero is confused. Never on the hero
  tokens on the board, which already cluster when heroes share a space.
  Seeing it on the Map helps players remember it at the next Orders
  Phase.
- **Manual only.** Players add and remove the token by hand. The app
  never removes it on its own (see Out of Scope). This is the same
  manual-tracker approach as intents 03-06.

## Proposed Outcome
When a card confuses a hero, a player taps that hero's Confuse control
on the Board. The hero's card and its line on the Map show it. At the
next round's Orders Phase, the owning player assigns that hero the top
card of their action deck instead of one from their hand, then taps the
control off. The physical Confuse tokens can stay in the box.

## Rules (from the rulebook)
Keyword definitions, p. 11 of `battle-for-biternia_rules_web.pdf`:

> Place a confusion token on the affected Hero. During the next round's
> Orders Phase, assign the top card of the action deck to each of your
> confused Heroes, rather than a card from your hand. You may look at
> the card after assigning it. Then, remove all confusion tokens from
> your Heroes. Confusion tokens do not affect Hero activation during the
> round in which they are applied and are not removed if the Hero who
> placed them is defeated.

- The box has **4** Confuse tokens (components, p. 2).
- When a hero is **defeated**, all tokens on it are discarded (Defeated
  Heroes, step 6). The app leaves that to the players, the same as
  +1 Attack.

The app shows the state only. Players deal the top card themselves.

### Who uses them
| Hero | Source |
|---|---|
| Agatha Trunch (Minotaur) | One power card confuses |
| Baldwin (Bard) | Power cards |
| Dolgolae (Yomp) | Power cards |
| Kerrick (Wizard) | One power card confuses |
| Longshanks (Pirate) | Power cards (alongside Stun and Immobilize) |

## Users
Same as intents 01-06: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Adds a per-hero confused flag to the persisted
  `BattleState`, next to each hero's HP, level and +1 Attack count in
  `BattleTeamState`. No separate store.
- **Battle Board.** Each hero's card (the `HeroCard` battle variant)
  gets the Confuse toggle, in the token row intent 06 left room for.
- **Battle Map.** The `MapTeamStatusPanel` token line shows a Confuse
  icon for confused heroes. Display only.
- **Shared token pattern.** Immobilize is also an on/off general token
  and is next in the backlog. The Confuse toggle should be built so
  Immobilize can reuse it with its own icon and label, the way
  `TokenChip` is generic for counted tokens.

## Constraints
- React + TypeScript frontend, consistent with intents 01-06. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on both the Battle Board
  and the Battle Map.
- `BattleState` is persisted at schema version 4 (intent 06) and is in
  use. Adding the flag is a schema change to version 5, and an existing
  saved battle **upgrades in place** instead of resetting (as intents
  04-06 do), with every hero unconfused.
- Fresh hero state comes from `createInitialHeroState` in
  `lib/battle/reducer.ts`. The flag should start off there, so new
  battles and upgraded saves agree.

## Out of Scope (deferred to later phases)
- **Automatic clearing.** Not when initiative passes (that happens at
  the end of a round, too early: the token must last until the next
  Orders Phase), not at the Orders Phase (the app doesn't track phases),
  and not on defeat.
- **Orders Phase prompts or reminders** beyond the token being visible.
- **A "clear all" shortcut.** One tap per hero.
- **Who placed the token.** It doesn't matter for the rules, so the app
  only stores on/off.
- **Confuse on the Win Screen.** It's passing combat state, not part of
  a battle's final result.
- **Immobilize.** A separate backlog item and intent (decided
  2026-10-11). This intent only has to leave a toggle it can reuse.
- **3-4 player variant**, deferred along with intents 01-06.

## Session Lifecycle
- The Confuse state is part of the persisted battle state. Reloading
  mid-battle keeps it.
- Starting a new draft clears it along with the rest of the battle
  state.
- Switching between Board and Map doesn't change it. Both screens read
  the same state.
- A hero being defeated (HP to 0) or respawning doesn't clear it.
  Players clear it by hand, as the rules call for.
