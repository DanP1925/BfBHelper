---
name: build-plan
description: Write the Build-phase plan for a BfbHelper feature from its intent and spec, as the plan-mode plan only (no file in the repo or on disk). It covers PR structure, an architecture file tree, numbered milestones (M1, M2, …) and tests/QA, matching plans 01-18. Use when the user asks to plan the build or implementation of an intent/spec, or invokes /build-plan NN.
---

# Build Plan

Turn `specs/NN_*.md` into a build checklist that's written before
implementation starts. Plans 03–05 in `plan/` are the style reference: read
the most recent one in full first.

**No plan file.** From feature 19 on, plans aren't written to `plan/` or
anywhere else on disk, committed or not: the intent and spec carry the
lasting value. The plan lives only in the session. `plan/01–18` stay in the
repo as history; don't edit them or add new ones.

Argument: the feature number (e.g. `/build-plan 20`). If it's omitted, use
the highest-numbered spec whose feature isn't built yet (check `BACKLOG.md`).

**Plan Mode:** write the plan as the plan-mode file's content (enter Plan
Mode first if you aren't in it). That file *is* the plan, not a meta-plan
about writing one. Once approved, track the milestones in the session's task
list while building.

## 1. Inputs

- `intent/NN_*.md`, `specs/NN_*.md`, and the code the spec names. Check
  every path, type and function in the spec against the current
  `frontend/src`. If the spec is stale (renamed files, a schema version
  already used), list the drift and fix the spec as part of this work,
  telling the user.
- **Spec Open Items stay open.** Carry each one into a milestone ("decide
  X in the browser at 1280x800"). Don't silently decide them here.
- If the spec doesn't exist, stop and offer `/build-spec NN`.

## 2. Decide the PR structure

State it in Context, with the reason:

- **One PR** for a small feature (a few files, one state change), like 05.
- **Several PRs** for anything bigger. The milestones are grouped under
  `### PR A — …`, `### PR B — …` headings, like 04: a thin end-to-end
  tracer slice first, then widen to the full spec.
- When milestones touch truly independent files, say so. That's what
  makes parallel subagent builds safe. Split on file/import independence,
  not on task size.

## 3. Write the plan

```markdown
# Plan NN: <Feature Name>

Build plan for the feature scoped in intent/NN_x.md and specs/NN_x.md.

## Context
(What's merged so far: intent/spec PR numbers, canvas state. What this
extends. **Structure:** one PR or several, and why.)

## Architecture
(A fenced file tree of frontend/src, plus e2e/, with a short comment per
touched file: `# += PASS_INITIATIVE`, `# new: { holder, onPass }`.)

## Milestone Checklist
### Data & state layer
- [ ] M1. `path`: concrete change.
### UI
### Tests & verification

## Follow-ups / Open Items   (optional: things noticed but out of scope)
```

Milestones:

- Number them M1, M2, … across the whole plan. One concrete, checkable
  change per item, named by file.
- **Tests & verification** always includes:
  - fixture bumps if a schema version changes, and the new unit tests
    listed by behavior (reducer action, migrations from *every* older
    version, validation rejects, hook behavior, component, screen wiring)
  - a new or extended `e2e/*.spec.ts` for the user-visible flow, including
    surviving a reload and a Board⇄Map switch if state is shared
  - `tsc --noEmit`, ESLint, full Vitest and Playwright green
  - manual QA at 1280×800 (`/qa-screens`), with the specific things to
    look at as sub-bullets, including "an existing save upgrades in place"
    when there's a migration
- **Last item of the intent-closing PR:**
  `npm version minor --no-git-tag-version` (→ 1.X.0), plus checking off
  the item in `BACKLOG.md`. Earlier PRs of a multi-PR plan each bump
  patch (`/ship` handles that).

## 4. While building

- When reality diverges from the plan, update the spec in the build PR:
  the spec is the committed record, the plan isn't.
- The next step after approval is building milestone M1.
