# Spec: BfbHelper

Source: [intent.md](./intent.md)

## Summary
A web app for "Battle for Biternia" players with two real-time,
multi-device features: a two-team snake-draft hero picker, and a live
hero life/level scoreboard. Both features share the concept of a
**session** (a match/draft that participants join and see updated live).

## Architecture

```
bfb-helper/
├── client/          # React + TypeScript (Vite)
└── server/          # Node + Express + Socket.IO + SQLite
```

- **Client**: React + TypeScript, built with Vite. Connects to the
  server over WebSockets (Socket.IO client) for real-time updates, and
  over REST for one-off reads (e.g. fetching the hero roster).
- **Server**: Node + Express (REST for hero roster CRUD) + Socket.IO
  (real-time session state). Single process, self-hosted.
- **Database**: SQLite, used only for the **hero roster** (reference
  data: name, default life, default level, and other hero attributes).
  Accessed via a lightweight query layer (e.g. `better-sqlite3`).
- **Session state** (draft picks/bans, live life/level values) lives
  **in-memory on the server**, keyed by session code. Per intent.md, no
  persistence is required for v1 — a session resets when the server
  restarts or all participants leave. Not backed by SQLite.

## Data Model

### Hero (SQLite, persisted)
| field | type | notes |
|---|---|---|
| id | string/uuid | |
| name | string | |
| defaultLife | number | starting life for the life/level displayer |
| defaultLevel | number | starting level |
| role | string (nullable) | open attribute, e.g. "Tank" — placeholder until confirmed |
| iconUrl | string (nullable) | placeholder until confirmed |

### Session (in-memory, ephemeral)
| field | type | notes |
|---|---|---|
| code | string | short join code, e.g. 6 chars, generated on session create |
| teams | { A: HeroId[], B: HeroId[] } | picked heroes per team |
| bans | HeroId[] | banned heroes (shared pool) |
| turn | { team: 'A' \| 'B', action: 'pick' \| 'ban' } | whose turn, snake order |
| liveState | { heroId → { life: number, level: number } } | current values, seeded from hero defaults when a hero is picked |

## Features

### 1. Hero Draft Picker
- Any participant creates a session and gets a shareable session code/link.
- Others join the same session via the code; each sees the same draft
  state, live, via Socket.IO (`draft:update` events).
- Snake draft order alternates ban/pick turns between Team A and Team B
  (exact ban/pick sequence configurable, default: ban, ban, pick, pick,
  pick, pick, pick, pick, repeat — **placeholder, confirm actual format
  with owner**).
- Server is authoritative: it validates it's the correct team's turn and
  the hero isn't already picked/banned before applying an action and
  broadcasting the update.
- No enforced hero-per-side cap in v1 beyond what draft order implies;
  configurable later.

### 2. Life/Level Displayer
- Once a session's draft is complete (or independently, if a session is
  started directly for display), each drafted hero appears on a
  scoreboard with its current life/level, seeded from the hero's
  `defaultLife`/`defaultLevel`.
- Any participant can update a hero's life/level (manual input); the
  server broadcasts `life:update` to all connected clients in that
  session so the scoreboard stays in sync.
- No history/log of changes in v1 — only current values.

## Out of Scope (v1)
- Authentication/accounts — sessions are open to anyone with the code.
- Persistence of draft/match history across sessions.
- External game API/log integration for automatic life/level updates.
- Enforcing exact snake-draft rules beyond the configurable default
  order (no per-hero role limits, etc.).

## Open Items for Owner Sign-off
These were left open in intent.md and given reasonable defaults above —
confirm or correct before/while building:
1. Hero attributes beyond life/level (`role`, `iconUrl` above are
   placeholders).
2. Exact snake draft ban/pick sequence and heroes-per-side count.
3. Session join mechanism confirmed as "code/link, no auth" — OK for v1?

## Verification / Definition of Done (feeds CLAUDE.md)
- `npm test` (or equivalent) passes in both `client/` and `server/`.
- Two browser windows joined to the same session code show draft picks
  and life/level edits propagate to both within ~1s.
- Server rejects an out-of-turn pick/ban (returns an error, does not
  broadcast a state change).
