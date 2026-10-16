# Intent 11: Shield Tokens

## Problem
Cyrus's trait and power cards give Shield tokens to his team, and each
token absorbs damage before it reaches a hero's HP. The app doesn't
track them anywhere. Players using the app instead of the physical
tokens have to remember how many shields each hero holds. That breaks
the product vision of playing with just the cards.

The backlog's hero playability review lists Shield as a hero-specific
feature: it only matters when Cyrus is in the battle. It's the second
hero-specific token, after Death Mark (intent 09), and the first
hero-specific one that's counted rather than on/off. It goes in the
token row intent 09 redesigned for every token.

## Scope
This phase covers only:
- **A Shield token count per hero.** It starts at 0 and goes up or down
  by one tap at a time. Heroes can hold more than one.
- **Hero-specific.** Shield only exists while Cyrus is in the battle,
  drafted on either team. This follows the backlog's visibility rule
  (decided 2026-10-10). He counts as in the battle at 0 HP and in the
  respawn area too.
- **Cyrus's team only, Cyrus included** (decided 2026-10-16). The Shield
  keyword targets "a friendly Hero in your space", which includes the
  user. Holy Aura's "Other" leaves Cyrus out, but other Shield sources
  may not, so the app doesn't block shielding him. The opposing team's
  cards get no Shield control.
- **Shown and edited on the Battle Board**, in intent 09's token row. It's
  a counted token, so it behaves like +1 Attack there:
  - Offered in the "+" picker on Cyrus's team only. Always listed there,
    and each tap adds 1. The picker stays open, so giving three shields
    is one open and three taps.
  - Tapping a held Shield chip opens its − / + stepper. Going to 0
    removes the chip.
  - **Fixed order:** after the general tokens and after Death Mark, in
    both the row and the picker.
  - Its exact look and icon are settled in the spec/design.
  - **Always editable,** including when the hero is at 0 HP or in the
    respawn area. As in intent 03, the app never blocks a value from
    changing.
- **Nothing new on Cyrus's own card.** No total of shields handed out
  and no Holy Aura reminder. The counts on his team's cards are enough
  (decided 2026-10-16).
- **Shown on the Battle Map.** Display only, in the team status panel on
  the hero's token line, as a Shield icon with the count, next to the
  other token icons. Shown only while the count is above 0. Not on the
  hero tokens on the board, the same as every other token. The Map stays
  read-only for every token (decided 2026-10-15).
- **Manual only.** Players add shields when a card gives them and remove
  them when damage comes in. The app never applies damage to them or
  clears them on its own (see Out of Scope). This is the same
  manual-tracker approach as intents 03-09.

## Proposed Outcome
After Cyrus uses a Paladin power, the player controlling him taps "+" on
a friendly hero in his space and picks Shield. That hero's card and line
on the Map show "Shield ×1". When an attack hits a shielded hero, the
player works out damage after defense, taps one shield off per point,
and lowers HP by whatever is left. When a shielded hero is defeated, a
player taps their shields off.

## Rules (from the rulebook)
Cyrus's hero card, *Holy Aura*:

> After you use a Paladin Power: Shield 1, Other.

Keyword Definitions, *Shield X*, in `battle-for-biternia_rules_web.pdf`:

> Target a friendly Hero in your space and give them X Shield tokens.
> When a Hero with one or more shield tokens would take damage (after
> defense value is applied), remove one shield token for each point of
> damage that would be dealt, reducing the incoming damage by the number
> of shield tokens removed. If any damage remains, it is applied
> normally. Shield tokens are not removed when the Hero who placed them
> is defeated.

- Each shield absorbs **1 damage, after defense**. Pierce lowers defense,
  not shields.
- Shields **stay** when Cyrus is defeated, but per the Tokens rules
  (p. 11) they're discarded when the **hero holding them** is defeated.
  Nothing removes them at the end of a round. The app leaves clearing
  them to the players.
- An attack fully absorbed by shields deals no damage, so it doesn't
  count as a Hit and its Hit effects don't apply (p. 9).
- The box has **15 Shield tokens** and the rulebook sets no cap per hero.
- The rulebook doesn't list Cyrus's power card text. They give more
  Shield, per `BACKLOG.md`.

The app shows the counts only. Players apply the absorption themselves.

## Users
Same as intents 01-10: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Adds a per-hero Shield count to the persisted
  `BattleState`, next to each hero's HP, level and other tokens in
  `BattleTeamState`. No separate store.
- **Hero-specific visibility.** Shield is a new entry in the
  hero-specific token rules (`lib/battle/heroSpecificTokens.ts`), owned
  by Cyrus and targeting his own team.
- **Battle Board.** The token row and "+" picker in the `HeroCard` battle
  variant gain Shield on Cyrus's team, as a counted token like +1 Attack.
- **Battle Map.** The `MapTeamStatusPanel` token line shows a Shield icon
  and count for shielded heroes. Display only.

## Constraints
- React + TypeScript frontend, consistent with intents 01-10. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on both the Battle Board
  and the Battle Map. Intent 09's row is already sized for Shield (8
  tokens on one hero).
- `BattleState` is persisted at schema version 7 (intent 09) and is in
  use. Adding the count is a schema change, and an existing saved battle
  **upgrades in place** instead of resetting (as intents 04-09 do), with
  every hero's Shield at 0.
- Fresh hero state comes from `createInitialHeroState` in
  `lib/battle/reducer.ts`. The count should start at 0 there, so new
  battles and upgraded saves agree.

## Value Bounds
- **Floor 0.** A hero can't have negative shields.
- **Ceiling 9** per hero (decided 2026-10-16), the same as +1 Attack. It
  keeps the count to a single digit. The box's 15 isn't a per-hero
  limit, and more than a few shields on one hero is rare.

## Out of Scope (deferred to later phases)
- **Automatic absorption**: subtracting damage from shields before HP,
  or prompting for it when HP is lowered.
- **Automatic clearing.** Not on the holder's defeat, not on respawn,
  and not when a round passes.
- **A "clear all" shortcut** or group shortcuts. One tap per token per
  hero (decided 2026-10-10).
- **Shield on enemies of Cyrus.** The keyword only targets friendly
  heroes.
- **Anything on Cyrus's card**: a total of shields handed out or a Holy
  Aura reminder (decided 2026-10-16).
- **A marker on the Map's hero tokens.** The status panel is enough, as
  with every other token.
- **Editing on the Map.** The Map stays read-only for every token
  (decided 2026-10-15).
- **Who placed it.** Shields stay when the placer is defeated, so the
  app only stores a count.
- **Shield on the Win Screen.** It's passing combat state, not part of
  a battle's final result.
- **Runika's Shield Amulet.** It's one of her Artifacts, a separate
  backlog item, not a Shield token.
- **The other hero-specific features** (Favored Enemy, Bear Trap, Chill,
  Ice Wall, the Arena, Artifacts, Stone). They're separate backlog
  items.
- **3-4 player variant**, deferred along with intents 01-10.

## Session Lifecycle
- Shield counts are part of the persisted battle state. Reloading
  mid-battle keeps them.
- Starting a new draft clears them along with the rest of the battle
  state.
- Switching between Board and Map doesn't change them. Both screens read
  the same state.
- A hero being defeated (HP to 0), respawning or moving doesn't clear
  its shields, and neither does Cyrus's defeat. Players clear them by
  hand.
