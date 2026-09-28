# BfBHelper

A companion web app for players of *Battle for Biternia*, a physical
tabletop board game. The goal: a group should be able to play a full game
with just the physical cards — everything else (draft order, life/level
tracking, and any other non-card bookkeeping) is handled by this app. v1
works toward that with two recurring pain points during play:

1. **Hero Draft Picker** — walks two players through the game's official
   2-player draft order (asymmetric, no bans) so it's set up correctly. Both
   players share a single device/browser; draft state persists across
   reloads via `localStorage`, no backend needed. Scoped in
   [intent/01_hero-draft-picker.md](./intent/01_hero-draft-picker.md) /
   [specs/01_hero-draft-picker.md](./specs/01_hero-draft-picker.md).
2. **Life/Level Displayer** — a live scoreboard of each hero's current life
   and level during a match. Also part of v1; its own intent/spec docs
   haven't been written yet.

The 3-4 player variant is deferred to a later phase, after v1 (2-player)
covers both features above.

## Structure

- `frontend/` — React + TypeScript client.
- `backend/` — placeholder; not needed for the Hero Draft Picker (single
  device, client-side state only), but may be needed for the Life/Level
  Displayer depending on how that feature is scoped.

Both are placeholders pending scaffolding — see the design/spec work for
stack decisions.
