# Intent 15: Favored Enemy

## Problem
Boreas's trait has him place the Favored Enemy token on one enemy hero at
the start of the game, and his attacks get stronger against that hero for
the rest of it. The app doesn't track the token anywhere. Players using
the app instead of the physical tokens have to remember who Boreas's
Favored Enemy is. That breaks the product vision of playing with just the
cards.

The backlog's hero playability review lists Favored Enemy as a
hero-specific feature: it only matters when Boreas is in the battle. It's
the fifth hero-specific token, after Death Mark (intent 09), Shield
(intent 11), Stone (intent 12) and Chill (intent 13), and the second
on/off one. It goes in the token row intent 09 redesigned for every token.

## Scope
This phase covers only:
- **A Favored Enemy on/off state per hero.** It starts off. It's not a
  count.
- **Hero-specific.** Favored Enemy only exists while Boreas is in the
  battle, drafted on either team. This follows the backlog's visibility
  rule (decided 2026-10-10). He counts as in the battle at 0 HP and in
  the respawn area too.
- **Boreas's enemies only.** The card places it on an enemy hero. Boreas's
  own team gets no Favored Enemy control, the same as Death Mark on
  Kunoichi's team.
- **One enemy at a time** (decided 2026-10-17), matching the box's single
  token. To give it to a different enemy, the player first taps it off
  the enemy holding it. Only then is it offered again, on any enemy. The
  app never moves it from one hero to another by itself.
- **Shown and edited on the Battle Board**, in intent 09's token row. It's
  an on/off token, so it behaves like Confuse, Immobilize and Death Mark
  there:
  - **Offered in the "+" picker** on Boreas's enemies only, and only
    while no enemy holds it. Once one enemy holds it, it's gone from
    every hero's picker.
  - **Tapping the held chip removes it,** in one tap (decided
    2026-10-17), so a mistap can be fixed. The card says the token is
    never removed, so in a real game players just never do it. The app
    doesn't lock it, following intent 03's rule that the app never
    blocks a value from changing.
  - **Fixed order:** after Chill, in both the row and the picker.
  - Its exact look and icon are settled in the spec/design.
  - **Always editable,** including when the hero is at 0 HP or in the
    respawn area.
- **Nothing new on Boreas's own card** (decided 2026-10-17). The badge on
  the marked enemy is enough, as with Death Mark and Chill.
- **Shown on the Battle Map.** Display only, in the team status panel on
  the hero's token line, as a Favored Enemy icon next to the other token
  icons. Shown only while the hero holds it. Not on the hero tokens on
  the board, the same as every other token. The Map stays read-only for
  every token (decided 2026-10-15).
- **Manual only.** There's no battle-start prompt (decided 2026-10-10):
  the player adds it from "+" at the start of the game. The app never
  adds or clears it on its own. This is the same manual-tracker approach
  as intents 03-13.

## Proposed Outcome
At the start of the game, the player controlling Boreas taps "+" on the
enemy he picks and chooses Favored Enemy. That hero's card and its line on
the Map show the badge for the rest of the game, and no other hero's
picker offers it anymore. When Boreas attacks, the player checks whether
the target holds the badge and adds +2 Attack.

## Rules (from the rulebook and Boreas's card)
Boreas's hero card, *Favored Enemy*:

> At the start of the game, place the Favored Enemy token on an enemy
> Hero. It can never be removed. You gain +2 Attack against your Favored
> Enemy.

Tokens, p. 11 of `battle-for-biternia_rules_web.pdf`:

> Whenever a Hero is defeated, discard all tokens (e.g., Ice Wall, Bear
> Trap, and Death Mark) from that Hero. If a token behaves differently
> (e.g., the Hunter's Favored Enemy token), such exceptions are defined
> on the card that causes the token to be placed.

- Favored Enemy is the rulebook's named exception: it **stays through
  the marked hero's and Boreas's defeat**, which matches the app never
  clearing it.
- The box has **1 Favored Enemy token** (p. 3).
- Boreas's power cards use Immobilize (general) and the Bear Trap token,
  per `BACKLOG.md`.

The app shows the badge only. Players apply the +2 Attack themselves.

## Users
Same as intents 01-14: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Adds a per-hero Favored Enemy flag to the persisted
  `BattleState`, next to each hero's HP, level and other tokens in
  `BattleTeamState`. No separate store.
- **Hero-specific visibility.** Favored Enemy is a new entry in the
  hero-specific token rules (`lib/battle/heroSpecificTokens.ts`), owned
  by Boreas and targeting his enemies. Hiding it from the picker while an
  enemy holds it is a new condition no earlier token has.
- **Battle Board.** The token row and "+" picker in the `HeroCard` battle
  variant gain Favored Enemy on Boreas's enemies, as an on/off token.
- **Battle Map.** The `MapTeamStatusPanel` token line shows a Favored
  Enemy icon for the hero holding it. Display only.

## Constraints
- React + TypeScript frontend, consistent with intents 01-14. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on both the Battle Board
  and the Battle Map. Intent 09's row is sized for 8 tokens on one hero,
  Favored Enemy included.
- `BattleState` is persisted and in use. Adding the flag is a schema
  change, and an existing saved battle **upgrades in place** instead of
  resetting (as intents 04-14 do), with no hero holding it.
- Fresh hero state comes from `createInitialHeroState` in
  `lib/battle/reducer.ts`. The flag should start off there, so new
  battles and upgraded saves agree.

## Out of Scope (deferred to later phases)
- **Automatic clearing** on any defeat, respawn or passed round. The card
  says it's never removed, so there's nothing to automate.
- **A battle-start prompt** to pick the Favored Enemy (decided
  2026-10-10).
- **Moving it in one step** from one enemy to another. Players tap it off
  and re-add it.
- **More than one Favored Enemy** at a time.
- **Locking it once placed.** It can always be tapped off to fix a
  mistap.
- **Applying or showing the +2 Attack**, on Boreas's card or anywhere
  else.
- **Anything on Boreas's card** (decided 2026-10-17).
- **Favored Enemy on Boreas's allies.** The card only targets enemies.
- **A marker on the Map's hero tokens.** The status panel is enough, as
  with every other token.
- **Editing on the Map.** The Map stays read-only for every token
  (decided 2026-10-15).
- **Favored Enemy on the Win Screen.** It's combat state, not part of a
  battle's final result.
- **Boreas's Bear Trap.** It's a marker placed on a map space, not a hero
  token. It's its own backlog item, separate from Dazeem's Ice Wall
  (intent 16), which sits on a path between spaces instead (revised
  2026-10-17; this originally planned them as one design).
- **Boreas's Immobilize.** It's the general Immobilize token (intent 08),
  already built.
- **The other hero-specific features** (Bear Trap, Ice Wall, Artifacts).
  They're separate backlog items.
- **3-4 player variant**, deferred along with intents 01-14.

## Session Lifecycle
- The Favored Enemy state is part of the persisted battle state.
  Reloading mid-battle keeps it.
- Starting a new draft clears it along with the rest of the battle
  state.
- Switching between Board and Map doesn't change it. Both screens read
  the same state.
- A hero being defeated (HP to 0), respawning or moving doesn't clear
  it, and neither does Boreas's defeat. It only goes away when a player
  taps it off.
