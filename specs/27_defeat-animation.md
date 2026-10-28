# Spec 27: Defeat Animation

> **BUILT.** Architecture for intent 27's scope, all built in one PR. See [../intent/27_defeat-animation.md](../intent/27_defeat-animation.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-26: React + TypeScript,
  Next.js, static build, no backend.
- **Built after intent 26** (decided 2026-10-28). Spec 26's
  `useLevelFourBurst` already plays an animation when a prop crosses a
  value. This build pulls that mechanism out into a shared hook,
  `useTransitionAnimation`, and both the level-4 burst and the defeat
  animation use it, so it isn't copied.
- **The animation follows the HP prop, not the click.** A new hook,
  `useDefeatAnimation`, built on `useTransitionAnimation`, plays a Web
  Animations API animation on an image when HP goes from above 0 to
  exactly 0. The stepper and a typed value both reach the card the same
  way, as the `hp` prop, so both trigger it (intent's "Every time HP
  reaches 0").
- **Two motions, one hook** (decided 2026-10-28): heroes and structures
  animate differently. `HeroCard`'s battle variant plays the hero motion
  on the portrait, and `StructureSlot` plays the structure motion on the
  Tower's or Bit's icon.
- **Same motion tools as specs 10 and 26:** `element.animate()`, gated by
  `motionAllowed()` from `lib/motion.ts`, with the durations as constants
  next to the others. No CSS `@keyframes`, no animation library.
- **The gray look stays CSS.** `.tokenDefeated` and `.iconDestroyed`
  already apply the moment HP is 0. The animation only plays the way into
  that look, and ends on it, so cancelling or finishing it leaves exactly
  what the app shows today.
- **The Bit gets the destroyed look** (intent's Scope). `StructureSlot`'s
  `reactiveStyling` prop, which only the Towers passed, is removed:
  every slot turns gray at 0 HP.
- **No new state, no schema change** (intent's Affected Systems and
  Constraints). The previous HP lives in a ref inside the hook.
- **What doesn't change:** `useBattle`, `battleReducer`, `setHeroHp` and
  its move to the respawn area (spec 04), the respawn window and its band
  on the portrait (spec 24, decided 2026-10-28), "End Battle" and the Win
  Screen (spec 03), `NumberStepper`, the Battle Map and its status panel,
  and every screen's layout. The level-4 burst behaves exactly as spec 26
  describes; only where its mechanism lives changes.

## State Management
- **No battle state change.** The HP is saved by the time the card
  re-renders at 0, so the animation is cosmetic and never blocks input
  (intent's Scope).
- **`useTransitionAnimation`** (new, `frontend/src/lib/useTransitionAnimation.ts`),
  extracted from spec 26's `useLevelFourBurst`:
  ```ts
  /** Plays an animation when `value` changes in a way `plays` accepts.
   * Never on mount. Any other change of `value`, and unmounting, cancels
   * whatever is still running. Reads `motionAllowed()` when an animation
   * would start. */
  export function useTransitionAnimation<T>(options: {
    elementRef: RefObject<HTMLElement | null>;
    value: T;
    enabled: boolean;
    plays: (previous: T, next: T) => boolean;
    play: (element: HTMLElement) => Animation[];
  }): void;
  ```
  - **A `previousRef`** starts at the mounted value. A layout effect on
    `[value]` compares it with the new value, then stores the new one. A
    layout effect, so an animation's first frame is in place before the
    re-render is painted.
  - **Any change of `value` cancels** what's running, as spec 26's hook
    already did. Then, with `plays`, `enabled`, the element and
    `motionAllowed()`, it starts the new animations. There's no separate
    `cancels` rule (drafted here first, dropped in the build): a running
    defeat means HP is 0, so any change leaves 0 and cancels it.
  - **`play` returns `Animation[]`**, since the level-4 burst runs two, on
    the card and on its level `<output>`.
  - **The callbacks are read through a latest-value ref**, so callers pass
    inline functions without re-running the effect: only `value` drives it.
  - **Unmount:** cancel the running animations.
  - **`motionAllowed()` is read when an animation would start**, as in
    specs 10 and 26, so a change to the OS setting takes effect on the
    next one.
  - `useLevelFourBurst` keeps its signature and tests, and becomes a thin
    wrapper: `plays` is 3 to 4, `enabled` is `side !== undefined`, and
    `play` reads the team color and calls its existing `playBurst`.
- **`useDefeatAnimation(imageRef, hp, enabled, kind)`** (new,
  `frontend/src/lib/useDefeatAnimation.ts`, next to `motion.ts`, since two
  components share it):
  ```ts
  /** Plays the defeat animation on `imageRef` when `hp` goes from above 0
   * to exactly 0 (intent/27): the hero motion on a portrait, the structure
   * motion on a Tower's or Bit's icon. `enabled` false means never
   * (anything but the Battle Board). Never on mount, so a reload or a
   * Board/Map switch with a hero or structure at 0 shows the gray look
   * with no replay. */
  export function useDefeatAnimation(
    imageRef: RefObject<HTMLElement | null>,
    hp: number | undefined,
    enabled: boolean,
    kind: "hero" | "structure",
  ): void;
  ```
  - **`plays`:** above 0 to 0. A hero defeated again after a respawn
    plays it again, and so does a mistaken 0 (intent's Scope). A fast 1
    to 0 to 1 to 0 cancels the first and plays a second.
  - **0 to above 0 cancels it**, as any change does. The gray class is
    already gone, so the image shows in color at once (intent's "No
    reverse animation").
  - **`play`:** the hero or structure keyframes (see Defeat Logic), by
    `kind`.
  - With reduced motion, nothing plays and the gray look just appears
    (intent's Scope).
- **`HeroCard`** calls `useDefeatAnimation` at its top level, next to
  `useLevelFourBurst` and before the variant branches, to keep React's
  hook order fixed. It passes `hp` (`undefined` for the draft variants),
  `enabled = onHpChange !== undefined` and `"hero"`, so only the Board's
  cards play, never the Win Screen's read-only ones. The battle variant's
  portrait `<img>` gets the ref. The respawn band beside it isn't touched.
- **`StructureSlot`** calls it with its `hp`,
  `enabled = onHpChange !== undefined` and `"structure"`. Its icon
  `<img>` gets the ref. `StructureSlot` is only used on the Battle Board,
  but the gate keeps the rule in one place.

## Data Model
- **`frontend/src/lib/motion.ts`:**
  ```ts
  /** How long a hero's defeat animation lasts on its Board portrait
   * (intent/27). */
  export const HERO_DEFEAT_MS = 600;

  /** How long a Tower's or Bit's destruction animation lasts on its Board
   * icon (intent/27). */
  export const STRUCTURE_DEFEAT_MS = 700;
  ```
- **No change** to `BattleState`, `HeroBattleState`, `StructuresState`, the
  reducer's actions or `persistence/schema.ts`.
  `CURRENT_BATTLE_SCHEMA_VERSION` stays as it is, so saved battles load
  unchanged (intent's Constraints).
- **`StructureSlot`'s props:** `reactiveStyling?: boolean` is removed.
  `isDestroyed` becomes `hp === 0` for every slot, and `BattleTeamPanel`
  stops passing the prop to the Towers. The prop's comment, which says the
  Bit is left out on purpose (intent 03), goes with it.

## Defeat Logic
| Previous HP | New HP | Animation running? | Result |
|---|---|---|---|
| (mount) | any | no | nothing, including a reload at 0 |
| above 0 | 0 | no | plays |
| above 0 | 0 | yes (fast 1 to 0 to 1 to 0) | the old one is cancelled, a new one plays |
| 0 | above 0 | yes | cancelled: the image is in color at once |
| 0 | above 0 | no | nothing: the gray class clears, as today |
| above 0 | above 0 | either | nothing |
| above 0 | 0, reduced motion on | no | nothing: the gray look just appears |
| above 0 | 0, Win Screen card | no | nothing (`enabled` false; it never re-renders with new HP anyway) |

- **The motions**, as drawn on the canvas (see UI Design Reference),
  exported from `useDefeatAnimation.ts` as `HERO_DEFEAT_KEYFRAMES` and
  `STRUCTURE_DEFEAT_KEYFRAMES`:
  - **Hero, a hit** (`HERO_DEFEAT_MS`): over the first 30%, the portrait
    brightens and tints toward red (brightness 1.6, sepia 1, hue-rotate
    -30deg, saturate 4), with a small horizontal shake (`translateX`
    ±3px). Then the `filter` eases into the gray look.
  - **Structure, a collapse** (`STRUCTURE_DEFEAT_MS`): the icon rumbles
    (four `translateX` ±2px steps), then sinks and squashes
    (`translateY(4px) scaleY(0.8)`) while the `filter` darkens into the
    gray look, and springs back to its normal shape at the end. The icon's
    CSS sets `transform-origin: 50% 100%`, so it squashes from its base.
  - **Every keyframe's `filter` lists the same five functions**, in the
    same order (`filterOf`: grayscale, brightness, sepia, hue-rotate,
    saturate, each at its identity unless set). A browser only blends two
    filters whose lists match, and otherwise flips from one to the other
    halfway: with the red hit as `brightness sepia hue-rotate saturate`
    and the gray as `grayscale brightness`, the gray snapped in at the
    midpoint instead of fading. Found sampling frames in the browser.
  - **Both end on `grayscale(1) brightness(0.6)`** (plus the other three
    functions at their identity, which look the same), the value of
    `.tokenDefeated` and `.iconDestroyed`, and on `transform: none`, so
    the end of the animation matches the class with no jump.
  - Easing per keyframe segment, as in spec 10's slot reveal, so the hit
    or rumble lands at the same point every time.
- **No `fill`.** The class holds the gray look after the animation ends,
  so a finished or cancelled animation leaves nothing behind.
- **Filter and transform only**, on the image. Neither changes layout, and
  the image isn't a button, so a tap on the stepper mid-animation always
  lands where it's drawn (intent's "Animations never block input").
- **Motion stays inside its frame.** The portrait sits in
  `.battleTokenWrapper`, which has `overflow: hidden`, so its shake is
  clipped to the 80x120 frame. A structure's icon has no wrapper, and its
  few pixels of rumble and sink fit inside the slot's padding.
- **The respawn band isn't touched** (decided 2026-10-28). It's a sibling
  of the portrait image, shown when the respawn window is set (spec 24),
  so it's in place from the first frame, over the animating portrait.

## Layout
- **No layout change.** The animations draw on the existing portrait and
  icon images. Nothing takes space, so the Board's panels keep their
  height at 1280x800 (intent's Constraints).
- **The Bit slot** keeps its team-colored border (`accent`). Only its
  icon turns gray, the same as a Tower's.
- **The Battle Map doesn't change** (intent's "Board only"). Its status
  panel already dims a defeated hero's or destroyed structure's row,
  the Bit's included, and the Bit's icon already disappears from the
  board.

## UI Design Reference
On the same canvas as intents 01-26 ("BfbHelper — App Flow"):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

Version 114 adds the artboard **"Battle Board — Defeat Animation"**,
below "Battle Board — Level 4 Animation". It draws the starting motions in
Defeat Logic with their timings:
- **Three live loops** (3s, the tap on − at 0.45s, HP 1 to 0):
  - Player 1's Kunoichi takes the hit: a red flash and a 3px shake, then
    gray, in 600ms. Her respawn band ("Round 4–6") appears with the
    gray look, as the app already shows it, not animated.
  - Player 1's Middle Tower collapses: it rumbles 2px, sinks and squashes
    from its base while darkening, then springs back gray, in 700ms.
  - Player 2's Bit plays the same collapse and stays gray.
- **Hero stills:** Before (1 HP), Hit at 45ms (red, shaken), After at
  600ms (gray, with the respawn band).
- **Bit stills:** Before (1 HP), Rumble at 100ms, Sink at 540ms (squashed,
  darkening), After at 700ms (gray destroyed look).

Version 114 also turns the Bit gray at 0 HP on the "Battle Board"
artboard, like the Towers (intent's Scope). Version 116 makes the
artboard's gray fade in rather than snap, matching the app (see Defeat
Logic).

This is a prototype for visual direction only, the same caveat as
earlier intents' references. If a revised canvas supersedes these
choices, it wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- ~~Draw the "Battle Board — Defeat Animation" artboard on the canvas,
  then rewrite UI Design Reference to match.~~ **Decided:** done in
  version 114, with the motions as written.
- ~~When building, check that spec 26 shipped as written.~~ **Decided:**
  it had one difference: `useLevelFourBurst` cancels on any level change,
  not only 4 to 3, and runs two animations. `useTransitionAnimation`
  follows what shipped: no `cancels` rule, and `play` returns
  `Animation[]` (see State Management).
- ~~Check in the browser at 1280x800 and 2560x1440 that the hit reads on
  the 80x120 portrait and the collapse on the 36px structure icon, and
  that tapping + on the HP stepper mid-animation brings the color back at
  once.~~ **Decided:** both read, and the 600 / 700ms durations are kept.
  Sampled frame by frame on the real Board (each animation paused and
  seeked): the hit, the rumble, the sink and the gray all land as on the
  canvas, once the filter lists were made to match (see Defeat Logic).
  Pressing + mid-collapse leaves no running animation and the icon in
  color. A reload and a Board/Map switch replay nothing, reduced motion
  plays nothing, and the level-4 burst still plays. The Board fits at
  1280x800 and 2560x1440, and the Bit keeps its team border when gray.
- ~~Tests.~~ **Decided:** `useTransitionAnimation.test.tsx`,
  `useDefeatAnimation.test.tsx` (including the matching filter lists),
  `StructureSlot.test.tsx`, and a "HeroCard defeat animation" block in
  `HeroCard.test.tsx`. `useLevelFourBurst.test.tsx` passes unchanged. No
  e2e change: Playwright can't easily assert motion, and HP to 0 is
  already covered by the existing battle e2e tests.
- ~~The canvas's CSS loops used the same mismatched filter lists, so
  their gray snapped in rather than faded.~~ **Decided:** fixed in
  version 116, with the same five functions in every keyframe, as in the
  app.
