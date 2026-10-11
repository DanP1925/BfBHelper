#!/bin/bash
# Stop: type-check frontend/ when the turn left uncommitted changes there.
# Exit 2 keeps Claude working to fix the errors; it blocks only once per turn
# (stop_hook_active) so a fix that doesn't land can't loop forever.
input=$(cat)
[ "$(jq -r '.stop_hook_active' <<<"$input")" = "true" ] && exit 0

root=$(git -C "$(jq -r '.cwd' <<<"$input")" rev-parse --show-toplevel 2>/dev/null) || exit 0
dir="$root/frontend"
[ -x "$dir/node_modules/.bin/tsc" ] || exit 0
[ -n "$(git -C "$root" status --porcelain -- frontend)" ] || exit 0

# next typegen writes the route types (e.g. LayoutProps) tsc needs in a fresh checkout.
out=$(cd "$dir" && node_modules/.bin/next typegen >/dev/null 2>&1; node_modules/.bin/tsc --noEmit 2>&1) \
  || { echo "tsc --noEmit failed in frontend/:" >&2; echo "$out" >&2; exit 2; }
