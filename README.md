# BfBHelper

A companion web app for players of *Battle for Biternia*, covering two
recurring pain points during play:

1. **Hero Draft Picker** — a pick/ban tool for the drafting phase (Team A vs.
   Team B, alternating snake draft), synced in real time across devices.
2. **Life/Level Displayer** — a live scoreboard of each hero's current life
   and level during a match, manually updated and synced in real time for
   everyone viewing.

See [intent.md](./intent.md) for the full problem statement, constraints,
and open questions.

## Structure

- `frontend/` — React + TypeScript client.
- `backend/` — server for real-time sync (draft state, life/level updates)
  and hero roster storage.

Both are placeholders pending scaffolding — see the design/spec work for
stack decisions.
