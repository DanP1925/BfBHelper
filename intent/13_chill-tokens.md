# Intent 13: Chill Tokens

## Problem
Dazeem's trait and power cards give Chill tokens to his enemies, and each
token takes 1 off all of that hero's attacks. The app doesn't track them
anywhere. Players using the app instead of the physical tokens have to
remember how many Chill each hero holds. That breaks the product vision
of playing with just the cards.

The backlog's hero playability review lists Chill as a hero-specific
feature: it only matters when Dazeem is in the battle. It's the fourth
hero-specific token, after Death Mark (intent 09), Shield (intent 11) and
Stone (intent 12), and the third counted one. It goes in the token row
intent 09 redesigned for every token.

## Scope
This phase covers only:
- **A Chill token count per hero.** It starts at 0 and goes up or down
  by one tap at a time. Heroes can hold more than one.
- **Named "+1 Chill"** (decided 2026-10-17), to match "+1 Attack",
  "+1 Shield" and "+1 Stone": each tap adds one. "-1 Attack" was turned
  down because it reads like removing a +1 Attack token.
- **Hero-specific.** Chill only exists while Dazeem is in the battle,
  drafted on either team. This follows the backlog's visibility rule
  (decided 2026-10-10). He counts as in the battle at 0 HP and in the
  respawn area too.
- **Dazeem's enemies only** (decided 2026-10-17). Winter's Chill targets
  an enemy Dazeem hits. Dazeem's own team gets no Chill control, the
  same as Stone on Sedusa's team.
- **Separate from +1 Attack** (decided 2026-10-17). A hero can hold both,
  and the app never nets one against the other. They expire at different
  times, so each keeps its own count.
- **Shown and edited on the Battle Board**, in intent 09's token row. It's
  a counted token, so it behaves like +1 Attack, +1 Shield and +1 Stone
  there:
  - Offered in the "+" picker on Dazeem's enemies only. Each tap adds 1,
    and the row is disabled for a hero who already holds 5.
  - Tapping a held Chill chip opens its − / + stepper. Going to 0
    removes the chip.
  - **Fixed order:** after Stone, in both the row and the picker.
  - Its exact look and icon are settled in the spec/design.
  - **Always editable,** including when the hero is at 0 HP or in the
    respawn area. As in intent 03, the app never blocks a value from
    changing.
- **Nothing new on Dazeem's own card** (decided 2026-10-17). The counts
  on his enemies' cards are enough.
- **Shown on the Battle Map.** Display only, in the team status panel on
  the hero's token line, as a Chill icon with the count, next to the
  other token icons. Shown only while the count is above 0. Not on the
  hero tokens on the board, the same as every other token. The Map stays
  read-only for every token (decided 2026-10-15).
- **Manual only** (decided 2026-10-17). Players add Chill when a card
  gives it, subtract it from the hero's attacks themselves and tap it
  off at the end of that hero's action. The app has no notion of an
  action ending, so it never clears Chill on its own (see Out of Scope).
  This is the same manual-tracker approach as intents 03-12.

## Proposed Outcome
Dazeem hits an enemy, and the player controlling him taps "+" on that
hero and picks "+1 Chill". That hero's card and line on the Map show one
Chill. When the chilled hero attacks, its player takes 1 off each attack
per Chill, then taps all of its Chill off once that action ends.

## Rules (from the rulebook and Dazeem's card)
Dazeem's hero card, *Winter's Chill*, per `BACKLOG.md`: an enemy hit by
Dazeem gains a Chill token, and all of a hero's Chill tokens are removed
at the end of that hero's action.

- Each Chill token is **-1 to all of that hero's attacks**, the inverse
  of a +1 Attack token (confirmed 2026-10-17).
- Per the Tokens rules (p. 11), a defeated hero's tokens are discarded,
  so the hero's Chill goes with them.
- The box has **5 Chill tokens** (p. 3).
- The rulebook doesn't list Dazeem's card text. His power cards give more
  Chill, immobilize, and place Ice Wall, per `BACKLOG.md`.

The app shows the counts only. Players apply the attack penalty and the
expiry themselves.

## Users
Same as intents 01-12: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Adds a per-hero Chill count to the persisted
  `BattleState`, next to each hero's HP, level and other tokens in
  `BattleTeamState`. No separate store.
- **Hero-specific visibility.** Chill is a new entry in the
  hero-specific token rules (`lib/battle/heroSpecificTokens.ts`), owned
  by Dazeem and targeting his enemies.
- **Battle Board.** The token row and "+" picker in the `HeroCard` battle
  variant gain Chill on Dazeem's enemies, as a counted token: a
  `BATTLE_TOKENS` row.
- **Battle Map.** The `MapTeamStatusPanel` token line shows a Chill icon
  and count for heroes holding Chill. Display only.

## Constraints
- React + TypeScript frontend, consistent with intents 01-12. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on both the Battle Board
  and the Battle Map. Intent 09's row is sized for 8 tokens on one hero.
- `BattleState` is persisted at schema version 9 (intent 12) and is in
  use. Adding the count is a schema change, and an existing saved battle
  **upgrades in place** instead of resetting (as intents 04-12 do), with
  every hero's Chill at 0.
- Fresh hero state comes from `createInitialHeroState` in
  `lib/battle/reducer.ts`. The count should start at 0 there, so new
  battles and upgraded saves agree.

## Value Bounds
- **Floor 0.** A hero can't have negative Chill.
- **Ceiling 5** per hero (decided 2026-10-17), the box supply. No rule
  caps it, but a hero can't physically hold more than the box's 5.

## Out of Scope (deferred to later phases)
- **Automatic clearing** at the end of the chilled hero's action, on its
  defeat, on respawn, or when a round passes. The app doesn't track
  actions.
- **Netting Chill against +1 Attack,** or showing a hero's total attack
  modifier.
- **A "clear all" shortcut** or group shortcuts. One tap per token per
  hero (decided 2026-10-10).
- **Chill on Dazeem's allies.** Winter's Chill only targets enemies.
- **Anything on Dazeem's card** (decided 2026-10-17).
- **A marker on the Map's hero tokens.** The status panel is enough, as
  with every other token.
- **Editing on the Map.** The Map stays read-only for every token
  (decided 2026-10-15).
- **Chill on the Win Screen.** It's passing combat state, not part of a
  battle's final result.
- **Dazeem's Ice Wall** (decided 2026-10-17). It's a marker placed on a
  map space, not a hero token. It will be built later together with
  Boreas's Bear Trap, which works the same way, as one design. Both are
  already in `BACKLOG.md`.
- **Dazeem's Immobilize.** It's the general Immobilize token (intent 08),
  already built.
- **The other hero-specific features** (Favored Enemy, Bear Trap, the
  Arena, Artifacts). They're separate backlog items.
- **3-4 player variant**, deferred along with intents 01-12.

## Session Lifecycle
- Chill counts are part of the persisted battle state. Reloading
  mid-battle keeps them.
- Starting a new draft clears them along with the rest of the battle
  state.
- Switching between Board and Map doesn't change them. Both screens read
  the same state.
- A hero being defeated (HP to 0), respawning or moving doesn't clear
  its Chill, and neither does Dazeem's defeat. Players clear it by hand.
