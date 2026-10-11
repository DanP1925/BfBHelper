#!/bin/bash
# PostToolUse (Edit|Write): lint the edited JS/TS file with the project's own
# ESLint. Exit 2 sends the errors back to Claude so it fixes them right away.
f=$(jq -r '.tool_input.file_path // empty')
case "$f" in *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) ;; *) exit 0 ;; esac
[ -f "$f" ] || exit 0

# Walk up to the package that owns the file (frontend/, in any worktree).
dir=$(dirname "$f")
while [ "$dir" != "/" ] && [ ! -f "$dir/eslint.config.mjs" ]; do dir=$(dirname "$dir"); done
[ -x "$dir/node_modules/.bin/eslint" ] || exit 0

out=$(cd "$dir" && node_modules/.bin/eslint "$f" 2>&1) || { echo "$out" >&2; exit 2; }
