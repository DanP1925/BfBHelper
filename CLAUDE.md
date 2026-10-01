# Project guidance for Claude Code

## Git workflow
- Never commit directly to `main`, even for small doc-only changes. Always create a
  branch and open a pull request. A `pre-commit` hook enforces this (blocks the
  commit if run on `main`); it's versioned in `.githooks/` since regular
  `.git/hooks/` isn't tracked by git. Enable it once per clone with:
  `git config core.hooksPath .githooks`
- Use Conventional Commits for commit messages (e.g. `docs:`, `chore:`, `feat:`, `fix:`).
- Always confirm with the user before pushing or updating an open pull request —
  every time, not just for the first push of a task.

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
- Manual QA and responsive/viewport-sensitive work is primarily checked against two
  screens: a 13.3" laptop display (2560x1600) and a 24" monitor (2560x1440). Treat
  these as the reference sizes for anything that depends on available width/height
  (e.g. fit-to-viewport layouts) — no sign-off on other sizes is assumed by default.
