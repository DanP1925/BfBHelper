# Project guidance for Claude Code

## Git workflow
- Never commit directly to `main`, even for small doc-only changes. Always create a
  branch and open a pull request. A `pre-commit` hook enforces this (blocks the
  commit if run on `main`); it's versioned in `.githooks/` since regular
  `.git/hooks/` isn't tracked by git. Enable it once per clone with:
  `git config core.hooksPath .githooks`
- Use Conventional Commits for commit messages and PR titles (e.g. `docs:`, `chore:`,
  `feat:`, `fix:`). The `Version check` workflow reads the PR title's type.
- Always confirm with the user before pushing or updating an open pull request —
  every time, not just for the first push of a task.

## Versioning
- Semantic Versioning. The source of truth is `"version"` in `frontend/package.json`
  (keep `frontend/package-lock.json` in sync). Bump it in the PR that ships the change
  with `cd frontend && npm version patch --no-git-tag-version` (or `minor`), which
  updates both files. The `Version check` workflow fails a PR whose title type needs
  a bump but whose `frontend/` changes left the version unchanged.
- Bump rules (the same before and after 1.0):
  - **Minor** (`1.X.0`): an intent is completed. If an intent spans several PRs,
    bump in the one that finishes it.
  - **Patch** (`1.x.Y`): a `fix:`, `perf:`, `refactor:` or polish PR that changes
    `frontend/` but doesn't complete an intent.
  - **No bump**: `docs:`, `chore:`, `ci:` or `test:`-only changes.
  - **Major**: only when the user calls for it.
- **1.0.0** (intent 18, 2026-10-18) = a game can be played with only the physical
  cards: every hero's needs are met. The polish left over from it is part of
  the 2.0.0 work.
- **2.0.0** (goal set 2026-10-26) = a game can be played without the rulebook
  beside it: the right balance of manual and automatic, with automation and
  QoL where they cut human error. Its items are in `BACKLOG.md`'s "Toward 2.0".
- After the PR merges, the `Tag release` workflow tags the merged commit on `main`
  with an annotated `vX.Y.Z` tag (if that tag doesn't exist yet). Don't tag by hand.
- Past intents were tagged after the fact: `v0.1.0`–`v0.3.0` for intents 01–03,
  and `v0.4.0` for intent 04, together with this scheme.

## Docs
- `intent/` and `specs/` each hold one file per feature, named `NN_feature-name.md`
  (e.g. `01_hero-draft-picker.md`), numbered in the order features were scoped. An
  intent doc and its spec share the same number and feature name.
- When editing an `intent/NN_*.md`, check its paired `specs/NN_*.md` for staleness
  too (e.g. architecture that no longer matches a simplified scope) — they drift silently.
- A feature's UI design is on the canvas, a Claude design artifact linked from its spec under a
  "UI Design Reference" section; source art assets it uses live in `specs/<Feature Name>/`.
  Screens on the canvas are "artboards". Older docs call the canvas "the mockup".
- The rulebook PDF (source of truth for game rules) is at
  `reference/battle-for-biternia_rules_web.pdf` in the main checkout. It's copyrighted,
  so `reference/` is excluded via `.git/info/exclude` and never committed. A fresh clone
  needs it copied in by hand, plus a `/reference/` line in that exclude file.
- `plan/` holds the build checklists for features 01–18, kept as history. From
  feature 19 on, build plans aren't written to disk: `/build-plan` produces the
  plan-mode plan only, and the intent and spec are the committed record.
- `BACKLOG.md` items are at most 3 sentences: what and why. Open questions, code
  pointers, rulebook quotes and QA findings go in the item's intent once it's
  scoped. The intro and version notes at the top can be longer.
  Each item carries a stage label, defined at the top of `BACKLOG.md`. In "Toward 2.0",
  items are grouped under one `### <Stage>` subheading per label in use, earliest
  stage first (`Triage` at the top, `Done` at the bottom): when a label changes, move the item to its new group.
- Feature branches never edit `BACKLOG.md`: parallel agents moving items between
  stage groups conflict every time. Instead, when an item's intent, spec or PR
  lands, or its PR merges (or a new item is wanted), end the reply with a line
  like `BACKLOG: <item> → Implement`. The main session applies these in batches
  in a dedicated `docs: update backlog stages` PR, off `main`, when the user asks.

## Testing
- Formatting is Prettier (`frontend/.prettierrc.json`, width 100): run
  `npm run format` in `frontend/` before committing hand edits.
- Claude Code hooks (`.claude/settings.json`, scripts in `.claude/hooks/`) run Prettier and
  ESLint on every edited file, and `tsc --noEmit` at the end of a turn that left uncommitted
  `frontend/` changes. They only run in Claude sessions; CI doesn't lint or type-check yet.
- Manual QA and responsive/viewport-sensitive work is checked against two screens,
  given here as physical resolution (logical/CSS px in parentheses): a 13.3" laptop
  display, 2560x1600 (1280x800 at 2x scaling), and a 24" monitor, 2560x1440 (no
  scaling assumed). The 13.3" laptop is the hard baseline — anything that depends on
  available width/height (e.g. fit-to-viewport layouts) must work there; the 24"
  monitor is secondary. No sign-off on other sizes is assumed by default.
