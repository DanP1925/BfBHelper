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
persists across reloads via `localStorage`, no backend needed. Since
**v1.0.0** every hero's tokens and abilities are tracked, so a game can be
played with only the physical cards.

| Area | Intents | Shipped |
|---|---|---|
| **Draft**: the official 2-player draft order after a coin flip for initiative, ending on a versus entrance. | 01, 10 | v0.1.0, v0.10.0 |
| **Battle Board and Controls**: both teams side by side with heroes, Towers, Bit and gold; ±1 taps and direct entry for every value. | 02, 03 | v0.2.0, v0.3.0 |
| **Battle Map**: the shared game board with draggable hero tokens, zoom/pan and gold piles. | 04 | v0.4.0 |
| **Initiative Indicator**: a badge on both battle screens, tapped to pass initiative each round. | 05 | v0.5.0 |
| **Status tokens**: +1 Attack, Confuse, Immobilize, Death Mark, Shield, Stone and Chill. | 06–09, 11–13 | v0.6.0–v0.13.0 |
| **Hero abilities**: To the Pain Arena, Favored Enemy, Ice Wall, Runika's Artifacts and Bear Trap. | 14–18 | v0.14.0–v1.0.0 |

Each feature has an intent ([`intent/`](./intent)), a spec
([`specs/`](./specs)) and a build checklist ([`plan/`](./plan)), all named
`NN_feature-name.md`. Next up is **v2.0.0**: playing without the rulebook,
through quality-of-life fixes and automation. Bugs, ideas and playtest
feedback for it live in [`BACKLOG.md`](./BACKLOG.md). The 3-4 player variant
is deferred.

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
