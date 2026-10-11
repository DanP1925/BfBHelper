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
- Pre-1.0 bump rules:
  - **Minor** (`0.X.0`): an intent is completed. If an intent spans several PRs,
    bump in the one that finishes it.
  - **Patch** (`0.x.Y`): a `fix:`, `perf:`, `refactor:` or polish PR that changes
    `frontend/` but doesn't complete an intent.
  - **No bump**: `docs:`, `chore:`, `ci:` or `test:`-only changes.
- **1.0.0** = everything in `BACKLOG.md` is done.
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
- A feature's UI mockup is a Claude design artifact linked from its spec under a
  "UI Design Reference" section; source art assets it uses live in `specs/<Feature Name>/`.
- `plan/` holds one `NN_feature-name.md` per feature too, same numbering as its
  intent/spec. It's a living build checklist for the Build phase — written before
  implementation starts and checked off incrementally in the PR(s) that do that work.

## Testing
- Manual QA and responsive/viewport-sensitive work is checked against two screens,
  given here as physical resolution (logical/CSS px in parentheses): a 13.3" laptop
  display, 2560x1600 (1280x800 at 2x scaling), and a 24" monitor, 2560x1440 (no
  scaling assumed). The 13.3" laptop is the hard baseline — anything that depends on
  available width/height (e.g. fit-to-viewport layouts) must work there; the 24"
  monitor is secondary. No sign-off on other sizes is assumed by default.
