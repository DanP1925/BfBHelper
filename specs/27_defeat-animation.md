# Spec 27: Defeat Animation

> **DRAFT.** Architecture for intent 27's scope. Build-out has not started
> yet. See [../intent/27_defeat-animation.md](../intent/27_defeat-animation.md)
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
  /** Plays `play(element)` when `value` changes in a way `plays` accepts,
   * and cancels the running animation when it changes in a way `cancels`
   * accepts. Never on mount: the previous value starts at the mounted one.
   * Reads `motionAllowed()` when an animation would start. */
  export function useTransitionAnimation<T>(options: {
    elementRef: RefObject<HTMLElement | null>;
    value: T;
    enabled: boolean;
    plays: (previous: T, next: T) => boolean;
    cancels: (previous: T, next: T) => boolean;
    play: (element: HTMLElement) => Animation;
  }): void;
  ```
  - **A `previousRef`** starts at the mounted value. A layout effect on
    `[value]` compares it with the new value, then stores the new one. A
    layout effect, so an animation's first frame is in place before the
    re-render is painted.
  - **`plays`, `enabled` and `motionAllowed()`:** cancel any running
    animation, then start a new one.
  - **`cancels`:** cancel the running animation.
  - **Unmount:** cancel the running animation.
  - **`motionAllowed()` is read when an animation would start**, as in
    specs 10 and 26, so a change to the OS setting takes effect on the
    next one.
  - `useLevelFourBurst` keeps its signature and tests, and becomes a thin
    wrapper: `plays` is 3 to 4, `cancels` is 4 to 3, `enabled` is
    `side !== undefined`.
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
  - **`cancels`:** 0 to above 0. The gray class is already gone, so the
    image shows in color at once (intent's "No reverse animation").
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

- **Starting motions**, as drawn on the canvas, tuned in the browser (see
  UI Design Reference and Open Items):
  - **Hero, a hit** (`HERO_DEFEAT_MS`): over the first ~30%, the portrait
    brightens and tints toward red (`filter: brightness(1.6) sepia(1)
    hue-rotate(-30deg) saturate(4)`), with a small horizontal shake
    (`translateX` ±3px). Then the `filter` eases into the gray look.
  - **Structure, a collapse** (`STRUCTURE_DEFEAT_MS`): the icon rumbles
    (a few quick `translateX` ±2px steps), then sinks and squashes
    (`translateY(4px) scaleY(0.8)`) while the `filter` darkens into the
    gray look, and springs back to its normal shape at the end.
  - **Both end on `grayscale(1) brightness(0.6)`**, the exact value of
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
artboard, like the Towers (intent's Scope).

This is a prototype for visual direction only, the same caveat as
earlier intents' references. If a revised canvas supersedes these
choices, it wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- ~~Draw the "Battle Board — Defeat Animation" artboard on the canvas,
  then rewrite UI Design Reference to match.~~ **Decided:** done in
  version 114, with the starting motions as written. Check them in the
  browser and adjust the artboard if they read too weak or too loud,
  including `HERO_DEFEAT_MS` and `STRUCTURE_DEFEAT_MS`.
- When building, check that spec 26 shipped as written: if
  `useLevelFourBurst`'s mechanism ended up different, extract what it
  actually does into `useTransitionAnimation`.
- Check in the browser at 1280x800 and 2560x1440 (`/qa-screens`) that the
  hit reads on the 80x120 portrait and the collapse on the 36px structure
  icon, and that tapping + on the HP stepper mid-animation brings the
  color back at once.
- Tests:
  - `useTransitionAnimation.test.tsx`, with `element.animate` and
    `matchMedia` faked as in `useDraftPickAnimation.test.tsx`
    (`test/fakeAnimations.ts`): plays on an accepted change, never on
    mount, cancels on a `cancels` change, cancels and restarts on a
    second `plays` change, nothing with reduced motion or `enabled`
    false, cancels on unmount. `useLevelFourBurst.test.tsx` keeps passing
    unchanged.
  - `useDefeatAnimation.test.tsx`: 1 to 0 plays once; 0 to 3 cancels; 3
    to 2 plays nothing; `"hero"` and `"structure"` play different
    keyframes; each motion's last keyframe has the gray look's `filter`
    and no transform.
  - `HeroCard.test.tsx`: a Board card re-rendered from HP 1 to 0 calls
    `animate` on the portrait; the Win Screen's read-only card doesn't.
  - `StructureSlot` test (new, or in `BattleTeamPanel`'s): the Bit at 0
    HP has the destroyed class, like a Tower; a slot re-rendered from 1
    to 0 calls `animate` on its icon.
  - No e2e change: Playwright can't easily assert motion, and HP to 0 is
    already covered by the existing battle e2e tests.
