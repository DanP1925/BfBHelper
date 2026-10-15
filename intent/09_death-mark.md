# Intent: BfbHelper (v9 — Death Mark and token row)

## Problem
Kunoichi's trait marks enemies with Death Mark tokens, and her attacks get
stronger against marked heroes. The app doesn't track the marks anywhere.
Players using the app instead of the physical tokens have to remember which
enemies are marked. That breaks the product vision of playing with just the
cards.

The backlog's hero playability review lists Death Mark as a hero-specific
feature: unlike +1 Attack, Confuse and Immobilize, it only matters when
Kunoichi is in the battle. It's the first hero-specific token the app
tracks.

It's also the fourth control in a hero card's token row, and the card
already runs out of width there. Shield, Chill, Stone and Favored Enemy
are still to come, so this intent redesigns the row for every token
instead of squeezing in one more. It picks up the Board part of
`BACKLOG.md`'s "Revisit every token's display" follow-up.

(v1 = Hero Draft Picker, intent 01. v2 = Battle Board, intent 02. v3 =
Battle Controls, intent 03. v4 = Battle Map, intent 04. v5 = Initiative
Indicator, intent 05. v6 = +1 Attack Tokens, intent 06. v7 = Confuse
Tokens, intent 07. v8 = Immobilize, intent 08.)

## Scope for v9
This phase covers only:
- **A Death Mark on/off state per hero.** It starts off. It's not a
  count: the card only marks enemies without one, so a hero has at most
  one.
- **Hero-specific.** Death Mark only exists while Kunoichi is in the
  battle, drafted on either team. This follows the backlog's visibility
  rule (decided 2026-10-10). She counts as in the battle at 0 HP and in
  the respawn area too.
- **Enemies of Kunoichi only.** Only the heroes on the team opposing
  Kunoichi can be marked. Her own team's cards get no Death Mark control,
  since the card can't target allies (decided 2026-10-15).
- **Shown and edited on the Battle Board**, in the redesigned token row
  below. Death Mark is one more token in it, after Immobilize, offered in
  the picker only on Kunoichi's enemies.
  - Its exact look and icon are settled in the spec/design.
  - **Always editable,** including when the hero is at 0 HP or in the
    respawn area. As in intent 03, the app never blocks a value from
    changing.
- **A redesigned token row on the Board's hero cards** (decided
  2026-10-15). Today every control a hero could use is always shown, muted
  at 0. With Death Mark and the hero-specific tokens still to come, that
  doesn't fit a card. So the row changes for every token, not just Death
  Mark:
  - **Sized for at most 8 tokens on one hero.** That's the 3 general
    tokens, up to 4 from enemy owners (Death Mark, Chill, Stone, Favored
    Enemy) and Shield from an ally. Runika's 3 Artifacts aren't counted:
    they're built last and get their own design then.
  - **Only held tokens are shown.** A hero with no tokens shows an empty
    row with just the "+".
  - **A "+" button, always visible** at the end of the row, even with
    nothing held. It's the only way to add a token, so it never hides.
  - **The "+" opens a picker** listing the tokens this hero can take: the
    general ones, plus the hero-specific ones the visibility rule allows
    (here, Death Mark on Kunoichi's enemies). Counted tokens (+1 Attack)
    are always listed and add 1 per tap. On/off tokens (Confuse,
    Immobilize, Death Mark) are listed only while not held.
  - **The picker stays open** across picks, so adding three +1 Attack
    tokens (Cynthia's Fan the Flames) is one open and three taps. It
    closes on a tap outside, a second tap of "+", or Escape.
  - **Tapping a held on/off chip removes it**, in one tap, like untoggling
    today. A mistap is fixed by re-adding it from "+".
  - **Tapping a held counted chip** opens its − / + stepper, as today.
    Going to 0 removes the chip.
  - **Fixed order:** +1 Attack, Confuse, Immobilize, then hero-specific
    tokens (Death Mark first), in both the row and the picker. A hero's
    row never reshuffles by the order tokens were added.
  - **Usually one line.** A typical hero holds 0-3 tokens. Only a rare hero
    holding about 4 or more (the exact count depends on the mix) wraps to
    a second line, and only that card gets taller.
- **Nothing new on Kunoichi's own card.** No count of marked enemies and
  no "+2 vs marked" reminder. The marks on the enemy cards are enough
  (decided 2026-10-15).
- **Shown on the Battle Map.** Display only, in the team status panel on
  the hero's token line under its name, next to the +1 Attack, Confuse
  and Immobilize icons. Shown only while the hero is marked. Not on the
  hero tokens on the board, the same as Confuse and Immobilize. The Map
  stays read-only for every token (decided 2026-10-15). It already shows
  only held tokens, so the redesign changes nothing there, except that a
  hero holding 6 or more tokens wraps to a second token line.
- **Manual only.** Players mark enemies at the end of each Action Phase
  and clear marks by hand. The app never clears one on its own (see Out
  of Scope). This is the same manual-tracker approach as intents 03-08.

## Proposed Outcome
At the end of each Action Phase, the player controlling Kunoichi taps "+"
on each unmarked enemy in her space and picks Death Mark. Those heroes'
cards and their lines on the Map show the mark. When Kunoichi attacks,
the player checks whether the target is marked and adds +2 Attack. When a
marked hero (or Kunoichi) is defeated, a player taps the marks off.

Every hero card on the Board also gets less cluttered: it shows only the
tokens the hero actually holds, and the rest wait behind "+".

## Rules (from the rulebook)
Kunoichi's hero card, *Know Your Enemy*:

> At the end of each Action Phase, each enemy Hero in your space without
> a Death Mark token gains one. You gain +2 Attack against enemies with a
> Death Mark token.

Tokens, p. 11 of `battle-for-biternia_rules_web.pdf`:

> Tokens are discarded – removed from play – when the Hero associated
> with them or affected by them is defeated. Whenever a Hero is defeated,
> discard all tokens (e.g., Ice Wall, Bear Trap, and Death Mark) from
> that Hero.

- A Death Mark is discarded when the **marked hero** is defeated, and
  all of them are discarded when **Kunoichi** (the hero they're
  associated with) is defeated. The app still leaves clearing them to
  the players, one tap per hero (decided 2026-10-15).
- The box has **4 Death Mark tokens**, enough to mark every enemy in a
  2-player game, so the app doesn't need a cap.
- Kunoichi's power cards place no other tokens.

The app shows the marks only. Players apply the +2 Attack themselves.

## Users
Same as intents 01-08: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Adds a per-hero Death Mark flag to the persisted
  `BattleState`, next to each hero's HP, level and other tokens in
  `BattleTeamState`. No separate store.
- **Battle Board.** Every hero card's token row (the `HeroCard` battle
  variant) is redesigned: held tokens only, plus the "+" picker. That
  changes how +1 Attack (intent 06's `TokenChip`), Confuse and Immobilize
  (intent 07's `TokenToggle`) appear, not what they store. Death Mark joins
  the row and the picker on Kunoichi's enemies.
- **Battle Map.** The `MapTeamStatusPanel` token line shows a Death Mark
  icon for marked heroes. Display only. The hero tokens on the board are
  unchanged.

## Constraints
- React + TypeScript frontend, consistent with intents 01-08. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on both the Battle Board
  and the Battle Map. The redesigned row must keep a typical card (0-3
  tokens held) on one line, so the Board is no taller than today. The
  picker opens over the Board without being clipped or scrolling it.
- `BattleState` is persisted at schema version 6 (intent 08) and is in
  use. Adding the flag is a schema change, and an existing saved battle
  **upgrades in place** instead of resetting (as intents 04-08 do), with
  no hero marked.
- Fresh hero state comes from `createInitialHeroState` in
  `lib/battle/reducer.ts`. The flag should start off there, so new
  battles and upgraded saves agree.
- How hero-specific visibility is modeled (e.g. one token registry
  covering counts, toggles and the visibility rule, per `BACKLOG.md`'s
  Follow-ups) is decided in spec 09.

## Out of Scope (deferred to later phases)
- **Automatic clearing.** Not on the marked hero's defeat, not on
  Kunoichi's defeat, not on respawn, and not when a round passes.
- **Automatic marking** at the end of the Action Phase, based on who
  shares Kunoichi's space on the Map.
- **Applying or showing the +2 Attack**, on Kunoichi's card or anywhere
  else.
- **A "clear all" shortcut**, including one for Kunoichi's defeat. One
  tap per hero.
- **Marking Kunoichi's allies.** The control only exists on enemies.
- **A marker on the Map's hero tokens.** The status panel is enough, as
  with Confuse and Immobilize.
- **Editing on the Map.** The Map stays read-only for every token
  (decided 2026-10-15).
- **Runika's Artifacts.** They're built last, and their place on her card
  is designed then. They don't count toward the row's 8-token sizing.
- **One-tap adding** of on/off tokens. Adding now goes through "+" (two
  taps); only removing a held on/off token is one tap.
- **Who placed it.** Only Kunoichi places Death Marks, so the app only
  stores on/off.
- **Death Mark on the Win Screen.** It's passing combat state, not part
  of a battle's final result.
- **The other hero-specific features** (Favored Enemy, Bear Trap,
  Shield, Chill, Ice Wall, the Arena, Artifacts, Stone). They're separate
  backlog items.
- **3-4 player variant**, deferred along with intents 01-08.

## Session Lifecycle
- The Death Mark state is part of the persisted battle state. Reloading
  mid-battle keeps it.
- Starting a new draft clears it along with the rest of the battle
  state.
- Switching between Board and Map doesn't change it. Both screens read
  the same state.
- A hero being defeated (HP to 0), respawning or moving doesn't clear
  it, and neither does Kunoichi's defeat. Players clear it by hand.
