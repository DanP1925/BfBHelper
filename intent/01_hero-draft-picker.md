# Intent: BfbHelper (v1 — Hero Draft Picker, 2-player)

## Problem
Players of **Battle for Biternia** (a physical tabletop board game by
Stone Circle Games, 2-4 players) need a companion tool to help run the
hero draft correctly. The draft order is asymmetric (not a simple
alternating snake, and there are no bans), which makes it easy to get
wrong from memory when setting up a match.

Source of truth for game rules/data: the official rulebook PDF
(`battle-for-biternia_rules_web.pdf`, supplied by the project owner).

## Scope for v1
To keep scope manageable, v1 is split along two axes and covers only:
- **One feature**: the **Hero Draft Picker**.
- **One player count**: the **2-player standard game** only.

Everything else is explicitly deferred to later phases (see "Out of
Scope" below), including the Life/Level Displayer feature and the 3-4
player variant.

## Proposed Outcome
A web app that walks two players through the official 2-player draft
order on a single shared device (one browser, passed back and forth or
viewed by both players at once), letting each side pick from the
19-hero pool in turn, with no bans.

## Draft Order (2-player standard, no bans)
1. Randomly determine initiative; initiative player picks **1** hero.
2. Other player picks **2** heroes.
3. Initiative player picks **2** heroes.
4. Other player picks **2** heroes.
5. Initiative player picks **1** hero.
→ 4 heroes per team, 8 total drafted.

Initiative (step 1) is determined automatically by the app — a
coin-flip triggered when the draft starts — not decided manually
beforehand.

The app enforces this order: only the player whose turn it is can
pick, only remaining (unpicked) heroes are selectable, and the app
auto-advances through the five steps above.

## Hero Roster (19 heroes, from rulebook)
Name — Class/Type:
Agatha Trunch (Minotaur), Baldwin (Bard), Boreas (Hunter), Caligar
(Cleric), Ceralin (Fighter), Cynthia (Fire Mage), Cyrus (Paladin),
Dazeem (Ice Mage), Dolgolae (Yomp), Felix (Duelist), Ken Obi
(Apprentice), Kerrick (Wizard), Kunoichi (Assassin), Longshanks
(Pirate), Motley (Monk), Runika (Artificer), Sedusa (Gorgon), Sterling
(Archer), Vladiator (Barbarian).

For the Draft Picker, name + class/type is sufficient — Base HP and
other per-hero stats are only needed for the Life/Level Displayer
(v2), not v1.

## Users
Players of Battle for Biternia who want a shared, visible source of
truth for draft state during a physical play session — used alongside
the physical board and components, not a replacement for them.

## Affected Systems
None yet — this is a new, standalone project. No existing systems,
repos, or infrastructure are affected.

## Constraints
- React + TypeScript frontend.
- No backend required for v1 — both players share one browser, so
  draft state can live entirely in client-side state. The hero roster
  can be a static data file bundled with the frontend rather than a
  database.
- Hero data (names, class/type) is sourced from the official rulebook
  and entered by us — no external game API for v1.
- In-progress draft state persists across reloads via `localStorage`
  (still no backend/database needed for this — it's local to the one
  device being used).

## Out of Scope (deferred to later phases)
- **Life/Level Displayer** feature (HP/level scoreboard during a
  match) — becomes v2, built on top of v1's foundation.
- **3-4 player variant** (teams of two, or one team of two + one team
  of one) and its draft/setup differences — becomes a later phase
  after both v1 and v2 (2-player) are done.
- Base HP and other per-hero combat stats (needed only for the
  Life/Level Displayer, not the Draft Picker).
- **Multi-device real-time sync** (each player joining from their own
  device via a shareable link, with draft state propagating live to
  every connected viewer) — not needed while both players share one
  device. Not ruled out permanently; may be revisited well after v1 if
  remote/multi-device play becomes a priority.

## Session Lifecycle
No multi-device session concept for v1 — both players use one browser
tab, so there's nothing to join and no accounts or links involved.
- A draft starts when the player explicitly starts one from the app
  (e.g. a "New Draft" action) — not automatically on every page load,
  since state now persists (see below) and an accidental reload
  shouldn't silently wipe an in-progress draft.
- **Normal end**: the draft completes (all 8 picks made per the draft
  order above) — the app shows a read-only "done" view with the final
  two teams, so players can review/screenshot the result.
- Reloading or closing the tab does **not** lose progress — draft
  state (initiative, whose turn it is, picks so far) persists in
  `localStorage` and resumes automatically when the page is reopened.
  This matters more now that a full draft involves several picks back
  and forth, raising the odds of an accidental reload or closed tab
  mid-draft.
- Starting a new draft (via the explicit action above) overwrites the
  persisted state — there's no history of past drafts kept.
