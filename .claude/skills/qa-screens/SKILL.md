---
name: qa-screens
description: Screenshot a BfbHelper screen (home, draft, battle board, map) at the two QA viewports, 1280x800 laptop (must pass) and 2560x1440 monitor, check for overflow, and show the results. Use after any visual/layout change, before asking to push UI work, when the user asks "did you verify it?", asks to see or screenshot the app, or invokes /qa-screens.
---

# QA Screens

Check UI work in the real app at the screens CLAUDE.md signs off on, instead
of trusting unit tests.

Optional argument: the screen (and a name), e.g. `/qa-screens map` or
`/qa-screens battle respawn-stacked`.

## Viewports

These are in logical CSS px. "2560x1600" in the docs means the laptop at
2x scaling, not a 2560px-wide CSS viewport.

| Label | CSS viewport | Scale | Role |
|---|---|---|---|
| laptop | 1280×800 | 2x | **Hard baseline.** It must fit and look right. |
| monitor | 2560×1440 | 1x | Secondary |

## Steps

1. **Server.** Check what's on port 3000:
   `lsof -nP -iTCP:3000 -sTCP:LISTEN`. Find its working directory with
   `lsof -p <pid> | grep cwd`. If it belongs to another checkout or
   worktree, you'd be screenshotting the wrong code. Start this checkout's
   server on another port (`npm run dev -- -p 3001`, then pass
   `--base http://localhost:3001`), or ask before killing the other one.
   If nothing is running, start `npm run dev` in the background from this
   checkout's `frontend/`. It needs `node_modules`, so run `npm ci` first
   in a fresh worktree.

2. **Shoot.** From `frontend/`:

   ```sh
   node ../.claude/skills/qa-screens/shoot.mjs --screen <home|draft|battle|map> --name <slug>
   ```

   - The presets reach each screen through the real flow: Start Draft, 8
     picks, Start Battle, then Map. Each viewport gets a fresh browser
     context, so saved games in localStorage don't leak in.
   - Files land in the **main checkout's** `screenshots/` (ignored via
     `.git/info/exclude`), even from a worktree, named
     `<slug>-<w>x<h>.png`. Use a slug that describes the change, e.g.
     `attack-chip-1280x800.png`.
   - Exit code 2 means the page overflows the laptop viewport. Treat that
     as a failure for fit-to-viewport screens (battle board, map).
   - If a state the preset can't reach is needed (a hero at 0 HP, tokens
     set, a dialog open), copy the script to the scratchpad and add the
     clicks there. Don't grow the shared presets for one-off states. If
     Playwright errors with "Executable doesn't exist", run
     `npx --no-install playwright install chromium`.

3. **Look at them.** Read the laptop PNG yourself first. Check for
   clipping, overlap, wrapping labels, misaligned panels, scrollbars, and
   anything the change was meant to fix. Then check the monitor PNG for
   awkward stretching or tiny content. The Next.js dev indicator (the "N"
   badge in the corner) is dev-only, so ignore it.

4. **Report.** For each viewport: fits or overflows, plus anything that
   looks wrong, with specifics ("Player 2 panel's last row is cut off at
   1280x800"). `open` the laptop screenshot so the user sees it. Don't
   claim a change is verified unless you actually looked at the images.

5. **Clean up.** Stop any dev server you started, unless the user is
   still iterating.
