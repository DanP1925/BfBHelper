# Spec 25: Cleanup Gold

> **BUILT.** Architecture for intent 25's scope, all built in one PR. See
> [../intent/25_cleanup-gold.md](../intent/25_cleanup-gold.md) for the
> product-level problem, scope, and behavior this spec exists to satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-24: React + TypeScript,
  Next.js, static build, no backend.
- **The gold is composed into `useBattle`'s `stepPhase`,** next to the
  initiative pass it already composes (spec 21). A phase step that enters
  Cleanup from Action adds 2 to each team's gold through `SET_GOLD`, and
  the step back from Cleanup to Action takes 2 off. `battleReducer` keeps
  one field per action, as in specs 19, 21 and 22.
- **One new pure rule in `lib/battle/phase.ts`,** `cleanupGoldChange`,
  next to `crossesRound`, so the "which step pays" rule lives in one
  place.
- **No new state, no schema change** (intent's Constraints). The gold
  added or taken back is ordinary team gold.
- **What doesn't change:** the reducer's `ADVANCE_PHASE` and
  `STEP_PHASE_BACK` (they still move only the round and phase), the
  initiative pass, `setGold` and the Board's gold field, `setHeroLevel`
  and its costs (spec 22), the gold piles on the Map, `PhaseControl` and
  every screen's layout. No cue is added (intent's Scope).

## State Management
- **`stepPhase` (`frontend/src/lib/useBattle.ts`)** becomes:
  ```ts
  function stepPhase(prev: BattleState, type: "ADVANCE_PHASE" | "STEP_PHASE_BACK"): BattleState {
    const afterStep = battleReducer(prev, { type });
    // A no-op step (the same reference) never crosses a round or pays gold.
    if (crossesRound(prev, afterStep)) return battleReducer(afterStep, { type: "PASS_INITIATIVE" });
    const gold = cleanupGoldChange(prev, afterStep);
    if (gold === 0) return afterStep;
    return SIDES.reduce(
      (state, side) =>
        battleReducer(state, { type: "SET_GOLD", side, value: state[side].gold + gold }),
      afterStep,
    );
  }
  ```
  - **Both teams, always the same amount** (rulebook p. 12). The
    initiative holder doesn't matter.
  - **Never below 0** comes from `SET_GOLD`'s existing `clampGold`: a
    team with 1 gold stepping back ends at 0 (intent's Scope). Nothing
    remembers the shortfall, so stepping forward again pays the full 2.
  - **A round crossing and a Cleanup payment never happen on the same
    step,** so the early return for the initiative pass is safe.
  - **`SIDES` is shared, not copied.** `lib/battle/arena.ts` has a private
    `SIDES: readonly PlayerId[] = ["p1", "p2"]`. It moves to
    `constants.ts` as an export, and `arena.ts` and `useBattle` both
    import it.
- **`advancePhase` and `stepPhaseBack` keep their signatures.** Their doc
  comments on `UseBattleResult` gain the gold: "Action → Cleanup also
  gives each team 2 gold (intent/25)" and "Cleanup → Action takes it back,
  never below 0".
- **No wiring changes** in `page.tsx` or the screens: the gold arrives
  with the `battleState` they already get.

## Data Model
- **`frontend/src/lib/battle/constants.ts`:**
  ```ts
  /** The gold each team gains at the start of Cleanup (rulebook p. 12,
   * intent/25). */
  export const CLEANUP_GOLD = 2;
  ```
- **`SIDES`** moves here from `arena.ts`, exported (see State
  Management).
- **No change** to `BattleState`, `HeroBattleState`, the reducer's
  actions or `persistence/schema.ts`. `CURRENT_BATTLE_SCHEMA_VERSION`
  stays as it is, so saved battles load unchanged (intent's Constraints).
- **The reducer's doc comments** gain intent 25 as a composed case: the
  `battleReducer` comment next to the initiative pass, and the
  `ADVANCE_PHASE` comment's "no gold" becomes "no gold (useBattle adds
  Cleanup's, intent/25)".

## Cleanup Gold Logic
In `frontend/src/lib/battle/phase.ts`, pure and unit-tested in
`phase.test.ts`:

```ts
/** The gold each team gains or gives back on a step from `from` to `to`
 * (intent/25): +2 entering Cleanup from Action, −2 stepping back from
 * Cleanup to Action, else 0. Stepping back from Orders into the previous
 * round's Cleanup pays nothing: the gold was paid on the way in. */
export function cleanupGoldChange(from: RoundPosition, to: RoundPosition): number;
```

- It compares phases only within the same round, so the
  Orders → Cleanup step back (a round crossing) gives 0.
- A no-op step (`from` equal to `to`) gives 0.

| From | Step | To | Gold per team |
|---|---|---|---|
| R1 Movement | forward | R1 Action | 0 |
| R1 Action | forward | R1 Cleanup | +2 |
| R1 Cleanup | forward | R2 Orders | 0 (passes initiative) |
| R2 Orders | back | R1 Cleanup | 0 (passes initiative back) |
| R1 Cleanup | back | R1 Action | −2, never below 0 |
| R1 Orders | back | R1 Orders | 0 (no-op) |

## Layout
- **No layout change.** Team gold shows only on the Battle Board, in
  `BattleTeamPanel`'s gold field, and it already re-renders from
  `battleState`. The Map shows no team gold, and its gold piles aren't
  touched.
- **No cue** (intent's Scope): no "+2" note, toast or animation.
- **`PhaseControl`'s arrow labels don't change.** They mention the
  initiative pass but not the gold, which keeps the "no cue" decision.

## UI Design Reference
On the same canvas as intents 01-24 ("BfbHelper — App Flow"):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

No artboard changes: nothing new is drawn. On "Battle Board" and "Battle
Map", the phase control and the Board's team gold field look the same.
Only the gold number changes, as it already does when typed in.

This is a prototype for visual direction only, the same caveat as earlier
intents' references. If a revised canvas supersedes these choices, it
wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- ~~Check existing tests that step into Cleanup, in `useBattle.test.tsx`,
  `e2e/round-and-phase.spec.ts` and any other e2e spec, for gold
  assertions the +2 now breaks.~~ **Decided:** none did. Their Cleanup
  cases check round, phase and initiative only, and the full Vitest and
  Playwright runs stayed green.
- Tests:
  - `phase.test.ts`: `cleanupGoldChange` for every row of the table above.
  - `useBattle.test.tsx`: an `advancePhase / stepPhaseBack (intent/25)`
    block:
    - Action → Cleanup gives both teams 2 and persists it;
    - Cleanup → Action takes 2 back, and a team with 1 ends at 0;
    - Cleanup → Orders and Orders → Cleanup leave gold alone;
    - stepping forward again after a short step back pays the full 2;
    - a level-up in Cleanup, refunded by a level-down, then a step back
      restores both teams' gold from before Cleanup (intent's Proposed
      Outcome).
  - `e2e/round-and-phase.spec.ts`, or a new `e2e/cleanup-gold.spec.ts`:
    step to Cleanup and see both gold fields at 2, reload to check it's
    kept, then step back and see 0.
