# Spec: BfbHelper v10 — Draft Pick Animation

> **BUILT.** Architecture for intent 10's scope, all built (plan 10's
> PRs B and C). See [../intent/10_draft-pick-animation.md](../intent/10_draft-pick-animation.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as v1-v9: React + TypeScript, Next.js,
  static build, no backend.
- No new screen and no new dependency. The motion is hand-built with the
  browser's Web Animations API (`element.animate`) and plain CSS
  keyframes. `frontend/package.json` gains nothing.
- Two pieces, matching the intent's two moments:
  - **The pick** (Draft Board): a new `useDraftPickAnimation` hook owned
    by `DraftBoardScreen`. It plays three short animations per pick:
    1. The picked card fades out where it was.
    2. The rest of the pool glides into place, using the FLIP technique
       (measure **F**irst, measure **L**ast, **I**nvert with a transform,
       **P**lay back to none).
    3. The hero's team slot fades in with a flash in the team's color.

    Nothing travels between the pool and the team panel (intent's
    Scope, decided 2026-10-16).
  - **The versus finale** (Draft Results screen): CSS keyframes on
    `ResultsScreen`, turned on by a new `playIntro` prop, plus a
    permanent "VS" element between the two teams.
- **Presentation only.** Per intent's Constraints, no draft or battle
  state, reducer, selector or storage key changes. `useDraft`,
  `draftReducer` and `lib/persistence/` are untouched. The only new
  state is one non-persisted value in `page.tsx` (see State Management).
- **Why not the View Transitions API.** It would animate the pick almost
  for free: name each card, wrap the pick in
  `document.startViewTransition`, and the browser cross-fades and moves
  everything. It was rejected because of how it handles taps while
  running. During a transition the page is covered by snapshot
  pseudo-elements: either taps are swallowed (blocking input, against
  intent's "Animations never block input"), or, with
  `pointer-events: none`, they hit the real DOM at its *final* layout
  while the player sees cards mid-glide. A tap could then pick a
  different hero than the one under the finger, and the draft has no
  undo. Web Animations move the real elements with transforms, and
  transforms are hit-tested, so a tap always lands on the card that's
  drawn there.
- React 19's `<ViewTransition>` component isn't in the stable 19.2
  release the app uses, so it isn't an option either.

## State Management
- **Draft and battle state:** unchanged. A pick is dispatched and
  persisted the instant it's tapped, exactly as today (intent's Scope:
  "the pick is saved the instant it's tapped"). Animations hold no state,
  so a reload mid-animation resumes with the pick made (intent's Session
  Lifecycle).
- **One new piece of page state, in `page.tsx`, not persisted:**
  ```ts
  /** What plays between the 8th pick and a settled Draft Results screen
   * (intent/10). "landing": the Draft Board stays up until the last hero
   * has appeared in its slot. "versus": the Draft Results screen plays
   * its entrance. "none": normal rendering, which is also what a reload
   * starts with. */
  const [draftOutro, setDraftOutro] = useState<"none" | "landing" | "versus">("none");
  ```
  - `page.tsx` wraps `onPick`. When the tap completes the draft
    (`draft.isFinalPickNext`, from a new `isFinalPickNext` selector:
    `getTotalPicks(state) === TOTAL_PICKS - 1`)
    and `motionAllowed()` (see Pick Logic) is true, it sets `"landing"`
    in the same handler, so it lands in the same render as the 8th pick.
    With reduced motion it stays `"none"`, and the app goes straight to
    a settled Draft Results screen, as today (intent's Scope).
  - While `draftOutro === "landing"`, `page.tsx` keeps rendering
    `DraftBoardScreen` even though `draft.phase === "done"`. The board is
    valid in that state with no changes: `TurnBanner` already shows
    "Draft complete" when `currentTurnPlayer` is null, and
    `draftReducer` already ignores picks once the draft is done, so
    stray taps on the last 11 pool cards do nothing.
  - **One render path for the Draft Board.** The done-phase branches are
    skipped while `"landing"` (`draft.phase === "done" && draftOutro !==
    "landing"`), so `page.tsx`'s final `return <DraftBoardScreen />`
    serves both drafting and landing. The element type and tree position
    don't change between the 8th pick's render and the next, so React
    keeps the screen mounted and the final pick's animation isn't cut
    off.
  - `DraftBoardScreen` gains `onFinalPickLanded?: () => void`. The hook
    calls it, while it's passed, as soon as no pick animation is pending
    or playing. `page.tsx` passes a stable `setDraftOutro("versus")`
    callback only while `"landing"`, so "is the draft done" stays with
    the page.
  - `ResultsScreen` gets `playIntro={draftOutro === "versus"}` and
    `onIntroEnd={() => setDraftOutro("none")}`. It's called when the
    entrance finishes or is skipped.
  - The existing `draft.phase` effect, which already resets `view` and
    `mapCamera` when the draft leaves "done", also resets `draftOutro`
    to `"none"`. So pressing the Draft Board's "New Draft" during the
    last pick's animation can't leak it into the next draft.
  - Because it isn't persisted, a reload always starts at `"none"`, and
    the Draft Results screen shows settled, "VS" included (intent's "It
    plays only right after the final pick").
- `useBattle` still activates on `draft.phase === "done"`, during
  `"landing"` too. That's harmless: it only builds and saves the fresh
  `BattleState` slightly earlier than the Draft Results screen appears.

## Data Model
- No change. No type in `lib/draft/types.ts`, `lib/battle/types.ts` or
  `lib/persistence/schema.ts` changes, and neither schema version moves.
- `HeroCard` adds DOM hooks for the animation to find cards, not data:
  - The `pool` variant's `<button>` gets `data-pool-hero={hero.id}`.
  - The `slot` and `result` variants' root gets `data-slot-hero={hero.id}`.
    The hook only searches inside the Draft Board, so result cards are
    never touched.

## Pick Logic
- **`motionAllowed()`** (new, `frontend/src/lib/motion.ts`):
  ```ts
  /** True when the app may animate: the browser supports the Web
   * Animations API and the OS "reduce motion" setting is off. Read at
   * the moment an animation would start, not cached, so changing the OS
   * setting mid-draft takes effect on the next pick. False in jsdom
   * (no matchMedia, no element.animate), so unit tests never animate. */
  export function motionAllowed(): boolean;
  ```
  The file also holds the starting durations. The versus entrance timing
  lives in its CSS. All of them get tuned in the browser (Open Items).
  - `PICK_FADE_MS = 150`: the picked card fading out.
  - `POOL_GLIDE_MS = 300`: the pool closing the gap, starting once the
    fade ends.
  - `SLOT_REVEAL_MS = 600`: the slot fading in and flashing, also
    starting once the fade ends.

  So a pick settles about 750ms after the tap.
- **`useDraftPickAnimation`** (new,
  `components/screens/DraftBoardScreen/useDraftPickAnimation.ts`). It's
  imperative DOM work, contained in one hook:
  ```ts
  function useDraftPickAnimation(options: {
    pool: Hero[];
    /** null once the draft is done. */
    currentTurnPlayer: PlayerId | null;
    onFinalPickLanded?: () => void;
  }): {
    rootRef: RefObject<HTMLDivElement | null>;
    /** Call from the pool's click handler, before dispatching the pick. */
    beforePick: (heroId: HeroId) => void;
  };
  ```
  - `DraftBoardScreen` puts `rootRef` on its `.screen` div and calls
    `beforePick(heroId)` then `onPick(heroId)` from the pool's
    `onPick`. `HeroPool`'s props don't change.
- **`beforePick` ("First"):** if `motionAllowed()` and
  `currentTurnPlayer !== null`, it does three things:
  - It snapshots the bounding rect of every `[data-pool-hero]` under the
    root, keyed by hero id. `getBoundingClientRect` includes running
    transforms, so a snapshot taken mid-glide is where the card is drawn
    right now.
  - It remembers the tapped hero and the picking side
    (`currentTurnPlayer`), for the slot's team color.
  - It keeps the tapped card's `<img>` `src` and rect for its fade-out.

  Otherwise it does nothing, and the pick is just today's instant
  update.
  - The `currentTurnPlayer` check is the only place a pick can be
    rejected. `page.tsx` always dispatches for the current player, and
    only unpicked heroes are in the pool, so a pick only fails once the
    draft is done. So a pick that passed this check will commit, and the
    hook never animates a pick the reducer refused.
- **After the pick commits ("Last", "Invert", "Play"):** the pick
  commits synchronously in the same click (React batches it). Then
  `HeroPool`'s `useFitGrid` recomputes the grid in its own layout effect
  and sets state, which re-renders again before paint. So the hook waits
  one `requestAnimationFrame` after the commit, which runs after that
  second render and before the first paint of the new layout, then
  starts three animations together:
  1. **Fade-out.** The tapped card is already gone from the DOM, so the
     hook appends a stand-in to `document.body`: a `position: fixed`
     `<img>` of the card's art at its snapshot rect, with
     `pointer-events: none` and a z-index above the board. It animates
     `opacity` 1 → 0 with a slight `scale(0.92)` over `PICK_FADE_MS`,
     then is removed. It never moves.
  2. **Pool glide.** For each remaining `[data-pool-hero]`: cancel its
     running animations (`el.getAnimations()`), measure its new rect,
     and play
     `el.animate([{ transform: "translate(dx, dy) scale(s)" }, { transform: "none" }], { duration: POOL_GLIDE_MS, delay: PICK_FADE_MS, easing: "ease-out", fill: "backwards" })`
     with `transform-origin: top left`. Here `dx`/`dy` is the old
     corner minus the new one, and `s` is old width over new width.
     - `fill: "backwards"` holds every card at its old spot during the
       delay, so the gap stays open while the picked card fades, then
       closes (intent: "The rest of the pool then slides").
     - Pool cards keep their 5:7 shape at every size, so a single
       uniform scale covers the size changes the intent calls out
       ("including when the remaining cards change size").
  3. **Slot reveal.** Find `[data-slot-hero=heroId]` and play, with the
     same `delay` and `fill: "backwards"` (so it's invisible during the
     fade):
     ```ts
     const ring = { outlineStyle: "solid", outlineWidth: "3px", outlineOffset: "-3px" };
     const off = { ...ring, outlineColor: "transparent", boxShadow: "0 0 0 0 transparent" };
     el.animate(
       [
         { ...off, opacity: 0, easing: "ease-out" },
         { ...ring, outlineColor: color, boxShadow: `0 0 18px 4px ${color}`, opacity: 1, offset: 0.4, easing: "ease-in-out" },
         { ...off, opacity: 1 },
       ],
       { duration: SLOT_REVEAL_MS, delay: PICK_FADE_MS, fill: "backwards" },
     );
     ```
     - **The ring is an outline drawn 3px inside the card**, not a
       `box-shadow` spread. It was first built as a shadow ring, but
       `TeamPanel`'s `.slotList` (`overflow: hidden`) clipped it on any
       slot touching the panel's left or top edge, which is the first
       slot on either side. Outlines paint over the card's own content, so
       the inset ring shows on all four sides. Only the soft glow spills
       outside, where clipping doesn't matter.
     - **Easing is per segment**, so the flash peaks at exactly 40% of
       the reveal. An `ease-out` on the whole effect moved the peak to
       about 125ms in.
     - `color` is the picking side's `--color-p1` or `--color-p2`, read
       once with `getComputedStyle(document.documentElement)`, so it
       stays the app's token (intent: "a brief flash in that team's
       color").
     - The slot card's `border-radius` shapes the glow. Nothing is
       hidden by hand: the animation itself is the only thing keeping
       the slot invisible, so a cancelled or finished animation always
       leaves the slot showing.
- **Never blocking** (intent's Scope):
  - Nothing disables the pool or ignores a tap. A tap mid-glide hits the
    card drawn under the finger, because the glide moves the real
    element with a transform. A tap on the fading stand-in hits nothing,
    because it takes no input and the spot under it is still empty.
  - Each pick gets its own fade-out and slot reveal, so fast picks
    overlap instead of queuing. A new pick's glide cancels the previous
    glide and restarts from wherever each card is drawn (step 2 above).
- **Final pick.** The hook counts running slot reveals in a ref. When
  the count drops to 0 while `currentTurnPlayer === null`, it calls
  `onFinalPickLanded` once. If no reveal started (no motion, or the slot
  wasn't found), it calls it right away, so `"landing"` can't get stuck.
- **Cleanup.** On unmount (New Draft mid-animation, or the switch to
  Draft Results), the hook cancels every animation it started and
  removes any stand-ins from `document.body`.
- **Reduced motion.** `motionAllowed()` is false, `beforePick` skips the
  snapshot, and `page.tsx` never enters `"landing"`. The board behaves
  exactly as today (intent's Scope).

## Versus Logic
- **`ResultsScreen`** gains `playIntro: boolean` and
  `onIntroEnd: () => void`. The component and file keep their names. Only
  the screen's user-facing name changes, to "Draft Results" (intent's
  Scope), and nothing in the UI shows that name.
- **No "← New Draft"** (intent's Scope, decided 2026-10-15):
  - `ResultsScreen` drops its `onNewDraft` prop, the button, and the
    `.newDraftLink` styles. The footer keeps only "Start Battle →".
  - `page.tsx` stops passing `draft.returnToStart` to it.
  - A new draft is still reachable from the Draft Board's "New Draft"
    and from the Battle Board's and Battle Map's menus. Neither is
    affected.
  - Tests: `ResultsScreen` has no unit test, and no e2e test clicks
    "← New Draft" on this screen, so nothing else depends on it.
- **The permanent "VS"** (intent's "The 'VS' stays", decided 2026-10-15):
  - A new `<div className={styles.vs} aria-hidden="true">VS</div>`
    between the two `TeamResults` in `.teams`.
  - It's always rendered: after the entrance, after a skip, after a
    reload, and with reduced motion. The settled screen is one layout in
    every case.
  - It's `aria-hidden` because the two team headers already say who's
    playing. Its look is set on the canvas: 56px heading font in
    `--color-gold`, with a thin vertical rule above and below (see UI
    Design Reference).
- **The entrance**, only while `playIntro` is true. The screen root gets
  an `.intro` class, and CSS keyframes run on (starting values, tuned in
  the browser):
  - Player 1's team sweeps in from the left and Player 2's from the
    right (translate + fade, ~500ms, together).
  - The "VS" lands as they meet (scale down from large + fade, starting
    ~400ms, ~300ms long).
  - Then the footer, now just "Start Battle →", fades in (from
    ~800ms), so it appears last, per intent's Scope.
  - The title block stays put. It's the frame the teams arrive into.
  - All keyframes use `animation-fill-mode: both`, so nothing flashes in
    its final place before its delay starts.
- **End:** `onAnimationEnd` on the footer, the last thing to finish,
  calls `onIntroEnd`. That flips `draftOutro` to `"none"`, which removes
  `.intro`, leaving the settled screen.
- **Skip** (intent's "Tapping anywhere skips it"):
  - While `playIntro` is true, a transparent full-screen
    `<button className={styles.skipLayer} aria-label="Skip intro">` sits
    above the screen, autofocused so Enter or Space skips too. It calls
    `onIntroEnd`, which removes both `.intro` and the layer in one
    render, so the screen jumps straight to its settled state.
  - The layer is what takes the tap. Without it, a tap on the spot where
    the still-invisible "Start Battle" will appear would skip *and* start
    the battle in one go.
  - After the skip, focus moves to "Start Battle →", so keyboard users
    land on the next action.
- **Reduced motion:** never reached, since `page.tsx` only enters
  `"versus"` through `"landing"`, which requires `motionAllowed()`. As a
  belt-and-braces measure, `.intro`'s keyframes also sit inside
  `@media (prefers-reduced-motion: no-preference)`. If that ever
  suppresses them, `animationend` won't fire, so `ResultsScreen` pairs
  it with a timeout fallback at the entrance's total length that calls
  `onIntroEnd`. The skip layer can't be left stuck on screen.

## Layout
- **Draft Board:** no layout change.
  - The fade-out stand-in is `position: fixed` on `document.body`, so
    it's never clipped by `HeroPool`'s `overflow: hidden` and never adds
    scroll.
  - The glide only applies transforms, so the grid's layout box (and
    useFitGrid's measurement) is never affected.
  - The pool's scroll area can scroll in its rare overflow fallback
    (`overflows` from `useFitGrid`). Rects are viewport-based, so a
    scrolled pool still fades out where the card is drawn.
  - The slot's glow is a `box-shadow` of up to ~22px. `TeamPanel`'s
    `.slotList` is `overflow: hidden`, so the outer glow is clipped
    where the slot meets the panel's edge. That's fine for a soft glow.
    The 3px ring is an inset outline, so it's never clipped (see Pick
    Logic).
- **Draft Results screen:** the "VS" adds one item to `.teams`' row. At
  1280x800, two teams of 2 columns at up to 180px (372px each), plus
  the 96px "VS" column and two 48px gaps, come to about 936px, well
  inside the width. It takes no height: the "VS" and its rules (~220px
  tall) are centered vertically beside the grids, which are taller.
  Checked in the browser (Open Items).
- **Not touched:** `StartScreen`, the Battle Board, the Map and the Win
  Screen (intent's Out of Scope: battle-screen animations). The coin
  flip and turn passing stay instant (intent's Out of Scope,
  `BACKLOG.md`).

## UI Design Reference
Version 67 of the shared canvas ("BfbHelper — App Flow") covers both
moments: https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

- **"Draft — Pick Animation"** (new artboard, below "Draft —
  Mid-Selection"): the pick, as a looping 3-second animation with the
  spec's starting timings. Player 1 taps Cyrus, the 5th card in the
  pool.
  - The banner switches to "Player 1 — pick 1 more hero" at the tap,
    since the pick is committed before the motion starts.
  - Cyrus's card fades out in place, shrinking slightly (150ms). The
    gap stays open while it fades.
  - Then every pool card after Cyrus glides back one place (300ms),
    most from one column to the right, and Cynthia up from the next
    row.
  - At the same time, Player 1's second slot fades in with Cyrus and
    flashes Player 1's color: a 3px ring and a soft glow that peak early,
    then fade out (600ms).
  - It holds on the settled board, then a quick fade hides the loop's
    reset.
- **"Draft Results"** (updated, renamed from "Results"; intent's
  Scope):
  - The settled screen now has the permanent "VS" between the teams:
    56px Cinzel in `--color-gold`, with a soft glow and a thin
    vertical rule above and below.
  - The footer holds only a gold "Start Battle →". The "← New Draft"
    button is gone.
  - In Play mode, the artboard runs the entrance with the spec's
    starting timings. The teams sweep in from each side (500ms), the
    "VS" drops in from 2.6x scale with a slight overshoot (300ms,
    starting at 400ms), and the footer fades up last (from 800ms). A tap
    anywhere skips straight to the settled screen.

As with earlier intents, the canvas is a prototype for visual direction
only. A revised canvas wins over the starting durations and motions
written here.

## Deployment
No change from v1-v9: same static Vercel deployment, no new infra.

## Open Items for Implementation
- ~~Update the canvas: the "VS" on the Results artboard, plus the pick
  and the versus entrance. Then rewrite UI Design Reference above.~~
  **Decided:** done. Version 67 shows the pick as a looping fade-out,
  glide and slot flash, replacing version 66's flight. See UI Design
  Reference.
- ~~Tune the versus timings in the browser at 1280x800 (PR C).~~
  **Decided:** the canvas's timings are kept (500ms sweep, "VS" at
  400ms for 300ms, footer at 800ms for 300ms, 1100ms in all).
  ~~`PICK_FADE_MS`, `POOL_GLIDE_MS`, `SLOT_REVEAL_MS`~~ **Decided:**
  the starting values (150 / 300 / 600ms) are kept for now. A pick
  settles in ~750ms and never blocks the next tap. Revisit after a
  playtest if they feel slow.
- ~~Confirm in the browser that the `requestAnimationFrame` measurement
  runs after `useFitGrid`'s re-render and before the first paint: no
  one-frame jump of the pool on a pick that changes the card size.~~
  **Decided:** no jump. Sampled frame by frame on all 7 glides of a
  draft, at 1280x800, 2560x1440, 1100x900 and 1600x700. The first
  painted frame always shows each card at its old spot. The card size
  never changed during a draft at any of those sizes (`useFitGrid`
  keeps the same columns from 19 cards down to 12), so the
  `scale(s)` part is in place but rarely exercised.
- ~~Check rapid tapping: three quick picks should overlap cleanly, with no
  slot left invisible and no stand-in left on screen.~~
  **Decided:** clean. Three taps 60ms apart picked the three cards under
  the pointer, left every slot at opacity 1, and left no running
  animation or stand-in.
- ~~Check the slot flash against `TeamPanel`'s `overflow: hidden`: the
  ring should be fully visible and the soft glow shouldn't look cut off.~~
  **Decided:** a `box-shadow` ring was clipped on the first slot of
  either panel, so the ring is now an inset outline (see Pick Logic).
  The soft glow being clipped at the panel edge reads fine.
- ~~Check the Draft Results screen at 1280x800 with the "VS": no
  horizontal overflow, and the teams still fit without scrolling.~~
  **Decided:** fits at 1280x800 and 2560x1440, with no page or grid
  scroll.
- ~~`e2e/draft-to-battle.spec.ts` clicks the first pool card 8 times, then
  waits for "Draft Complete" and "Start Battle →". Playwright waits for
  moving elements to settle and for "Start Battle →" to become visible,
  so it should pass with the animations on. Confirm, and add a check
  that the "VS" is visible. Also decide whether one e2e run uses
  Playwright's `reducedMotion: "reduce"` to cover that path.~~
  **Decided:** it passes with the animations on, since Playwright waits
  out the skip layer before clicking "Start Battle →", and it now checks
  the "VS". The new `e2e/draft-pick-animation.spec.ts` covers the
  entrance, the skip, a reload, and a `reducedMotion: "reduce"` run.
