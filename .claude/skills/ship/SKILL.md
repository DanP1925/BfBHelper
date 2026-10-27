---
name: ship
description: Take the current work in BfbHelper to an open pull request — branch off main, pick the Conventional Commit type and the version bump, format/type-check/test, commit, then confirm before pushing and opening the PR. Use when the user says ship it, open a PR, commit and push, or invokes /ship. Also use when updating an already-open PR with new commits.
---

# Ship

Get the work in front of you onto a branch and into a PR without tripping
any of the repo's rules. CLAUDE.md is the source of truth for those rules;
this skill is the order to apply them in. If the two ever disagree, follow
CLAUDE.md and point out the drift.

Optional argument: a PR title or type hint (e.g. `/ship fix`).

## 1. Pin down what's being shipped

- `git status`, `git diff`, and `git log origin/main..HEAD`. Know exactly
  which changes belong to this PR.
- If the working tree has uncommitted changes that are **not** part of
  this task (someone else's in-progress work, another session's branch),
  don't stash or switch. Branch off main in a worktree instead:
  `git worktree add .claude/worktrees/<name> origin/main -b <branch>`.
- Never commit on `main`. The `pre-commit` hook blocks it only if
  `core.hooksPath` is `.githooks`, so check yourself as well.
- Branch names follow the type: `fix/…`, `feat/…`, `docs/…`, `chore/…`.

## 2. Choose the type, then the bump

Pick the Conventional Commit type from what the diff does, not from how
big it is. Then apply the bump rules (the same before and after 1.0.0; a
major bump only when the user calls for it):

| Situation | Bump |
|---|---|
| `docs:` / `chore:` / `ci:` / `test:` only | none |
| Completes an intent (the last PR of its build plan) | **minor** |
| `fix:` / `perf:` / `refactor:` / `style:` / polish touching `frontend/` | **patch** |
| `feat:` that doesn't finish its intent | **patch** |
| Anything touching `frontend/` with a bump-requiring type | must bump (the `Version check` workflow fails otherwise) |

To decide whether a PR "completes an intent", check it against the
feature's build plan in the session: are all its milestones done once this
PR merges? If unsure, ask. Don't guess a minor.

Bump with `cd frontend && npm version patch --no-git-tag-version` (or
`minor`). That updates `package.json` and `package-lock.json` together.
Never tag. The `Tag release` workflow tags after merge.

If the PR finishes an intent, also check the box in `BACKLOG.md` in this PR,
unless the user wants that as a separate `docs:` PR.

## 3. Verify before committing

Only for PRs that touch `frontend/`. Run from `frontend/`, and never send
output to `/dev/null`:

1. `npm run format`. If it fails with `prettier: command not found`, run
   `npm install` and retry. The edit hook silently skips Prettier when
   it's missing, so don't assume files are formatted.
2. `npm run lint`
3. `npx --no-install tsc --noEmit`
4. `npm test`
5. If the PR changes UI or flows covered in `e2e/`, run
   `npm run test:e2e`. It reuses whatever dev server is on port 3000, so
   make sure that server belongs to *this* checkout. "Executable doesn't
   exist … chromium_headless_shell" means
   `npx --no-install playwright install chromium`, not a code bug.
6. For visual changes, check in the real app (use `/qa-screens`) before
   asking to push. The user will ask "did you verify it?"

Use `npx --no-install` for any project tool. Never run a tool that isn't
declared in `frontend/package.json`.

If anything fails, stop and report the output. Don't paper over it.

## 4. Commit

- Subject: `type: imperative summary`, lowercase after the colon, no
  trailing period. It doubles as the PR title, and the `Version check`
  workflow parses its type.
- Body is optional. If there is one, say *why*.
- End with the attribution trailer from the session's system reminder.
- Prefer one commit per PR unless the user is building up a branch on
  purpose.

## 5. Confirm, then push and open the PR

**Always ask before pushing**: for the first push, for every later push to
an open PR, and every time. Show the branch, the commit subject(s), and the
version change (e.g. `0.5.0 → 0.5.1`, or "no bump: `docs:`") so the user
can approve in one glance.

After approval, run `git push -u origin <branch>`, then
`gh pr create --title "<subject>" --body …`. PR body:

- A short summary in plain prose or a few bullets of **what changed and
  why**, with file names in backticks. Match recent merged PRs
  (`gh pr list --state merged -L 3 --json title,body`).
- One line on the version: "Bumps to 0.5.1 (patch)." or "No version bump:
  `docs:`."
- A `## Test plan` section **only** when there's code to verify. Never
  include one for docs/spec/chore-only PRs.
- End with the PR attribution line from the system reminder.

Give the user the PR URL. If you used a worktree, offer to remove it
(`git worktree remove …`) once it's pushed.

## Updating an open PR

Same checks (steps 3–4), then **ask again** before pushing. If the new
commits change the PR's scope, update the title/body with `gh pr edit`.
Keep the title's type correct, because the version check re-runs when the
title is edited.
