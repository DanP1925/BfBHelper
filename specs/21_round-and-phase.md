# Spec 21: Round and Phase

> **DRAFT.** Architecture for intent 21's scope. Build-out has not started
> yet. See [../intent/21_round-and-phase.md](../intent/21_round-and-phase.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-20: React + TypeScript,
  Next.js, static build, no backend.
- **Two new top-level fields on `BattleState`, `round` and `phase`,**
  shared by both teams like `initiative` and `goldPiles`. That makes this
  a battle schema bump (15 → 16) with an in-place migration (intent's
  Constraints).
- **Stepping the phase is two reducer actions, `ADVANCE_PHASE` and
  `STEP_PHASE_BACK`,** which change only `round` and `phase`. The
  initiative pass on a round change is composed in `useBattle`, which
  dispatches the existing `PASS_INITIATIVE` in the same `setState` update.
  It's the same pattern as `setHeroHp`'s defeat move and spec 19's
  level-up HP: one user action, two single-purpose reducer actions.
- **One new pure rules module, `lib/battle/phase.ts`,** holds the phase
  order and the next/previous step, like `iceWall.ts` and `levelUp.ts`
  hold theirs.
- **One new component, `PhaseControl`,** renders a read-only round pill
  and the phase stepper side by side in the top bar that
  `BattleBoardScreen` and `BattleMapScreen` already share, between
  `ViewToggle` and the initiative badge's group.
- **What doesn't change:** `InitiativeBadge` and `passInitiative` (still a
  manual correction, intent's Scope), every other reducer action, the
  draft schema, `ResultsScreen`, the Draft screens, and the team panels
  (spec 20's team level lives there, not in the top bar).

## State Management
- **`useBattle` (`frontend/src/lib/useBattle.ts`)** gains two mutators on
  `UseBattleResult`, both with no arguments:
  ```ts
  /** One phase forward (intent/21). Cleanup → Orders also starts the next
   * round and passes initiative. */
  advancePhase: () => void;
  /** One phase back, undoing exactly what advancePhase did: Orders → the
   * previous round's Cleanup also passes initiative back. A no-op at
   * Round 1, Orders. */
  stepPhaseBack: () => void;
  ```
  Each body follows `setHeroHp`'s shape:
  ```ts
  setState((prev) => {
    if (prev === null) return prev;
    const afterStep = battleReducer(prev, { type: "ADVANCE_PHASE" });
    if (afterStep === prev || afterStep.round === prev.round) return afterStep;
    return battleReducer(afterStep, { type: "PASS_INITIATIVE" });
  });
  ```
  (`stepPhaseBack` is the same with `STEP_PHASE_BACK`.) A round change in
  either direction passes initiative, because passing always alternates
  (intent/05): advancing hands it on, and stepping back hands it back.
- **A no-op stays a no-op.** At Round 1, Orders, `STEP_PHASE_BACK`
  returns the same state reference, so nothing is saved and initiative
  doesn't move.
- **No confirm dialog** when a new round starts (intent's Scope). A wrong
  step is undone by stepping the other way.
- **`passInitiative` doesn't change.** Tapping the badge still flips only
  `initiative`, never the round or phase (intent's Scope).
- **`page.tsx`** wires `battle.advancePhase` and `battle.stepPhaseBack`
  into both battle screens. `clearDraft()` already removes the persisted
  battle, so a new draft resets the round and phase with everything else
  (intent's Session Lifecycle).

## Data Model
- **`frontend/src/lib/battle/types.ts`:**
  ```ts
  /** The four phases of a game round, in order (rulebook p. 7). */
  export type BattlePhase = (typeof BATTLE_PHASES)[number];

  export type BattleState = {
    schemaVersion: 16;
    // …existing fields…
    /** The current round (intent/21), from 1. Changes only with the
     * phase: Cleanup → Orders adds 1, and stepping back from Orders
     * takes 1 off. */
    round: number;
    /** Where in the round the game is (intent/21). Changed only by
     * ADVANCE_PHASE and STEP_PHASE_BACK, never by any other action. */
    phase: BattlePhase;
  };
  ```
- **`frontend/src/lib/battle/constants.ts`:**
  `BATTLE_PHASES = ["orders", "movement", "action", "cleanup"] as const`
  and `BATTLE_STARTING_ROUND = 1`.
- **`createInitialBattleState`** (`reducer.ts`) sets `round: 1` and
  `phase: "orders"`. Deployment comes before Round 1 as setup, so it isn't
  a phase (intent's Scope). Initiative still starts on the coin-flip
  winner.
- **`frontend/src/lib/persistence/schema.ts`:**
  `CURRENT_BATTLE_SCHEMA_VERSION = 16`. A new `PersistedBattleStateV16`
  is `PersistedBattleStateV15` plus `round: number` and
  `phase: BattlePhase`, with `schemaVersion: 16`. V15's doc comment
  becomes "now only the migration source shape `battleMigrations[15]`
  upgrades from", like V14's.
- **Migration:** `upgradeV15ToV16` adds `round: 1, phase: "orders"`, the
  same shape as `upgradeV14ToV15`. It goes in `battleMigrations` as
  `15: upgradeV15ToV16`. `loadPersisted` chains steps, so older saves
  reach 16 through the existing steps. An upgraded battle a few rounds in
  shows Round 1, Orders, and players correct it with the control
  (intent's Constraints). Stepping forward to the right round also passes
  initiative on each new round, so they may need a badge tap afterward.
- **Save and load:** `saveBattleState` writes `round` and `phase`, and
  `loadBattleState` copies them into the returned state.
- **Validation:** `isValidPersistedBattleState` also requires `round` to
  be an integer ≥ 1 (`Number.isInteger`, since `isNumberInRange` accepts
  fractions) and `phase` to be one of `BATTLE_PHASES`. Anything else
  fails the whole payload, the same clear-on-failure rule as today. There
  is no round ceiling: no rule caps the number of rounds.

## Round and Phase Logic
In `frontend/src/lib/battle/phase.ts`, pure and unit-tested in
`phase.test.ts`:

```ts
export type RoundPosition = { round: number; phase: BattlePhase };

/** The next phase (intent/21): Cleanup moves on to the next round's
 * Orders. */
export function nextPosition(pos: RoundPosition): RoundPosition;

/** The previous phase, or `null` at Round 1, Orders: the battle can't step
 * back past its start (intent's Scope). Orders moves back to the previous
 * round's Cleanup. */
export function previousPosition(pos: RoundPosition): RoundPosition | null;
```

New `BattleAction` variants in `battleReducer`:
- `{ type: "ADVANCE_PHASE" }` sets `round` and `phase` from
  `nextPosition`.
- `{ type: "STEP_PHASE_BACK" }` sets them from `previousPosition`, or
  returns the same state reference when it's `null`.

Neither action touches anything else. No gold, levels, tokens, Ice Wall
or Bear Trap change on a phase step (intent's Out of Scope: no automation
when a phase starts). The initiative pass stays in `useBattle`, so
`battleReducer`'s doc comment ("no mutator ever reads or changes a second
field") still holds for the reducer. The comment gains the round change
as a composed case, next to the defeat move and the level-up HP.

| Before | Step | After | Initiative |
|---|---|---|---|
| R1 Orders | forward | R1 Movement | unchanged |
| R1 Action | forward | R1 Cleanup | unchanged |
| R3 Cleanup | forward | R4 Orders | passes |
| R4 Orders | back | R3 Cleanup | passes back |
| R2 Movement | back | R2 Orders | unchanged |
| R1 Orders | back | R1 Orders (no-op) | unchanged |

## Layout
- **`PhaseControl`** (new, `frontend/src/components/PhaseControl/`, with a
  `.module.css` and a test file like `InitiativeBadge`). It renders two
  pills in one centered group, so each screen renders one element:
  ```ts
  type PhaseControlProps = {
    round: number;
    phase: BattlePhase;
    onAdvance: () => void;
    onStepBack: () => void;
  };
  ```
  - **The round pill** reads "ROUND 3": a small uppercase label (HeroCard's
    `levelLabel` style) and the number. It's read-only, since the round
    only changes through the phase steps (intent's Scope), and has
    `aria-live="polite"`, so a new round is announced.
  - **The phase pill** holds a back button (‹), **all four phases in a row**
    (Orders, Movement, Action, Cleanup), and a forward button (›). The
    current phase is highlighted and the others are muted. The arrows
    move the highlight one phase at a time.
  - The phases are an `<ol>` of `<li>`s, with `aria-current="step"` on the
    current one. They aren't buttons: only the arrows step, so a click
    can never jump across a round (decided on the canvas).
  - The arrows are real `<button type="button">`s whose `aria-label`s
    name where they go ("Back to Round 3, Action", "Forward to Round 4,
    Orders (passes initiative)"), so a screen reader hears that a step
    starts a new round. The same text goes in their `title`. Whether a
    step crosses a round comes from `phase.ts`'s `crossesRound`, the same
    rule `useBattle` uses to pass initiative.
  - The back button is `disabled` at Round 1, Orders.
  - The phase names live in the component as `PHASE_LABELS`, keyed by
    `BattlePhase`, like `InitiativeBadge`'s `PLAYER_LABELS`.
  - **No phase summary** (decided on the canvas, the intent's name-only
    option). A reminder of what each phase involves is left to the
    "Show token and Artifact rules in the app" backlog item.
  - Stateless: it re-renders from its props.
- **Placement: the center of the shared top bar.** Both screens'
  `.topBar` is a `space-between` flex row with `ViewToggle` on the left
  and `.topBarActions` (initiative badge + ⋯ menu) on the right. The
  middle is empty today, so `PhaseControl`'s centered group goes there,
  in the same place on both screens.
  Switching Board ⇄ Map doesn't move them (as with the badge, spec 05).
- **Height at 1280x800.** Both pills are 32px tall like the initiative
  badge and the ⋯ button, so the top bar doesn't grow. The Board's team
  panels and the Map's board area keep their space (intent's
  Constraints).
  - **Width.** The middle of the bar has about 600-700px at 1280px wide,
    after `ViewToggle`, the badge, the menu and the 40px side padding.
    The round pill and the four-phase row together take about 520px, so
    they fit. Check it in the browser on the Map, whose bar is the
    narrower (Open Items).
- **Screen props:** `BattleBoardScreen` and `BattleMapScreen` each gain
  `onAdvancePhase: () => void` and `onStepPhaseBack: () => void`. Round
  and phase come from the `battleState` prop they already take.
- **`WinScreen`** shows the round the game ended in, under the heading
  ("Player 1 Wins!" / "Draw"), e.g. "in Round 7" as a subtitle in the
  title block. It reads `battleState.round`, which it already gets, so
  there are no new props. The phase isn't shown there.
- **Not shown** on `ResultsScreen` (before the battle) or the Draft
  screens.

## UI Design Reference
On the same canvas as intents 01-20 ("BfbHelper — App Flow"):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

Drawn in version 101:

- **"Battle Board", "Battle Map" and "Battle Map — Arena":** two pills sit
  in the middle of each top bar, between the Board/Map toggle and the
  initiative badge. Both are the canvas badge's height.
  - **The round pill** reads "ROUND 3": a small muted uppercase label
    and the number in Cinzel. It has no controls.
  - **The phase pill** holds a ‹ button, the four phase names in small
    Cinzel caps, and a › button (inline SVG chevrons). The current phase
    is filled in gold with dark text; the others are muted text on the
    pill.
  - The prototype works: › and ‹ move the highlight. Going past Cleanup
    wraps it back to Orders, adds 1 to the round pill and passes
    initiative on the badge next to it, and stepping back undoes that.
    ‹ is disabled at Round 1, Orders.
  - The arrows' `aria-label`s name the destination ("Forward to
    Round 4, Orders (passes initiative)").
  - One tweak, `phaseStart`: Round 3 Cleanup by default, or Round 1
    Orders.
  - Each artboard keeps its own prototype state, as with the initiative
    badge (spec 05).
- Earlier versions tried one combined "‹ Round 3 Cleanup ›" pill (98) with
  the phase summary beside it. The summary was dropped (99) and the round
  split into its own pill (100) before settling on the four-phase row.
- **"Win Screen":** a muted "in Round 7" line under the "Player 1 Wins"
  heading.

As with earlier intents, the canvas is a prototype for visual direction
only. Once it's drawn, a revised canvas wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- ~~Draw `PhaseControl`, its summary and the Win screen's round on the
  canvas, then rewrite UI Design Reference to describe them.~~
  **Decided:** drawn on the canvas, signed off at version 101 (UI Design
  Reference).
- ~~Check at 1280x800 whether the Cleanup summary fits on the top bar's
  line on both screens, and settle the summaries' wording.~~
  **Decided:** no summary, phase names only (UI Design Reference).
- ~~Whether the forward button also names the next phase visibly.~~
  **Decided:** all four phases are always shown, with the current one
  highlighted, so the next phase is always in view.
- Check at 1280x800 that the round pill and the four-phase row fit in
  the Map's top bar alongside the toggle and the initiative badge.
- Tests:
  - `phase.test.ts` covers the table above.
  - `reducer.test.ts`: the two new actions change only `round` and
    `phase`, and `STEP_PHASE_BACK` at Round 1, Orders returns the same
    reference.
  - `useBattle.test.tsx`: advancing from Cleanup passes initiative,
    stepping back from Orders passes it back, other steps leave it alone,
    and `passInitiative` leaves the round and phase alone.
  - `storage.test.ts`: a schema-15 payload upgrades to Round 1, Orders,
    an older one chains to 16, and a bad `round` (0, 1.5, a string) or
    `phase` clears the payload.
  - `PhaseControl.test.tsx`: all four phases render with
    `aria-current="step"` on the current one only, the back button is
    disabled at Round 1, Orders, the arrows call their callbacks, and the
    round shows with no buttons of its own.
  - `WinScreen.test.tsx`: the round line.
  - A new `e2e/round-and-phase.spec.ts`: step through a round on the
    Board, see Round 2 and the initiative pass on the Map, step back, and
    reload to check it's kept.
