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
order, letting each side pick from the 19-hero pool in turn, with no
bans. Each participant can join from their own device and see the
draft update in real time as others pick.

## Draft Order (2-player standard, no bans)
1. Randomly determine initiative; initiative player picks **1** hero.
2. Other player picks **2** heroes.
3. Initiative player picks **2** heroes.
4. Other player picks **2** heroes.
5. Initiative player picks **1** hero.
→ 4 heroes per team, 8 total drafted.

Initiative (step 1) is determined automatically by the app — a
coin-flip triggered the moment both players have joined the session —
not decided manually beforehand.

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
- Needs a backend to support multi-device real-time sync (draft state
  must propagate to every connected viewer) and to store the hero
  roster in a simple database.
- Hero data (names, class/type) is sourced from the official rulebook
  and entered by us — no external game API for v1.
- No persistence of in-progress draft state is required for v1 — a
  session's draft state can reset once everyone disconnects or the
  session ends. Only the hero roster itself (reference data) is
  persisted.

## Out of Scope (deferred to later phases)
- **Life/Level Displayer** feature (HP/level scoreboard during a
  match) — becomes v2, built on top of v1's session/real-time
  infrastructure.
- **3-4 player variant** (teams of two, or one team of two + one team
  of one) and its draft/setup differences — becomes a later phase
  after both v1 and v2 (2-player) are done.
- Base HP and other per-hero combat stats (needed only for the
  Life/Level Displayer, not the Draft Picker).

## Session Lifecycle
- A session starts when a participant creates it (gets a shareable
  join code/link) and others join with that code.
- **Normal end**: the draft completes (all 8 picks made per the draft
  order above) — the session moves to a read-only "done" state showing
  the final two teams, so participants can review/screenshot the
  result.
- No auto-expiry on disconnect/inactivity while at least one
  participant is still connected. Once **every** participant has
  disconnected, the session is kept alive for a **5-minute grace
  period** — long enough to tolerate a closed tab, a laptop lid
  closing, or a brief network drop — before it's garbage-collected
  server-side. Reopening the session link in the same browser within
  that window resumes your seat and the in-progress draft (see
  "Joining a Session" below); once the grace period elapses, the
  session and its draft progress are gone.

## Joining a Session
A session is joined via link only — no code-entry UI. The creator
starts a session, gets a unique shareable URL (e.g.
`bfbhelper.app/session/A7X2QK`; codes avoid visually ambiguous
characters like `0`/`O` and `1`/`I`), and sends that link directly to
the other player (text, Discord, etc.). Opening the link joins the
session. No accounts, no login — possession of the link is the only
access control.

The first two people to open the link take the two player seats, in
the order they join. Anyone who opens the link after both seats are
filled joins as a **read-only spectator** — they see the draft update
live but cannot pick. Because there are no accounts, a seat is tied to
a specific browser: refreshing or reopening the link in the same
browser resumes your seat, but opening it in a different browser or an
incognito window counts as a new participant (and would take the
spectator role once both seats are filled).
