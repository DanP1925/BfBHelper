# Intent 17: Runika's Artifacts

## Problem
Runika's trait gives her three Artifacts: Battle Fist, Auto Deflector and
Shield Amulet. Each one is either face-up or face-down. A face-up Artifact
gives her a bonus, and several of her power cards gain an extra effect
while a given Artifact is face-up. The
app doesn't track them anywhere. Players using the app instead of the
physical tokens have to remember which Artifacts are still face-up. That
breaks the product vision of playing with just the cards.

The backlog's hero playability review lists Artifacts as a hero-specific
feature: they only matter when Runika is in the battle. They're the last
hero-specific token on the list. Unlike every earlier token, Runika
always has all three, so the only thing that changes is which side faces
up.

## Scope
This phase covers only:
- **Three named Artifacts on Runika**: Battle Fist, Auto Deflector and
  Shield Amulet. Each is face-up or face-down. All three start face-up.
- **Hero-specific.** The Artifacts only exist while Runika is in the
  battle, drafted on either team. This follows the backlog's visibility
  rule (decided 2026-10-10). She counts as in the battle at 0 HP and in
  the respawn area too.
- **Runika's own card only.** No other hero gets them, on either team.
- **Shown and edited on the Battle Board:**
  - **Always shown** (decided 2026-10-18). All three sit on Runika's card
    for the whole battle, each as its own icon with its name in the
    tooltip and accessible label. Visible text labels don't fit the
    card at 1280x800 (decided 2026-10-18, spec 17). A tap flips one
    between face-up and face-down. A face-down Artifact is greyed out.
  - **Each Artifact's bonus is shown, not applied** (decided
    2026-10-18). The tooltip and accessible label also give its bonus,
    e.g. "Battle Fist: +1 Attack", so players don't need the physical
    token to know what it does. Players apply the bonus at the table, as
    with Favored Enemy's +2 Attack.
  - **Not part of intent 09's token row or "+" picker** (decided
    2026-10-18). They're never added or removed, only flipped, so they
    don't count toward the row's 8-token sizing.
  - **One tap per Artifact** (decided 2026-10-18). There's no "flip all
    face-up" control for Rest or respawn. That's at most three taps, and
    it keeps the one-tap-per-token rule every earlier token follows.
  - **Always editable** (decided 2026-10-18), including when Runika is at
    0 HP or in the respawn area, where the card flips them all face-up.
  - Their exact look, icons and placement on the card are settled in the
    spec/design. There's no Artifact art in the repo.
- **Shown on the Battle Map** (decided 2026-10-18). Display only, in the
  team status panel on Runika's token line, next to any other tokens she
  holds. Only **face-up** Artifacts are shown, each as its own icon, so a
  face-down one drops off the line. This is the same "shown only while
  held" rule as every other token. Each icon's tooltip and accessible
  label give the Artifact's name and bonus, as on the Board. Not on the
  hero tokens on the board.
  The Map stays read-only for every token (decided 2026-10-15). QA of the
  seven-token case (intent 13) shows the panel has room for the extra
  icons at 1280x800.
- **Manual only.** The app never flips an Artifact on its own: not when
  an enemy hits Runika, not when she Rests or respawns, and not when
  she's defeated. This is the same manual-tracker approach as intents
  03-16.

## Proposed Outcome
Runika is drafted, and her Battle Board card shows all three Artifacts
face-up. An enemy hits her, and her player taps Auto Deflector, which
greys out and drops off her line on the Map. Next round a melee attack
hits her, and she gets no Auto Deflector defense. Then she plays a power
card and checks her card: Battle Fist is still face-up, so she gets +1
Attack and the card's extra effect. Later she Rests, and her player taps
Auto Deflector face-up again.

## Rules (from the rulebook and Runika's card)
Runika's hero card, *Master Armiger*:

> Runika has three Artifacts, which start the game face-up. When an enemy
> hits you with an attack, choose and flip one face-down. When you Rest or
> respawn, flip them all face-up.

- The box has **3 Runika Artifacts** (Battle Fist, Auto Deflector, Shield
  Amulet) (p. 3).
- **Each face-up Artifact gives Runika a bonus,** printed on its token
  (confirmed 2026-10-18; the rulebook's art on p. 3 shows it):
  - **Battle Fist:** +1 Attack.
  - **Auto Deflector:** +1 defense vs melee attacks.
  - **Shield Amulet:** +1 defense vs magic attacks.
- Some of Runika's power cards also gain an extra effect while a given
  Artifact is face-up (confirmed 2026-10-18). No power card places a
  token.
- The rulebook's hero summary calls her a "passive self-boost from
  artifact tokens".

The app shows which Artifacts are face-up and what each one gives. Players
flip them on hits, Rests and respawns, and apply the bonuses and the power
cards' extra effects themselves.

## Users
Same as intents 01-16: players of Battle for Biternia using the app
alongside the physical cards.

## Affected Systems
- **Battle state.** Adds Runika's three face-up/face-down states to the
  persisted `BattleState`, next to her HP, level and tokens in
  `BattleTeamState`. No separate store.
- **Hero-specific visibility.** The Artifacts follow the backlog's
  visibility rule through Runika, on her own card only.
- **Battle Board.** The `HeroCard` battle variant gains the three
  Artifacts on Runika's card, outside intent 09's token row and picker.
- **Battle Map.** The `MapTeamStatusPanel` token line shows an icon for
  each of Runika's face-up Artifacts. Display only.

## Constraints
- React + TypeScript frontend, consistent with intents 01-16. No backend.
- Must fit the 13.3" laptop (1280x800 CSS px) on both the Battle Board and
  the Battle Map, including Runika's card when she also holds several
  tokens.
- `BattleState` is persisted and in use. Adding the Artifacts is a schema
  change, and an existing saved battle **upgrades in place** instead of
  resetting (as intents 04-16 do), with all three face-up.
- Fresh hero state comes from `createInitialHeroState` in
  `lib/battle/reducer.ts`. The Artifacts should start face-up there, so
  new battles and upgraded saves agree.

## Out of Scope (deferred to later phases)
- **Flipping Artifacts automatically** on an enemy hit, a Rest, a respawn
  or a defeat.
- **A "flip all face-up" control** for Rest or respawn (decided
  2026-10-18).
- **Applying the Artifacts' bonuses,** e.g. a running total of Runika's
  Attack or defense. The app doesn't track attacks or defense at all.
- **Showing or applying the power cards' extra effects,** on Runika's
  card or anywhere else.
- **Showing face-down Artifacts on the Map.** Only face-up ones appear on
  her token line.
- **A marker on the Map's hero tokens,** or editing the Artifacts on the
  Map. The Map stays read-only for every token (decided 2026-10-15).
- **Artifacts on the Win Screen.** They're combat state, not part of a
  battle's final result.
- **Boreas's Bear Trap.** It's a separate backlog item.
- **The token-display review** in `BACKLOG.md`'s follow-ups. It was
  waiting on Artifacts as the last hero-specific token, so it can start
  once this ships, but it's its own piece of work.
- **3-4 player variant**, deferred along with intents 01-16.

## Session Lifecycle
- The Artifacts' states are part of the persisted battle state. Reloading
  mid-battle keeps them.
- Starting a new draft resets them, all face-up, along with the rest of
  the battle state.
- Switching between Board and Map doesn't change them. Both screens read
  the same state.
- Runika being defeated (HP to 0), respawning, resting or moving doesn't
  flip them. They only change when a player taps one.
