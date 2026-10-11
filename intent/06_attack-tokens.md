# Intent: BfbHelper (v6 — +1 Attack Tokens)

## Problem
Several heroes place +1 Attack tokens: on themselves, on allies, and
often more than one at a time. The app doesn't track them anywhere, so
players keep the physical tokens next to the board or try to remember
them. That breaks the product vision of playing with just the cards. In
the first full playtest (2026-10-10, see `BACKLOG.md`) two of the eight
heroes in play needed them: Caligar's power card gives a hero two
tokens, and Cynthia's *Fan the Flames* gives her three on Rest.

The backlog's hero playability review lists +1 Attack as one of three
general token types (along with Confuse and Immobilize) that are always
available, whoever is in the battle. It's the most-used counted token.
Caligar, Cynthia, Baldwin and Dolgolae all place it, and Stun interacts
with it.

(v1 = Hero Draft Picker, intent 01. v2 = Battle Board, intent 02. v3 =
Battle Controls, intent 03. v4 = Battle Map, intent 04. v5 = Initiative
Indicator, intent 05.)

## Scope for v6
This phase covers only:
- **A +1 Attack token count per hero**, for every hero on both teams.
  It starts at 0 and goes up or down by one tap at a time. Heroes can
  hold more than one (Cynthia gets three at once).
- **Always available.** +1 Attack is a general token, not a
  hero-specific one. It's shown for every hero in every battle, whichever
  heroes were drafted.
- **Shown and edited on the Battle Board.** The Board is where each
  hero's count lives and where players change it, next to HP and level.
  - The control is a **compact token chip**: a swords icon plus the
    count (e.g. "⚔ ×2"), with no "+1" label since +1 Attack is the only
    attack token. It has no direct numeric entry. It's smaller than the
    HP and level steppers and reads as a token rather than a stat, which
    leaves room on the card for later tokens.
  - **Collapsed by default.** At 0 it's a muted swords icon, and from 1
    up it's a gold icon with the count, so counts read at a glance.
  - **Tapping the icon expands it** with a short animation to show − and
    + (decided 2026-10-11). Tapping the icon again, tapping anywhere
    else, or pressing Escape collapses it. Only one hero's chip is open
    at a time: opening another closes the first.
  - Once more token types exist, revisit hiding the control entirely at
    0 (e.g. adding tokens from a tap on the hero card) to cut clutter
    further.
  - **Always editable,** including when the hero is at 0 HP or in the
    respawn area. Tokens stay on defeat, and as in intent 03 the app
    never blocks a value from changing.
- **The Battle Map only if there's room.** Showing counts on the Map is
  optional. It's added only if it fits without crowding the board or
  the hero tokens on the 13.3" laptop. If it doesn't fit, the Map shows
  nothing and players check the Board.
  - **Where (decided 2026-10-11):** in the team status panel, on its own
    line under the hero's name (e.g. "⚔2"), shown only when the count is
    above 0. The line leaves room for later token icons. Counts never go
    on the hero tokens on the board, which already cluster when heroes
    share a space. Display only.
- **Manual only.** Players add and remove tokens by hand. The app never
  removes them on its own: not at the end of an activation, not on Stun,
  not on defeat. This is the same manual-tracker approach as intents
  03-05.

## Proposed Outcome
When a card or ability places +1 Attack tokens, a player taps the
target hero's token control on the Board once per token. The count
shows on that hero's card. When the tokens expire (end of that
hero's next activation, or a Stun), a player taps them back down. The
physical +1 Attack tokens can stay in the box.

## Rules (from the rulebook)
As recorded in `BACKLOG.md` from `battle-for-biternia_rules_web.pdf`:
- Each +1 Attack token adds 1 to **all** of that hero's attacks, melee
  and ranged.
- Tokens are removed at the **end of the hero's next activation**, or
  when the hero is **stunned**.
- Tokens **stay** if the hero who placed them is defeated.
- Tokens can be placed on **allies**, not just the hero playing the card
  (Caligar, Baldwin's *Spoony Bard*).

The app shows the count only. Players add the bonus to attack values
themselves, the same way they apply *Rage*, *Momentum* or *Square Meal*.

### Who uses them
| Hero | Source |
|---|---|
| Caligar (Cleric) | Power card: a target hero in Caligar's space gets two tokens |
| Cynthia (Fire Mage) | *Fan the Flames*: three tokens on Rest; power cards |
| Baldwin (Bard) | *Spoony Bard*: one token to each other friendly hero in his space after a Bard power |
| Dolgolae (Yomp) | Power cards give him tokens |
| Longshanks (Pirate) | Doesn't place them, but his Stun removes the target's tokens, done by hand |

## Users
Same as intents 01-05: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Adds a per-hero +1 Attack count to the persisted
  `BattleState`, next to each hero's HP and level in `BattleTeamState`.
  No separate store.
- **Battle Board.** Each hero's card (the `HeroCard` battle variant)
  gets the token chip described under Scope. Its exact look and
  placement are a spec/design decision. It has to fit next to the existing HP and
  level steppers without crowding them.
- **Battle Map (optional).** No change unless there's space. If there
  is, it only displays the count, in the `MapTeamStatusPanel` (see
  Scope). It never edits it.
- **Shared token pattern.** Confuse and Immobilize (and later the
  hero-specific tokens) will need space on the Board's hero cards too.
  The design for +1 Attack should leave room for more tokens next to
  it, rather than taking the only spare slot.

## Constraints
- React + TypeScript frontend, consistent with intents 01-05. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on the Battle Board, whose
  hero cards are already dense. Anything added to the Map must fit
  there too, or it's left out.
- `BattleState` is persisted at schema version 3 (intent 05) and is in
  use. Adding the token count is a schema change to version 4, and an
  existing saved battle **upgrades in place** instead of resetting (as
  intents 04 and 05 do), with every hero's count defaulting to 0.
- Fresh hero state comes from `createInitialHeroState` in
  `lib/battle/reducer.ts` (added with the starting-HP fix). The new
  count should start at 0 there, so new battles and upgraded saves
  agree.

## Value Bounds
- **Floor 0.** A hero can't have negative tokens.
- **Ceiling 9** per hero (decided 2026-10-11). It keeps the count to a
  single digit, which leaves more room on the hero cards.

## Out of Scope (deferred to later phases)
- **Automatic expiry**: removing tokens at the end of an activation, on
  Stun, or anything else. The app doesn't track activations or Stun.
- **Showing a hero's total attack**, or adding the bonus to any value.
  The app shows the token count only.
- **Group shortcuts**: "give a token to every friendly hero in this
  space" for *Spoony Bard*, or "clear all". One tap per token per hero
  (decided 2026-10-10).
- **Who placed the tokens.** It doesn't matter for the rules (they stay
  when the placer is defeated), so the app only stores a count.
- **Token counts on the Win Screen.** Tokens are passing combat state,
  not part of a battle's final result.
- **Confuse and Immobilize.** Separate backlog items, each its own
  intent or PR. This intent only has to leave room for them.
- **3-4 player variant**, deferred along with intents 01-05.

## Session Lifecycle
- Token counts are part of the persisted battle state. Reloading
  mid-battle keeps them.
- Starting a new draft resets every count to 0 along with the rest of the
  battle state.
- Switching between Board and Map doesn't change any count. Both screens
  read the same state.
- A hero being defeated (HP to 0) or respawning doesn't clear its
  tokens. Players clear them by hand if the rules call for it.