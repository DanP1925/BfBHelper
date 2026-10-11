#!/bin/bash
# PostToolUse (Edit|Write): format the edited file with the project's Prettier,
# then lint it with the project's ESLint. One script, not two hooks, because
# hooks on the same matcher run in parallel and ESLint must see the formatted
# file. Exit 2 sends lint errors back to Claude so it fixes them right away.
f=$(jq -r '.tool_input.file_path // empty')
[ -f "$f" ] || exit 0

# Walk up to the package that owns the file (frontend/, in any worktree).
dir=$(dirname "$f")
while [ "$dir" != "/" ] && [ ! -f "$dir/eslint.config.mjs" ]; do dir=$(dirname "$dir"); done
[ -f "$dir/eslint.config.mjs" ] || exit 0
cd "$dir" || exit 0

# --ignore-unknown skips file types Prettier doesn't handle; .gitignore'd files are skipped too.
[ -x node_modules/.bin/prettier ] && node_modules/.bin/prettier --write --ignore-unknown --log-level warn "$f"

case "$f" in *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) ;; *) exit 0 ;; esac
[ -x node_modules/.bin/eslint ] || exit 0
out=$(node_modules/.bin/eslint "$f" 2>&1) || { echo "$out" >&2; exit 2; }
