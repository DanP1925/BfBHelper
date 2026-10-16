# Intent 12: Stone Tokens

## Problem
Sedusa's trait and power cards give Stone tokens to her enemies, and a
hero with three or more is defeated on the spot. The app doesn't track
them anywhere. Players using the app instead of the physical tokens have
to remember how many Stone each hero holds, and missing the third one
changes the game. That breaks the product vision of playing with just
the cards.

The backlog's hero playability review lists Stone as a hero-specific
feature: it only matters when Sedusa is in the battle. It's the third
hero-specific token, after Death Mark (intent 09) and Shield (intent 11),
and the second counted one. It goes in the token row intent 09 redesigned
for every token.

## Scope
This phase covers only:
- **A Stone token count per hero.** It starts at 0 and goes up or down
  by one tap at a time. Heroes can hold more than one.
- **Named "+1 Stone"** (decided 2026-10-16), to match "+1 Attack" and
  "+1 Shield": each tap adds one.
- **Hero-specific.** Stone only exists while Sedusa is in the battle,
  drafted on either team. This follows the backlog's visibility rule
  (decided 2026-10-10). She counts as in the battle at 0 HP and in the
  respawn area too.
- **Sedusa's enemies only** (decided 2026-10-16). Stony Glare targets "a
  target enemy in your space". Sedusa's own team gets no Stone control,
  the same as Death Mark on Kunoichi's team.
- **Shown and edited on the Battle Board**, in intent 09's token row. It's
  a counted token, so it behaves like +1 Attack and +1 Shield there:
  - Offered in the "+" picker on Sedusa's enemies only. Each tap adds 1,
    and the row is disabled for a hero who already holds 3.
  - Tapping a held Stone chip opens its − / + stepper. Going to 0
    removes the chip.
  - **Fixed order:** after Shield, in both the row and the picker.
  - Its exact look and icon are settled in the spec/design.
  - **Always editable,** including when the hero is at 0 HP or in the
    respawn area. As in intent 03, the app never blocks a value from
    changing.
- **Nothing new on Sedusa's own card** (decided 2026-10-16). The counts
  on her enemies' cards are enough.
- **Shown on the Battle Map.** Display only, in the team status panel on
  the hero's token line, as a Stone icon with the count, next to the
  other token icons. Shown only while the count is above 0. Not on the
  hero tokens on the board, the same as every other token. The Map stays
  read-only for every token (decided 2026-10-15).
- **Manual only.** Players add Stone when a card gives it, apply the
  defeat at 3 themselves (lower the hero's HP to 0) and clear the
  hero's Stone by hand. The app never warns at 3, never defeats a hero
  on its own and never clears Stone (see Out of Scope). This is the same
  manual-tracker approach as intents 03-11.

## Proposed Outcome
At the end of the Action Phase, the player controlling Sedusa taps "+"
on an enemy in her space and picks "+1 Stone". That hero's card and line
on the Map show one Stone. When a hero reaches 3, the players see it on
the card, lower that hero's HP to 0 and tap their Stone off.

## Rules (from the rulebook)
Sedusa's hero card, *Stony Glare*:

> At the end of each Action Phase, a target enemy in your space gains a
> Stone token. When a Hero has three or more Stone tokens, they are
> immediately defeated.

- **3 Stone defeats a hero** at once, whatever their HP.
- Per the Tokens rules (p. 11), a defeated hero's tokens are discarded,
  so the hero's Stone goes with them. Nothing removes Stone at the end
  of a round.
- The box has **8 Stone tokens**.
- The rulebook doesn't list Sedusa's power card text. They place more
  Stone and immobilize, per `BACKLOG.md`.

The app shows the counts only. Players apply the defeat themselves.

## Users
Same as intents 01-11: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Adds a per-hero Stone count to the persisted
  `BattleState`, next to each hero's HP, level and other tokens in
  `BattleTeamState`. No separate store.
- **Hero-specific visibility.** Stone is a new entry in the
  hero-specific token rules (`lib/battle/heroSpecificTokens.ts`), owned
  by Sedusa and targeting her enemies.
- **Battle Board.** The token row and "+" picker in the `HeroCard` battle
  variant gain Stone on Sedusa's enemies, as a counted token. Since
  v0.11.1 this is a `BATTLE_TOKENS` row.
- **Battle Map.** The `MapTeamStatusPanel` token line shows a Stone icon
  and count for heroes holding Stone. Display only.

## Constraints
- React + TypeScript frontend, consistent with intents 01-11. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on both the Battle Board
  and the Battle Map. Intent 09's row is sized for 8 tokens on one hero.
- `BattleState` is persisted at schema version 8 (intent 11) and is in
  use. Adding the count is a schema change, and an existing saved battle
  **upgrades in place** instead of resetting (as intents 04-11 do), with
  every hero's Stone at 0.
- Fresh hero state comes from `createInitialHeroState` in
  `lib/battle/reducer.ts`. The count should start at 0 there, so new
  battles and upgraded saves agree.

## Value Bounds
- **Floor 0.** A hero can't have negative Stone.
- **Ceiling 3** per hero (decided 2026-10-16). A hero at 3 is defeated
  and their tokens are discarded, so a higher count never matters. A
  power card taking a hero from 2 to 4 ends the same way. The box's 8
  isn't a per-hero limit.

## Out of Scope (deferred to later phases)
- **Automatic defeat at 3 Stone,** or any warning or highlight when a
  hero reaches it (decided in `BACKLOG.md`).
- **Automatic clearing.** Not on the holder's defeat, not on respawn,
  and not when a round passes.
- **A "clear all" shortcut** or group shortcuts. One tap per token per
  hero (decided 2026-10-10).
- **Stone on Sedusa's allies.** Stony Glare only targets enemies.
- **Anything on Sedusa's card** (decided 2026-10-16).
- **A marker on the Map's hero tokens.** The status panel is enough, as
  with every other token.
- **Editing on the Map.** The Map stays read-only for every token
  (decided 2026-10-15).
- **Stone on the Win Screen.** It's passing combat state, not part of a
  battle's final result.
- **Sedusa's Immobilize.** It's the general Immobilize token (intent 08),
  already built.
- **The other hero-specific features** (Favored Enemy, Bear Trap, Chill,
  Ice Wall, the Arena, Artifacts). They're separate backlog items.
- **3-4 player variant**, deferred along with intents 01-11.

## Session Lifecycle
- Stone counts are part of the persisted battle state. Reloading
  mid-battle keeps them.
- Starting a new draft clears them along with the rest of the battle
  state.
- Switching between Board and Map doesn't change them. Both screens read
  the same state.
- A hero being defeated (HP to 0), respawning or moving doesn't clear
  its Stone, and neither does Sedusa's defeat. Players clear it by hand.
