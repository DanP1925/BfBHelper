# Spec: BfbHelper v1 — Hero Draft Picker

> **DRAFT.** This reflects architecture decisions made in a scoping
> conversation on 2026-09-24, before any implementation has started.
> Nothing described here has been built yet, and details (especially
> under "Open items for implementation") are expected to change once
> build-out begins. See [intent.md](./intent.md) for the product-level
> problem, scope, and behavior this spec exists to satisfy.

## Architecture Overview
- **Frontend**: React + TypeScript, static build, hosted on
  Vercel or Netlify (exact provider TBD — functionally interchangeable
  here).
- **Backend**: Java + Spring Boot, real-time updates over STOMP
  messaging on top of WebSocket (`@EnableWebSocketMessageBroker`), one
  topic per session (e.g. `/topic/session/{sessionId}`).
- **Database**: PostgreSQL, holding only the static hero roster
  (reference data) — hosted on AWS RDS.
- **Backend hosting**: a single AWS EC2 instance (free-tier eligible,
  e.g. `t3.micro`/`t2.micro`). Chosen partly as a deliberate AWS
  learning goal, not purely for lowest effort.
- **TLS**: Nginx reverse proxy + Let's Encrypt certificate on the EC2
  instance, terminating WSS for the WebSocket connection. Required
  because the frontend is served over HTTPS (Vercel/Netlify default)
  and browsers block a plain `ws://` connection from an `https://`
  page.
- **Domain**: a real domain name is required for the Let's Encrypt
  certificate to be issued against. This is the one recurring cost in
  this plan not covered by AWS's free tier (roughly $10-15/year).

## Real-Time Protocol
- STOMP over WebSocket (Spring's built-in messaging support), not a
  hand-rolled raw WebSocket handler — a session's topic maps directly
  onto "broadcast to both seats + any spectators" without manually
  tracking which connections belong to which session.
- Frontend client library: `@stomp/stompjs`, connecting via a raw
  WebSocket. No SockJS fallback transport — not needed for two people
  on modern browsers/home networks, and it's one fewer dependency to
  debug.

## Session & Participant Identity
- Session code: 6 uppercase characters, excluding visually ambiguous
  characters (`0`/`O`, `1`/`I`). Generated server-side on session
  creation; regenerated on the (statistically negligible) chance of a
  collision.
- No accounts. On first load of a session link, the client generates a
  random participant token and stores it in `localStorage`, scoped to
  that session id.
- The server assigns "seat 1" / "seat 2" to the first two distinct
  tokens it observes for a session, in connection order. A
  reconnecting client presents its stored token to resume its seat.
- A different browser or incognito window has no stored token, so it
  is treated as a new participant — it takes the next open seat, or
  becomes a spectator if both seats are already filled.
- Once both seats are filled, further connections are attached to the
  session's broadcast topic as read-only spectators (no pick
  authority).
- **Disconnect grace period**: when the last remaining connection to a
  session drops, an in-memory timer starts. If nobody reconnects
  within **5 minutes**, the session (draft state, seat assignments,
  topic) is torn down and garbage-collected. If any participant
  reconnects (same browser, valid token) before the timer elapses, the
  timer is cancelled and the session continues as if nothing happened.
  A reconnect after the timer fires is treated as a brand-new session
  attempt against a now-invalid session id.

## Data Model (Hero Roster)
- A PostgreSQL table holding the 19-hero roster: name, class/type only
  (per `intent.md`, that's sufficient for the Draft Picker — no
  combat stats like HP in v1; those are deferred to the Life/Level
  Displayer, v2).
- No persistence of in-progress draft state — draft state (picks made,
  whose turn it is, initiative result) lives only in backend memory
  for the life of the session, per `intent.md`'s constraint.

## Deployment
- Backend: Spring Boot app packaged as a jar, deployed to the EC2
  instance, run under a process supervisor (e.g. systemd) so it
  restarts on crash or instance reboot. Nginx sits in front for TLS
  termination and reverse-proxying the WebSocket upgrade.
- Database: AWS RDS Postgres instance, reachable from the EC2 instance
  via security group rules — not publicly exposed.
- Frontend: static build deployed to Vercel or Netlify.

## Open Items for Implementation (not yet decided)
- EC2 provisioning approach (manual console setup vs. IaC).
- CI/CD — manual deploy vs. something like GitHub Actions.
- Hero roster seed data and schema/migration tooling (e.g. Flyway vs.
  manual).
- Draft board UI layout and visual design.
- Domain registrar choice.
- Choice between Vercel and Netlify for the frontend.
