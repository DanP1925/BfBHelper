---
name: build-spec
description: Write specs/NN_feature-name.md for a BfbHelper feature from its intent/NN doc. It turns the product-level intent into architecture grounded in the real frontend code (state, data model, logic, layout, UI Design Reference), matching specs 01-05. Use when the user asks to write, draft, or scope the spec for an intent, or invokes /build-spec NN. Also use to refresh a spec that has drifted from its intent.
---

# Build Spec

Turn `intent/NN_*.md` (what and why) into `specs/NN_*.md` (how). The intent
is the authority on scope. The spec only decides architecture. Specs 01–05
are the style reference: read the most recent one in full before writing.

Argument: the feature number (e.g. `/build-spec 06`). If it's omitted, use the
highest-numbered intent with no matching spec.

## 1. Gate on the intent

- Read `intent/NN_*.md` in full, plus the `BACKLOG.md` item it links to.
- **Open questions block the spec.** If the intent has an "Open Questions"
  section, or anything still undecided at the product level, stop. List
  those items and offer `/build-intent` to settle them first. Don't make
  product decisions inside the spec. Pure implementation choices are
  different: they belong in the spec's own Open Items.
- Rule details (tokens, statuses, HP, turn order) come from the rulebook
  at `reference/battle-for-biternia_rules_web.pdf` in the main checkout. It's
  local-only, so from a worktree use `$(git rev-parse --git-common-dir)/../reference/`.
  For a precise question, use the `rules-lawyer` agent. If the rulebook
  contradicts the intent, flag it to the user rather than silently picking
  a side.

## 2. Ground it in the code

A spec names real files, types and functions. Before writing, read what
the intent's "Affected Systems" touches. Usually that's:

- `frontend/src/lib/battle/` (types, reducer) and `lib/useBattle.ts`
- `frontend/src/lib/persistence/` (schema versions, migrations, validation)
- `frontend/src/components/` and `components/screens/`
- `frontend/src/app/page.tsx` (wiring)
- `frontend/src/data/heroes.ts` (per-hero data)

Recurring decisions to make explicitly, following earlier specs:

- **Persistence:** does any persisted shape change? If so, bump the
  battle or draft schema version and write the migration. `loadPersisted`
  runs **one** migration step, so every older version's migration must
  land on the new current version (see spec 05's `upgradeV1ToV2` /
  `upgradeV2ToV3` pattern). State the default for upgraded saves, and
  validate the new field.
- **State:** new reducer actions and `useBattle` mutators, and what they
  don't touch.
- **Layout:** where it goes on which screens. It must fit the 13.3" laptop
  at 1280×800 CSS px without taking vertical space from the Board panels
  or the Map's board area. Say so explicitly when a change risks that.
- **Reuse:** point at existing helpers to export and reuse rather than
  duplicate.

## 3. Write the doc

File: `specs/NN_<same-name-as-intent>.md`. Structure, following 02–05:

```markdown
# Spec: BfbHelper vN — <Feature Name>

> **DRAFT.** Architecture for intent NN's scope. Build-out has not started
> yet. See [../intent/NN_x.md](../intent/NN_x.md) for the product-level
> problem, scope, and behavior this spec exists to satisfy.

## Architecture Overview
## State Management
## Data Model
## <Feature> Logic
## Layout
## Assets                (only if new art; source art goes in specs/<Feature Name>/)
## UI Design Reference
## Deployment
## Open Items for Implementation
```

Style:

- Bullets with concrete names (`useBattle`, `BattleState.schemaVersion: 4`)
  and short TS snippets for new types.
- Cite the intent section that justifies each decision ("per intent's
  Constraints").
- Say what *doesn't* change, as well as what does.
- **UI Design Reference:** link the shared Claude design artifact
  "BfbHelper — App Flow" (https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK).
  Name the artboard(s) and describe what the canvas shows, plus the
  "prototype for visual direction only; a revised canvas wins" caveat. If
  the canvas hasn't been updated for this feature yet, write that in this
  section and list it as an Open Item. Don't invent a description of art
  that doesn't exist.
- **Deployment:** usually "No change from v1–vN-1".
- **Open Items:** implementation choices you couldn't settle on paper
  (e.g. "check in the browser at 1280x800"). When they're decided later,
  strike them through and add **Decided:**.

## 4. Check, then ship

- Re-read the intent against the spec. Every in-scope behavior should
  have a home, and nothing out of scope should have crept in. The
  `doc-drift-checker` agent can do this pass.
- If writing the spec showed the intent is wrong or vague, raise it, and
  fix the intent in the same PR only with the user's OK.
- Ship with `/ship` as `docs: add spec NN for <feature>`. No version bump.
- The next step is `/build-plan NN`.
