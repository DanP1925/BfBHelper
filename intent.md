# Intent: BfbHelper

## Problem
Players of "Battle for Biternia" need a companion tool to help with two
recurring pain points during play: coordinating hero drafting (pick/ban)
before a match, and tracking each hero's life/level throughout a game.
Today this is presumably done ad hoc (memory, spreadsheets, pen and paper),
which is slow and error-prone.

## Proposed Outcome
A web app with two core features:

1. **Hero Draft Picker** — a pick/ban tool for the drafting phase, for two
   teams (Team A / Team B) doing an alternating snake draft. Each
   participant can join from their own device and see the draft update in
   real time (picks, bans, whose turn is next) as others act.
2. **Life/Level Displayer** — a live scoreboard-style display of each
   hero's current life and level during a match, synced in real time
   across devices. Each hero starts from a default life/level value
   (pulled from the hero roster); values are then updated manually by a
   player/organizer as the game progresses, and the update is reflected
   live for everyone viewing.

## Users
Players (and possibly spectators/streamers) of Battle for Biternia who
want a shared, visible source of truth for draft state and in-game
life/level during a session.

## Affected Systems
None yet — this is a new, standalone project. No existing systems,
repos, or infrastructure are affected.

## Constraints
- React + TypeScript frontend.
- Needs a backend to support multi-device real-time sync (draft state and
  live life/level updates must propagate to every connected viewer) and
  to store the hero roster in a simple database.
- Hero data (names, default life/level, etc.) is maintained by us —
  no external game API integration for v1.
- Life/level updates are manual (typed in during a game), not pulled
  live from the game itself.
- No persistence of in-progress draft/match state is required for v1 —
  a session's draft and life/level state can reset once everyone
  disconnects or the session ends. Only the hero roster itself
  (reference data) is persisted.

## Open Questions
- What attributes does a hero have beyond default life/level (e.g. role,
  abilities, image/icon)?
- How many heroes per side, and does the app need to enforce/validate the
  snake draft turn order, or just track and display state?
- How do participants join a session/match (e.g. a shared session link or
  code), and is there any auth, or fully open/anonymous use?
- Real-time sync mechanism: WebSockets vs. a managed realtime backend
  (e.g. Firebase/Supabase) — to be decided in the Design stage.
