# Spec: BfbHelper v1 — Hero Draft Picker

> **DRAFT.** This reflects architecture decisions for the current,
> simplified v1 scope (same-device, 2-player, no backend). Nothing
> described here has been built yet, and details (especially under
> "Open items for implementation") are expected to change once
> build-out begins. See
> [../intent/01_hero-draft-picker.md](../intent/01_hero-draft-picker.md)
> for the product-level problem, scope, and behavior this spec exists
> to satisfy.

## Architecture Overview
- **Frontend only**: React + TypeScript, static build, hosted on
  Vercel or Netlify (exact provider TBD — functionally interchangeable
  here).
- **No backend, no database.** Both players share one browser, so all
  draft state lives in client-side state — nothing to run or host
  server-side for v1.

## State Management
- Draft state (initiative result, whose turn it is, picks made so far)
  lives in React state during a session.
- On every state change, the current draft state is serialized to
  `localStorage`. On page load, the app checks for existing persisted
  state and resumes from it instead of starting fresh — see
  intent.md's "Session Lifecycle" for when persisted state is read vs.
  overwritten (a reload resumes; explicitly starting a new draft
  overwrites).

## Data Model (Hero Roster)
- The 19-hero roster (name, class/type) is a static TypeScript data
  file bundled with the frontend — no database, no API call. Per
  intent.md, name + class/type is sufficient for the Draft Picker; no
  combat stats (e.g. HP) are needed until the Life/Level Displayer
  (v2).

## Draft Logic
- The five-step draft order from intent.md is encoded as a fixed
  sequence of (side, pick count) steps: `[(initiative, 1), (other, 2),
  (initiative, 2), (other, 2), (initiative, 1)]`.
- On starting a new draft, a client-side coin flip picks which side
  (Player 1 / Player 2) has initiative, then the sequence above drives
  whose turn it is and how many picks they get before advancing.
- The UI enforces the current step: only unpicked heroes are
  selectable, and only by the side whose turn it is.

## UI Design Reference
- A first-pass visual mockup of the draft flow (start screen, the
  interactive draft board, and the read-only results screen) is
  tracked as a Claude design artifact:
  https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK
- This is a prototype for visual direction only — not implemented
  code — and is expected to evolve once build-out begins.

## Deployment
- Frontend: static build deployed to Vercel or Netlify. That's the
  entire deployment surface for v1 — no server, database, or domain/
  TLS setup required.

## Open Items for Implementation (not yet decided)
- `localStorage` schema/versioning (e.g. how a future format change
  should handle already-persisted state).
- Hero roster data file format and how it's authored/entered.
- Final draft board layout and visual design (see "UI Design
  Reference" above for the current mockup), including how the
  coin-flip/initiative result is presented.
- Choice between Vercel and Netlify for the frontend.
