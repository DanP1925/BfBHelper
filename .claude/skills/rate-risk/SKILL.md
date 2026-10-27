---
name: rate-risk
description: Triage a BfbHelper pull request and rate how much review it needs — Low, Medium or High risk — with the reasons, the files that drive the rating, and what to check before merging. Runs in its own read-only context. Use when the user asks how risky a PR (or MR) is, how carefully to review it, whether it's safe to merge, or invokes /rate-risk. Not a line-by-line bug hunt; for that, follow up with /code-review.
argument-hint: "[PR number | branch] (default: the current branch vs main)"
context: fork
background: false
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(git rev-parse:*), Bash(git branch:*), Bash(git fetch:*), Bash(gh pr view:*), Bash(gh pr diff:*), Bash(gh pr list:*), Bash(gh pr checks:*)
---

You rate how risky a BfbHelper pull request is, so the user knows how hard to
review it before merging. You never edit files, commit, push, comment on, approve
or merge anything.

Target: $ARGUMENTS

## 1. Get the change

- **PR number** (e.g. `112`): `gh pr view <n> --json number,title,body,headRefName,baseRefName,additions,deletions,changedFiles,files,commits`,
  then `gh pr diff <n>` and `gh pr checks <n>`.
- **Branch name**: `git fetch -q origin`, then
  `git diff origin/main...<branch> --stat` and the full diff, plus
  `git log origin/main..<branch>`.
- **Nothing given**: the current branch, the same way. If it's `main` with no
  diff, reply only: "Usage: /rate-risk [PR number | branch]. Nothing to review on
  main."

Read the whole diff. For any file that lands in a High row below, also read
enough of the surrounding code (Read/Grep) to judge what the change can break.
Don't rate from file names alone.

## 2. Rate it

The rating is about **what breaks, and for whom, if this PR is wrong**, not
about size or which folders it touches. Almost every feature in this repo
touches `lib/battle/` and the persistence schema, so "touches a risky file"
can't be the test, or every code PR would be High. Judge **how** the risky
code is touched: adding a new thing beside the existing ones, following the
pattern the last few features set, is Medium; changing something players
already rely on is High.

The PR takes the level of its riskiest change, then the modifiers can raise it
one level.

### High: changes existing behavior. Read every line, run everything

- **Changes a rule players already rely on**: edits to existing branches of the
  battle or draft reducers, selectors, `heroSpecificTokens`, `arena`, `iceWall`,
  `bearTrap`, draft `sequence` or `coinFlip`, as opposed to new cases beside
  them. A wrong rule silently misleads players mid-game.
- **Breaks old saves**: a change to `frontend/src/lib/persistence/` that renames,
  removes or retypes a persisted field, or changes the shape without a
  `schemaVersion` bump and a load path for saves from the previous version. Adding
  an optional field with a default, with old saves still loading, is not this.
- **Changes existing hero data**: Base HP, traits or map spaces already in
  `frontend/src/data/heroes.ts` or `mapSpaces.ts` (they must match the cards and
  rulebook). Adding a new hero's data is Medium.
- **Weakens the safety net**: deleted test cases, loosened assertions, `.skip` or
  `.only`, or e2e expectations changed to match new behavior without saying why.
- **Touches the gates**: `.github/workflows/`, `.githooks/`, `.claude/hooks/`,
  `.claude/settings.json`. They're the only checks this solo repo has, and a
  mistake disables them quietly.
- **Dependencies**: added, removed or upgraded packages in
  `frontend/package.json`.
- **Wrong version bump**: a major the user didn't call for, a minor that doesn't
  complete its intent, or a `frontend/` change under a bump-requiring title with
  no bump.
- **A `refactor:` whose tests don't show the behavior is unchanged**, e.g. tests
  rewritten alongside the code instead of passing untouched.

### Medium: new behavior that follows the pattern. Review the logic, check it in the app

Most `feat:` PRs belong here.

- A new token, marker, hero-specific mechanic or screen element that adds new
  state, reducer actions and UI the same way earlier features did (compare with
  the most recent similar feature's PR), with tests for its logic.
- A schema bump that adds fields and still loads saves from the previous version.
- A `refactor:` whose existing tests pass unchanged.
- Component, screen or hook changes (`frontend/src/components/`, `app/`,
  `useBattle`, `useDraft`, `lib/map/` drag-and-drop) beyond one isolated
  component.
- Layout changes: `globals.css`, `useFitGrid`, `useHeightFitColumns`, `gridFit`,
  or anything affecting sizing or overflow. It must still fit the **1280x800**
  laptop, the hard baseline in CLAUDE.md.

### Low: skim it

- Docs only: `intent/`, `specs/`, `plan/`, `BACKLOG.md`, `README.md`,
  `CLAUDE.md`. (Still flag an intent changed without its paired spec, per
  CLAUDE.md.)
- `.claude/skills/`, `.claude/agents/`: tooling for Claude sessions, not the app.
- Tests added with no production change.
- A small fix confined to one component or asset (copy, an image, a style with no
  layout effect), e.g. swapping two heroes' token images.

### Modifiers: raise one level when

- New or changed logic has no test added or updated for it.
- The diff mixes several unrelated changes (e.g. a new feature plus a cleanup of an
  older one), so it's hard to tell what's intended.
- CI checks are failing or haven't run (`gh pr checks`).
- The title isn't a Conventional Commit, or its type doesn't match the diff
  (e.g. `docs:` with `frontend/src/` changes, which skips the version check).

Size alone never raises the level: a 1,500-line feature that follows the pattern
with tests is Medium.

## 3. Report

Keep it short; the user wants a verdict they can act on.

```
**Risk: High | Medium | Low** — one-sentence reason.

**Why**
- The 2–5 changes that drive the rating, each with `path:line` and what could
  break.

**Checks**
- Title/type, version bump (e.g. `1.2.0 → 1.2.1`, or "no bump: `docs:`"), tests
  added/changed, CI status. One line each; mark problems.

**Before merging**
- Concrete steps, matched to the level:
  - High: `/code-review high`, `npm test` and `npm run test:e2e` in
    `frontend/`, plus the specific scenario to try by hand (e.g. "load a game
    saved on main, then switch to this branch").
  - Medium: `/code-review medium`, and `/qa-screens` if anything visual changed.
  - Low: a skim; name anything worth a second look.
```

If a rule question decides whether the logic is right, say so and suggest
`/check-rules <question>` rather than ruling on it yourself. If you couldn't see
part of the change (a binary file, a failed `gh` call), say what's missing and
rate only what you saw.
