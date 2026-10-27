# Plan: BfbHelper v10 — Draft Pick Animation

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/10_draft-pick-animation.md](../intent/10_draft-pick-animation.md)
> and [../specs/10_draft-pick-animation.md](../specs/10_draft-pick-animation.md).
> Check items off in the PR(s) that do the work, same convention as
> [09_death-mark.md](09_death-mark.md).

## Context

The intent and spec are merged (intent in PR #62, spec and the intent's
fade-and-flash rework in PR #64). The canvas ("BfbHelper — App Flow",
version 67) has:
- the "Draft — Pick Animation" artboard, a looping fade-out, glide and
  team-color slot flash
- the "Draft Results" artboard (renamed from "Results"), with the
  permanent "VS", a single "Start Battle →", and a playable versus
  entrance

This plan turns them into a build checklist on top of the current
codebase: `DraftBoardScreen`, `HeroPool` (`useFitGrid`), `TeamPanel`,
`HeroCard`'s `pool`/`slot` variants, `ResultsScreen`, and `page.tsx`'s
`view` state. There's no new dependency, no new screen, and no draft or
battle state change.

**Structure: several PRs.** The two moments have different risks and
only meet in `page.tsx`. So:
- **PR A, this plan** (`docs:`), on its own.
- **PR B, the pick animation and the static Draft Results changes**
  (M1-M12):
  - `motionAllowed()`, `useDraftPickAnimation`, and the fade-out, glide
    and slot flash on the Draft Board.
  - The permanent "VS", and "← New Draft" removed from Draft Results.
  - The pick is judged on its own here: the measuring timing, rapid taps,
    and the flash against `TeamPanel`'s `overflow: hidden`.
  - The final pick still goes straight to Draft Results, as today.
  - Patch bump.
- **PR C, the versus finale** (M13-M22): the hook's `onFinalPickLanded`,
  `page.tsx`'s `draftOutro`, `ResultsScreen`'s entrance and skip layer,
  the e2e spec, and the intent-closing minor bump.

**Versions.** `main` is at 0.8.1, and intent 09's PR D will take 0.9.0.
So PR B is the next patch and PR C the next minor *at the time each
merges*: 0.9.1 and 0.10.0 if intent 09 closes first, otherwise 0.8.2 and
0.9.0. `/ship` reads `frontend/package.json`, so it's whatever `main`
holds then.

**Parallel-safe split.** Inside PR B, the pick track (M1-M4, files under
`lib/motion.ts`, `HeroCard/` and `DraftBoardScreen/`) and the Draft
Results track (M5-M6, `ResultsScreen/` plus one line in `page.tsx`)
share no files or imports. Inside PR C, `ResultsScreen`'s entrance
(M16-M17) is independent of the hook and `page.tsx` work (M13-M15) until
`page.tsx` passes `playIntro`.

## Architecture

```
frontend/src/
  lib/
    motion.ts                   # new: motionAllowed(), PICK_FADE_MS, POOL_GLIDE_MS, SLOT_REVEAL_MS (B)
    motion.test.ts              # new                                                   (B)
  app/page.tsx                  # stops passing onNewDraft to ResultsScreen             (B)
                                #   += draftOutro "none" | "landing" | "versus", final-pick
                                #   detection, one DraftBoardScreen branch, playIntro (C)
  components/
    HeroCard/HeroCard.tsx       # pool <button> += data-pool-hero; slot root += data-slot-hero (B)
    screens/DraftBoardScreen/
      useDraftPickAnimation.ts  # new: beforePick snapshot, rAF, fade-out stand-in, FLIP glide,
                                #   slot reveal with team-color flash, cleanup         (B)
                                #   += onFinalPickLanded, running-reveal count         (C)
      useDraftPickAnimation.test.tsx  # new                                            (B, C)
      DraftBoardScreen.tsx      # rootRef on .screen; onPick → beforePick then onPick  (B)
                                #   += onFinalPickLanded prop                          (C)
    screens/ResultsScreen/
      ResultsScreen.tsx         # -= onNewDraft + button; += permanent .vs             (B)
                                #   += playIntro, onIntroEnd, .intro, skip layer       (C)
      ResultsScreen.module.css  # -= .newDraftLink; += .vs                             (B)
                                #   += keyframes, .intro, .skipLayer                   (C)
      ResultsScreen.test.tsx    # new                                                   (B, C)
frontend/e2e/
  draft-to-battle.spec.ts       # += "VS" visible on Draft Results                      (B)
  draft-pick-animation.spec.ts  # new: finale, skip, reload, reduced motion            (C)
```

## Milestone Checklist

### PR B — Pick animation and static Draft Results

- [x] M1. `lib/motion.ts` (new): `motionAllowed()` is true only when
      `window.matchMedia` and `Element.prototype.animate` exist and
      `(prefers-reduced-motion: reduce)` doesn't match. It's read at call
      time, never cached. Also `PICK_FADE_MS = 150`,
      `POOL_GLIDE_MS = 300`, `SLOT_REVEAL_MS = 600`, with the spec's doc
      comment.
- [x] M2. `HeroCard`: the `pool` variant's `<button>` gets
      `data-pool-hero={hero.id}`. The `slot` variant's root (the
      `cardClass` div, not the `result` variant) gets
      `data-slot-hero={hero.id}`. No visual change.
      (Set on `result` cards too, unconditionally: the hook only searches
      inside the Draft Board, so they're never touched.)
- [x] M3. `screens/DraftBoardScreen/useDraftPickAnimation.ts` (new), with
      the spec's signature, minus `onFinalPickLanded` (PR C):
      - `beforePick(heroId)`: only if `motionAllowed()` and
        `currentTurnPlayer !== null`, snapshot every `[data-pool-hero]`
        rect under `rootRef`, the tapped card's `<img>` `src` and rect, and
        the picking side.
      - After the commit, wait one `requestAnimationFrame`, then run three
        animations:
        - **Fade-out:** a `position: fixed` stand-in `<img>` on
          `document.body` (`pointer-events: none`, z-index above the
          board) fades 1 → 0 with `scale(0.92)` over `PICK_FADE_MS`, then
          is removed.
        - **Glide:** cancel each remaining card's running animations,
          measure its new rect, and animate
          `translate(dx, dy) scale(s)` → `none`, `transform-origin: top
          left`, `delay: PICK_FADE_MS`, `fill: "backwards"`.
        - **Slot reveal:** `[data-slot-hero=heroId]` animates opacity
          0 → 1 and a ring plus a glow that peak at 0.4, in the
          side's `--color-p1`/`--color-p2` (read with `getComputedStyle`),
          over `SLOT_REVEAL_MS`, same delay and fill.
      - Unmount: cancel every animation it started and remove any
        stand-ins.
      (The ring is an `outline` 3px inside the card, not a `box-shadow`
      spread, which `.slotList` clipped on edge slots; only the glow is a
      shadow. Easing is set per keyframe so the flash peaks at 40%. The
      glide's `transformOrigin: "0 0"` is in its own keyframes, and the
      stand-in copies the card image's computed `border-radius`. The rAF
      does every read (team color, glide rects) before any write. Spec
      updated.)
- [x] M4. `DraftBoardScreen`: `rootRef` on the `.screen` div. The pool's
      `onPick` calls `beforePick(heroId)` then `onPick(heroId)`.
      `HeroPool`'s and `TeamPanel`'s props don't change.
- [x] M5. `ResultsScreen`: drop the `onNewDraft` prop, the "← New Draft"
      button and `.newDraftLink`; the footer keeps only "Start Battle →".
      `page.tsx` stops passing `draft.returnToStart` to it.
- [x] M6. `ResultsScreen`: the permanent
      `<div className={styles.vs} aria-hidden="true">VS</div>` between the
      two `TeamResults`. It's 56px `--font-heading` in `--color-gold` with
      a soft glow and a thin `--color-border` rule above and below, as on
      the canvas, and centered vertically beside the grids.
- [x] M7. Spec open item: confirm in the browser that the
      `requestAnimationFrame` measurement runs after `useFitGrid`'s
      re-render and before the first paint, so there's no one-frame jump
      on a pick that changes the pool's card size (e.g. the pick that
      drops the pool to a new column count). If it does jump, measure
      again in a second frame or hook into `useFitGrid`'s result, and
      update the spec.
      **No jump.** Sampled every frame of all 7 glides in a draft at
      1280x800, 2560x1440, 1100x900 and 1600x700: the first painted frame
      always has each card at its old spot. The pool's card size never
      changed during a draft at any of those sizes, so the `scale` path
      is in place but rarely hit.
- [x] M8. Spec open item: rapid tapping. Three quick picks should overlap
      cleanly, with no slot left invisible, no stand-in left on
      `document.body`, and each tap picking the card drawn under it.
      **Clean.** Three taps 60ms apart picked the three cards under the
      pointer, and left every slot at opacity 1 with no running animation
      or stand-in.
- [x] M9. Spec open item: the slot flash against `TeamPanel`'s
      `.slotList` `overflow: hidden`. The 3px ring should be fully visible
      and the soft glow not look cut off. If it does, shrink the glow or
      pad `.slotList` (without changing `useHeightFitColumns`' fit), and
      update the spec.
      **The shadow ring was clipped** on each panel's first slot (top and
      left edges), so the ring became an inset `outline` (see M3). Checked
      with the animation frozen at its peak: the ring shows on all four
      sides, and the clipped soft glow reads fine.
- [x] M10. Spec open item: Draft Results at 1280x800 with the "VS". No
      horizontal overflow, and the teams still fit without scrolling.
      **Fits** at 1280x800 and 2560x1440, with no page or grid scroll.
- [x] M11. Tests:
      - `motion.test.ts` (new): false without `matchMedia`, false
        without `Element.prototype.animate`, false when reduce matches,
        true otherwise; re-reads on each call
      - `useDraftPickAnimation.test.tsx` (new), with `matchMedia` and
        `Element.prototype.animate` stubbed (the stub records keyframes
        and options and returns a fake `Animation` with `cancel` and
        `onfinish`):
        - a pick animates every card after the picked one with
          `delay: PICK_FADE_MS`, and the slot with the picking side's color
        - a stand-in is appended, then removed when its animation
          finishes
        - nothing is animated with reduced motion, or once
          `currentTurnPlayer` is null
        - a second pick cancels the first glide
        - unmount cancels everything and removes stand-ins
      - `DraftBoardScreen` / `page.test.tsx`: picking still updates the
        pool and slots immediately in jsdom (no motion there)
      - `ResultsScreen.test.tsx` (new): the "VS" is rendered and
        `aria-hidden`, there's no "New Draft" button, and "Start Battle →"
        calls `onStartBattle`
      - `e2e/draft-to-battle.spec.ts`: still drafts 8 heroes with
        animations on; += the "VS" is visible on Draft Results
- [x] M12. PR B checks: `tsc --noEmit`, ESLint, full Vitest and Playwright
      green. Manual QA at 1280x800 (`/qa-screens`, plus a screen recording
      or stepped screenshots for motion):
      - each pick: the card fades in place, then the gap closes, and the
        slot flashes teal for Player 1 or red for Player 2
      - the pool's size change on a smaller pool glides with no jump (M7)
      - rapid taps (M8) and the flash at the panel edge (M9)
      - with OS reduce motion on, picks are instant as today
      - Draft Results shows the "VS" and only "Start Battle →" (M10)

      Tune `PICK_FADE_MS`, `POOL_GLIDE_MS` and `SLOT_REVEAL_MS` here (spec
      open item): fast enough for full-speed tapping, slow enough that
      everyone sees the flash. Patch bump.
      Checked by script on a dev server on port 3100 (port 3000 belonged
      to another checkout): frame sampling, stepped and frozen-at-peak
      screenshots, and reduced motion (no animations or stand-ins). The
      starting durations are kept until a playtest says otherwise. jsdom
      has no `ResizeObserver`, `matchMedia` or `animate`: a no-op
      `ResizeObserver` now lives in `src/test/setup.ts`, `matchMedia` in a
      shared `src/test/stubMatchMedia.ts`, and the hook test stubs
      `animate` and `getBoundingClientRect` itself.

### PR C — Versus finale

- [x] M13. `useDraftPickAnimation`: += `onFinalPickLanded`. A ref counts
      running slot reveals. When it drops to 0 while `currentTurnPlayer`
      is null, call `onFinalPickLanded` once. If no reveal started (no
      motion, or the slot wasn't found), call it right away.
      (Built simpler: the hook calls `onFinalPickLanded`, if passed, as
      soon as no pick's frame is pending and no slot reveal (a `reveals`
      set in `Running`) is playing. The page only passes it while
      `"landing"`, so "is the draft done" lives there, not in the hook. One
      `settle()` check runs after every render, at the end of each frame,
      and when a reveal ends. Unmount clears the callback ref before
      cancelling, so a cancelled reveal never reports a landing.)
- [x] M14. `DraftBoardScreen`: += `onFinalPickLanded?: () => void`,
      passed to the hook.
- [x] M15. `page.tsx`:
      - += `draftOutro` state (`"none" | "landing" | "versus"`, the spec's
        doc comment).
      - The `onPick` wrapper sets `"landing"` when the tap completes the
        draft and `motionAllowed()`. "Completes the draft" is
        `draft.currentStep === STEP_SEQUENCE.length &&
        draft.picksRemainingThisStep === 1`, importing `STEP_SEQUENCE` from
        `lib/draft/sequence` (the spec's `TOTAL_STEPS` is the local
        constant in `DraftBoardScreen`, not exported).
      - `DraftBoardScreen` is rendered from one branch,
        `draft.phase === "drafting" || draftOutro === "landing"`, before
        the done-phase branches, with
        `onFinalPickLanded={() => setDraftOutro("versus")}`.
      - The `draft.phase` effect also resets `draftOutro` to `"none"`.
      - `ResultsScreen` gets `playIntro={draftOutro === "versus"}` and
        `onIntroEnd={() => setDraftOutro("none")}`.
      (Instead of a new branch, the done-phase block is skipped while
      `"landing"` (`draft.phase === "done" && draftOutro !== "landing"`),
      so the existing final `return <DraftBoardScreen />` serves both
      drafting and landing. "Completes the draft" became a selector,
      `isFinalPickNext` (`getTotalPicks === TOTAL_PICKS - 1`), exposed by
      `useDraft`, instead of re-deriving it from step counts in the page.
      The two callbacks are stable `useCallback`s, and
      `onFinalPickLanded` is passed only while `"landing"`.)
- [x] M16. `ResultsScreen` entrance: += `playIntro`, `onIntroEnd`. While
      `playIntro`, the root gets `.intro`. Its keyframes sit inside
      `@media (prefers-reduced-motion: no-preference)` and use
      `animation-fill-mode: both`:
      - Player 1's team sweeps in from the left and Player 2's from the
        right (~500ms).
      - The "VS" lands from 2.6x with a slight overshoot (~300ms from
        ~400ms).
      - The footer fades up last (from ~800ms).

      The footer's `onAnimationEnd` calls `onIntroEnd`, with a timeout
      fallback at the entrance's total length.
- [x] M17. `ResultsScreen` skip: while `playIntro`, a transparent
      full-screen `<button className={styles.skipLayer}
      aria-label="Skip intro">` is autofocused and calls `onIntroEnd`.
      After it goes, focus moves to "Start Battle →".
      (The timeout fallback is `INTRO_MS + 200` = 1300ms. `.screen` is
      `position: relative; overflow: hidden`, so the skip layer covers it
      and the teams sweeping in from off-screen don't scroll the page.)
- [x] M18. Spec open item: tune the versus timings in the browser at
      1280x800 against the canvas's "Draft Results" artboard.
      **Kept the canvas's timings** (500ms sweep, "VS" at 400ms for 300ms,
      footer at 800ms for 300ms). In stepped screenshots, the teams arrive,
      then the "VS" lands, then "Start Battle →" appears, matching the
      artboard.
- [x] M19. Spec open item: decide whether one e2e run uses Playwright's
      `reducedMotion: "reduce"` to cover that path (expected: yes, in the
      new spec only, via `test.use`).
      **Yes:** `draft-pick-animation.spec.ts` has a `reducedMotion: "reduce"`
      describe block. Its "Draft Complete" checks use `exact: true`,
      because `getByText` ignores case and would also match the Draft
      Board's "Draft complete" banner.
- [x] M20. Tests:
      - `useDraftPickAnimation.test.tsx`: `onFinalPickLanded` fires once,
        after the last reveal finishes, only once the draft is done, and
        right away when no reveal started
      - `ResultsScreen.test.tsx`:
        - with `playIntro` there's a "Skip intro" button; clicking it
          calls `onIntroEnd`
        - `animationend` on the footer calls it
        - the timeout fallback calls it (fake timers)
        - without `playIntro` there's no skip layer and the "VS" is still
          shown
      - `page.test.tsx`:
        - with `motionAllowed` false (jsdom), the 8th pick goes straight
          to a settled Draft Results with no skip layer
        - with `lib/motion` mocked true and `animate` stubbed, the Draft
          Board stays up after the 8th pick ("Draft complete" banner)
          until the last reveal finishes, then Draft Results shows with
          the skip layer
        - New Draft during `"landing"` resets it
      - `e2e/draft-pick-animation.spec.ts` (new):
        - after 8 picks, Draft Results appears with "VS". A tap skips the
          entrance, then "Start Battle →" works.
        - a reload on Draft Results shows it settled, with no "Skip
          intro" button
        - under `reducedMotion: "reduce"`, Draft Results appears settled
          straight away
        - existing specs that draft and then click "Start Battle →" still
          pass: Playwright waits out the skip layer
- [x] M21. PR C checks: `tsc --noEmit`, ESLint, full Vitest and
      Playwright green. Manual QA at 1280x800 (`/qa-screens`):
      - the 8th hero fades into its slot and flashes on the Draft Board
        ("Draft complete" banner), then Draft Results plays the entrance
      - the teams sweep in, the "VS" lands, and "Start Battle →" appears
        last
      - a tap anywhere skips straight to the settled screen and doesn't
        start the battle
      - a reload shows the settled screen with no animation
      - with OS reduce motion on, the draft ends straight on the settled
        Draft Results
      - "New Draft" on the Draft Board during the last pick's animation
        starts a clean draft
      Checked by script on this worktree's dev server on port 3100: stepped
      screenshots of the last hero flashing under the "Draft complete"
      banner and of the entrance; a tap where "Start Battle →" will appear
      skips without starting the battle; New Draft mid-landing leaves no
      animations or stand-ins.
- [x] M22. `npm version minor --no-git-tag-version` in the same PR (the
      next minor, see Context). Intent 10 has no `BACKLOG.md` item to
      check off. It came straight from the user. The parked coin-flip and
      turn-passing items stay open.
