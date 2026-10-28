# Spec 26: Level 4 Animation

> **DRAFT.** Architecture for intent 26's scope. Build-out has not started
> yet. See [../intent/26_level-4-animation.md](../intent/26_level-4-animation.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-25: React + TypeScript,
  Next.js, static build, no backend.
- **The burst follows the level prop, not the click.** A new hook,
  `useLevelFourBurst`, runs inside `HeroCard` and watches the card's
  `level`. When it changes from 3 to 4 on a Board card, it plays a Web
  Animations API burst on the card. A change the battle state refused
  (e.g. an unaffordable level-up, intent 22) never reaches the prop, so it
  never plays.
- **Same motion tools as spec 10:** `element.animate()`, gated by
  `motionAllowed()` from `lib/motion.ts`, with the duration as a constant
  next to the draft's. No CSS `@keyframes`, no animation library.
- **No new state, no schema change** (intent's Affected Systems and
  Constraints). The previous level lives in a ref inside the hook, and
  nothing is persisted.
- **What doesn't change:** `useBattle`, `battleReducer`, `setHeroLevel`
  and its gold (spec 22), the HP that follows the level (spec 19), team
  level (spec 20), `NumberStepper`, the Win Screen's cards, the Battle
  Map, and every screen's layout. `BattleTeamPanel` changes by one prop:
  it passes its `side` to each `HeroCard`, for the burst's color.

## State Management
- **No battle state change.** The level and gold are already saved by the
  time the card re-renders with level 4, so the burst is purely cosmetic
  and never blocks input (intent's Scope).
- **`useLevelFourBurst(cardRef, level, side)`**, in
  `frontend/src/components/HeroCard/useLevelFourBurst.ts`:
  ```ts
  /** Plays the level-4 burst on `cardRef`, in `side`'s team color, when
   * `level` goes from 3 to 4 (intent/26). `side` undefined means no
   * burst (anything but a Board card). Never on mount, so a reload or a
   * Board/Map switch with a hero at 4 shows nothing. */
  export function useLevelFourBurst(
    cardRef: RefObject<HTMLElement | null>,
    level: number | undefined,
    side: PlayerId | undefined,
  ): void;
  ```
  - **A `previousLevelRef`** starts at the mounted level. A layout effect
    on `[level]` compares it with the new level, then stores the new one.
  - **The color is read when the burst starts**, from `--color-${side}`
    on `document.documentElement`, the same lookup as spec 10's slot
    flash (`useDraftPickAnimation`): Player 1 teal, Player 2 red.
  - **3 to 4, with a `side` and `motionAllowed()`:** cancel any running
    burst, then start a new one. This covers a misclick undone and redone
    (4 to 3 to 4), which plays again (intent's Scope).
  - **4 to 3:** cancel a running burst, so the card stops celebrating a
    level it no longer has. Lowering never plays anything.
  - **Unmount:** cancel the running burst.
  - **`motionAllowed()` is read when the burst would start**, as in spec
    10, so a change to the OS setting takes effect on the next level-up.
- **Defeated heroes play it too** (intent's Scope). The hook ignores HP.
  The burst sits on the card, not the gray portrait, so it shows the same
  way at 0 HP.
- **The hook is called at `HeroCard`'s top level**, before the variant
  branches, to keep React's hook order fixed. `level` is `undefined` for
  the draft variants, and `HeroCard` passes `side` only when it has
  `onLevelChange` too, so the Win Screen's read-only cards never play.
- **`HeroCard`'s battle variant gains an optional `side?: PlayerId`
  prop,** the team the card belongs to. `BattleTeamPanel` passes its own
  `side`. The Win Screen leaves it out.

## Data Model
- **`frontend/src/lib/motion.ts`:**
  ```ts
  /** How long a Board card's level-4 burst lasts (intent/26). */
  export const LEVEL_FOUR_BURST_MS = 700;
  ```
- **No change** to `BattleState`, `HeroBattleState`, the reducer's actions
  or `persistence/schema.ts`. `CURRENT_BATTLE_SCHEMA_VERSION` stays as it
  is, so saved battles load unchanged (intent's Constraints).
- **`HERO_MAX_LEVEL` (4) is the trigger,** not a literal: the hook plays
  when `level === HERO_MAX_LEVEL` and the previous level was
  `HERO_MAX_LEVEL - 1`.

## Level 4 Burst Logic
| Previous level | New level | Burst running? | Result |
|---|---|---|---|
| (mount) | any | no | nothing, including a reload at level 4 |
| 3 | 4 | no | plays |
| 3 | 4 | yes (fast 4 to 3 to 4) | the old one is cancelled, a new one plays |
| 4 | 3 | yes | cancelled, nothing plays |
| 1 or 2 | one up | either | nothing (intent's Out of Scope) |
| 3 | 4, reduced motion on | no | nothing: the card just shows 4 |

- **The motion** (drawn on the canvas, see UI Design Reference):
  a ring and soft glow in the team's color (`--color-p1` or
  `--color-p2`) around the card, as in spec 10's slot flash, peaking at 40%
  of the burst and fading out, plus the level value scaling up and back
  (about 1 to 1.3 to 1). It ends exactly in the card's normal look: no
  `fill: "forwards"`, so cancelling it or letting it end leaves nothing
  behind (intent's "A burst only").
- **The ring is an outline drawn just inside the card**
  (`outlineOffset: -3px`), the same trick as spec 10's slot reveal, since
  `BattleTeamPanel`'s hero grid can clip anything outside the card. Only
  the soft glow spills out, where being clipped doesn't matter.
- **Transforms and outline only**, so the burst never changes layout or
  hit-testing in a way that moves a button under a tap. The level value's
  scale applies to the stepper's `<output>`, not its buttons.
- **No text** (intent's "No text cue").

## Layout
- **No layout change.** The burst draws on the existing `.battleCard`
  (ring, glow) and its level `<output>` (scale). Nothing takes space, so
  the Board's panels keep their height at 1280x800.
- **The card gets a ref.** `HeroCard`'s battle `<div className=
  {styles.battleCard}>` passes `cardRef`. The hook finds the level
  `<output>` inside it by a `data-level-value` attribute that
  `NumberStepper` gets through a new optional `valueProps` prop, or, if
  that's heavier than it's worth, by querying `output` inside
  `.levelRow`. Settled in the build (see Open Items).
- **The Battle Map and the Win Screen don't change** (intent's "The Battle
  Board only").

## UI Design Reference
On the same canvas as intents 01-25 ("BfbHelper — App Flow"):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

Artboard: **"Battle Board — Level 4 Animation"**, below "Battle Board".
It draws a Board hero card as the app shows it (read-only "Lv – 3 +"
stepper with the next cost, not the pips the "Battle Board" artboard
still draws):
- **Two live loops** (3s, tap at 0.45s): Player 1's Kunoichi going from
  level 3 to 4 in teal (HP 9 to 10, the cost gone, + off), and Player 2's
  Caligar, defeated at 0 HP, playing the same burst in red over his gray
  portrait.
- **Three stills,** Player 1: Before (level 3, next cost 4 gold), Peak at
  280ms (teal ring just inside the card, soft glow, value at 1.3x) and
  After at 700ms (the normal level-4 card).

The motion matches Level 4 Burst Logic. The team color was chosen over
gold on 2026-10-28.

This is a prototype for visual direction only, the same caveat as earlier
intents' references. If a revised canvas supersedes these choices, it
wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- ~~Confirm the burst's color on the "Battle Board — Level 4 Animation"
  artboard: gold, or the team's color as in spec 10's slot flash.~~
  **Decided:** the team's color (2026-10-28).
- Check the ring, pop and 700ms in the browser at 1280x800; adjust on the
  artboard if they read too weak or too loud.
- The "Battle Board" artboard still draws level pips and "3/4" next to
  the stepper, which the app's Board card doesn't show.
  Out of scope here; worth a canvas cleanup.
- Settle how the hook reaches the level value: a `data-level-value`
  attribute through `NumberStepper`, or a query inside `.levelRow`.
- Spec 27 (defeat animation) also plays a burst on a `HeroCard` when a
  prop crosses a value (HP to 0). If it's built after this one, it can
  generalize `useLevelFourBurst` into a shared "play on transition" hook
  rather than copy it.
- Check in the browser at 1280x800 and 2560x1440 (`/qa-screens`) that the
  glow isn't clipped badly on the edge cards, and that tapping + or −
  mid-burst works.
- Tests:
  - `useLevelFourBurst.test.tsx`, with `element.animate` and
    `matchMedia` faked as in `useDraftPickAnimation.test.tsx`: 3 to 4
    plays once; mount at 4 plays nothing; 2 to 3 plays nothing; 4 to 3
    cancels; 4 to 3 to 4 plays twice; reduced motion plays nothing;
    no `side` plays nothing; Player 2's burst uses `--color-p2`; unmount
    cancels.
  - `HeroCard.test.tsx`: a Board card re-rendered from level 3 to 4 calls
    `animate` (faked); the Win Screen's read-only card doesn't.
  - No e2e change: Playwright can't easily assert motion, and the
    level-up itself is already covered by `e2e/level-up-gold.spec.ts`.
