# BfBHelper

A companion web app for players of *Battle for Biternia*, a physical
tabletop board game. The goal: a group should be able to play a full game
with just the physical cards. Everything else (draft order, HP/level, gold,
structures, positions on the board, initiative, tokens) is tracked by this
app.

Live at **https://bf-b-helper.vercel.app/**. Current version: see
`"version"` in [`frontend/package.json`](./frontend/package.json).

## Features

All features target the 2-player game on a single shared device; state
persists across reloads via `localStorage`, no backend needed.

| # | Feature | Status |
|---|---|---|
| 01 | **Hero Draft Picker**: walks both players through the official 2-player draft order (asymmetric, no bans), after a coin flip for initiative. | Shipped (v0.1.0) |
| 02 | **Battle Board**: both teams side by side, with their drafted heroes, 3 Towers, 1 Bit and gold. | Shipped (v0.2.0) |
| 03 | **Battle Controls**: ±1 taps and direct entry for gold, hero HP/level and structure HP. | Shipped (v0.3.0) |
| 04 | **Battle Map**: the shared game board, with draggable hero tokens, zoom/pan, and gold piles. | Shipped (v0.4.0) |
| 05 | **Initiative Indicator**: a badge on both battle screens; tap it to pass initiative each round. | Shipped (v0.5.0) |
| 06 | **+1 Attack tokens**: a per-hero token count. | Scoped |

Each feature has an intent ([`intent/`](./intent)), a spec
([`specs/`](./specs)) and a build checklist ([`plan/`](./plan)), all named
`NN_feature-name.md`. Ideas and playtest feedback not yet scoped live in
[`BACKLOG.md`](./BACKLOG.md); finishing it marks **v1.0.0**. The 3-4 player
variant is deferred until after that.

## Structure

- `frontend/`: Next.js (App Router) + TypeScript client, statically
  exported. Vitest for unit tests, Playwright for e2e. See
  [`frontend/README.md`](./frontend/README.md) for scripts and deployment.
- `backend/`: placeholder, not needed so far.
- `intent/`, `specs/`, `plan/`: per-feature docs (see above).

## Getting started

```sh
cd frontend
npm install
npm run dev        # local dev server
npm test           # Vitest
npm run test:e2e   # Playwright
```
