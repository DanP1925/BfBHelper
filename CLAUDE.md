# Project guidance for Claude Code

## Git workflow
- Never commit directly to `main`, even for small doc-only changes. Always create a
  branch and open a pull request. A `pre-commit` hook enforces this (blocks the
  commit if run on `main`); it's versioned in `.githooks/` since regular
  `.git/hooks/` isn't tracked by git. Enable it once per clone with:
  `git config core.hooksPath .githooks`
- Use Conventional Commits for commit messages (e.g. `docs:`, `chore:`, `feat:`, `fix:`).

## Docs
- `intent/` and `specs/` each hold one file per feature, named `NN_feature-name.md`
  (e.g. `01_hero-draft-picker.md`), numbered in the order features were scoped. An
  intent doc and its spec share the same number and feature name.
