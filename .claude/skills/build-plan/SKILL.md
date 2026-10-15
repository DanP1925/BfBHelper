---
name: build-plan
description: Write plan/NN_feature-name.md, the living Build-phase checklist for a BfbHelper feature, from its intent and spec. It covers PR structure, an architecture file tree, numbered milestones (M1, M2, …) and tests/QA, matching plans 01-05. Use when the user asks to plan the build or implementation of an intent/spec, or invokes /build-plan NN. Also use to check items off or update a plan as work lands.
---

# Build Plan

Turn `specs/NN_*.md` into `plan/NN_*.md`: a checklist that's written before
implementation starts and checked off in the PR(s) that do the work. Plans
03–05 are the style reference: read the most recent one in full first.

Argument: the feature number (e.g. `/build-plan 06`). If it's omitted, use the
highest-numbered spec with no matching plan.

**In Plan Mode:** the plan-mode file *is* this document's content, not a
meta-plan about writing it. Exiting plan mode then writes it to
`plan/NN_*.md`.

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

- **One PR** for a small feature (a few files, one state change). The plan
  ships in the same PR as the code, like 05.
- **Several PRs** for anything bigger. The plan ships first as its own
  `docs:` PR, and the milestones are grouped under `### PR B — …`,
  `### PR C — …` headings, like 04: data/state layer first, then a thin
  end-to-end tracer slice, then widen to the full spec.
- When milestones touch truly independent files, say so. That's what
  makes parallel subagent builds safe. Split on file/import independence,
  not on task size.

## 3. Write the doc

File: `plan/NN_<same-name-as-intent>.md`:

```markdown
# Plan: BfbHelper vN — <Feature Name>

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/NN_x.md](../intent/NN_x.md) and [../specs/NN_x.md](../specs/NN_x.md).
> Check items off in the PR(s) that do the work, same convention as
> [NN-1_y.md](NN-1_y.md).

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
  `npm version minor --no-git-tag-version` (→ 0.X.0), plus checking off
  the item in `BACKLOG.md`. Earlier PRs of a multi-PR plan each bump
  patch (`/ship` handles that).

## 4. Keeping it alive

- In each build PR, check off the milestones that PR completes, in that
  same PR. When reality diverged from the plan or spec, note how in the
  item (e.g. "32px tall, not 38px; spec updated to match") and update the
  spec too.
- Ship a new plan with `/ship` (`docs: add plan NN for <feature>` when it
  ships on its own). The next step is building milestone M1.
