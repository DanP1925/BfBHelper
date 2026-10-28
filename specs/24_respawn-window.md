# Spec 24: Respawn Window

> **BUILT.** Architecture for intent 24's scope, all built in one PR. See
> [../intent/24_respawn-window.md](../intent/24_respawn-window.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-23: React + TypeScript,
  Next.js, static build, no backend.
- **One new per-hero field, `respawnWindow`,** on `HeroBattleState`: the
  computed window, or `null` while the hero is standing. Storing the
  result rather than its inputs makes "fixed once set" (intent's Scope)
  hold by construction: nothing recomputes it. It's a battle schema bump
  (16 → 17) with an in-place migration (intent's Constraints).
- **The window is set and cleared in `useBattle.setHeroHp`,** next to the
  defeat move to the respawn area it already composes. A new reducer
  action, `SET_HERO_RESPAWN_WINDOW`, changes only that field, so
  `battleReducer` keeps one field per action, as in specs 19, 21 and 22.
- **One new pure rules module, `lib/battle/respawn.ts`,** holds the card
  count and the window math, like `levelUp.ts` and `phase.ts` hold theirs.
- **Both battle screens read the stored field.** The Board's `HeroCard`
  shows it over a defeated hero's portrait, and the Map's
  `MapTeamStatusPanel` shows it in place of the hero's HP, through one
  shared formatter.
- **What doesn't change:** `setHeroLevel` (a level change never defeats a
  hero or brings one back, spec 19, so it never touches the window), the
  phase control and its actions, `teamLevel` (intent 20), the respawn
  area's drag and drop, `ResultsScreen`, `WinScreen` and the Draft
  screens. Respawning stays manual (intent's Out of Scope): nothing raises
  HP or moves a hero when its window comes.

## State Management
- **`useBattle` (`frontend/src/lib/useBattle.ts`):** `setHeroHp` keeps
  its signature, `(side, heroId, value) => void`. Its body becomes:
  ```ts
  setState((prev) => {
    if (prev === null) return prev;
    const afterHp = battleReducer(prev, { type: "SET_HERO_HP", side, heroId, value });
    if (afterHp === prev) return prev;
    const hp = afterHp[side].heroes[heroId].hp;
    if (hp !== 0) {
      // Back above 0: respawned, or a mistaken 0 fixed (intent/24).
      return battleReducer(afterHp, { type: "SET_HERO_RESPAWN_WINDOW", side, heroId, window: null });
    }
    const window = respawnWindow(afterHp[side], afterHp.round);
    const afterWindow = battleReducer(afterHp, { type: "SET_HERO_RESPAWN_WINDOW", side, heroId, window });
    return battleReducer(afterWindow, { type: "SET_HERO_POSITION", side, heroId, spaceId: null });
  });
  ```
  - **A defeat is any change that lands on 0.** A no-op (0 to 0) returns
    early, so reaching the `hp === 0` branch means the hero was standing
    a moment ago. A new defeat always sets a fresh window, replacing any
    stale one (intent's Scope).
  - **It's computed after the HP change,** so the fallen hero already
    counts as down: the living-heroes count excludes it (intent's
    Proposed Outcome: three standing).
  - **Clearing is unconditional** on any HP above 0. For a hero that was
    already standing the window is `null`, so `SET_HERO_RESPAWN_WINDOW`
    returns the same reference and nothing extra happens.
  - **Fixed once set** (intent's Scope). Nothing else dispatches
    `SET_HERO_RESPAWN_WINDOW`: not `setHeroLevel`, the phase steps, a
    position change or another hero's defeat or respawn.
- **`setHeroLevel` doesn't change.** It dispatches the reducer's
  `SET_HERO_HP` directly, and `hpAfterLevelChange` keeps a defeated hero
  at 0 and a living one at 1 or more, so it can never cross 0 in either
  direction.
- **No new mutator** on `UseBattleResult`, and no wiring changes in
  `page.tsx`: both screens already call `setHeroHp`, and the window
  arrives with the `battleState` they already get. `clearDraft()` already
  removes the persisted battle, so a new draft clears every window
  (intent's Session Lifecycle).

## Data Model
- **`frontend/src/lib/battle/types.ts`:**
  ```ts
  /** The rounds whose Cleanup is expected to draw a defeated hero's card
   * (intent/24): `from` at 8 cards a Cleanup, `to` at one card per living
   * hero. `to` is `null` when no hero was left standing, since the
   * slowest draw is then 0 cards. */
  export type RespawnWindow = { from: number; to: number | null };

  export type HeroBattleState = {
    // …existing fields…
    /** The respawn window (intent/24), set by useBattle.setHeroHp when HP
     * reaches 0, and `null` while the hero is standing. Fixed once set:
     * level changes, phase steps and other heroes' defeats never change
     * it. Cleared when HP goes back above 0. */
    respawnWindow: RespawnWindow | null;
  };
  ```
- **`createInitialHeroState`** (`reducer.ts`) sets `respawnWindow: null`.
- **`battleReducer`** gains
  `{ type: "SET_HERO_RESPAWN_WINDOW"; side; heroId; window: RespawnWindow | null }`,
  written through `setHeroField`. It returns the same reference when the
  window is unchanged (`null` to `null`, or the same `from` and `to`),
  following the no-op convention. The reducer's doc comment gains the
  window as a composed case, next to the defeat move.
- **`frontend/src/lib/persistence/schema.ts`:**
  `CURRENT_BATTLE_SCHEMA_VERSION = 17`, and `BattleState.schemaVersion: 17`.
  - The hero field is added the way spec 17 added the Artifacts: a new
    `LegacyHeroBattleStateV16 = Omit<HeroBattleState, "respawnWindow">`,
    which `LegacyHeroBattleStateV13` now builds on, so no older schema
    gains the field.
  - A new `LegacyBattleTeamStateV16` (heroes of
    `LegacyHeroBattleStateV16`) replaces `BattleTeamState` as the team
    shape of `PersistedBattleStateV14`, so V15 and V16 inherit it.
  - A new `PersistedBattleStateV17` is V16 with `schemaVersion: 17` and
    `p1`/`p2` as `BattleTeamState`. V16's doc comment becomes "now only
    the migration source shape `battleMigrations[16]` upgrades from".
- **Migration:** `upgradeV16ToV17 = addHeroFieldsStep<PersistedBattleStateV17>(17, { respawnWindow: null })`,
  added to `battleMigrations` as `16: upgradeV16ToV17`. A hero already
  at 0 HP shows no window until its next defeat (intent's Constraints).
  `loadPersisted` chains steps, so older saves reach 17 through the
  existing ones.
- **Save and load:** the field lives inside each hero, so
  `saveBattleState` and `loadBattleState` pass it through with `p1` and
  `p2` and only their version literals change.
- **Validation:** `hasValidBattleTeamShape` also requires each hero's
  `respawnWindow` to be `null` or an object with:
  - `from`: an integer ≥ 1 (`Number.isInteger`, as in spec 21's
    `isValidRound`);
  - `to`: `null`, or an integer ≥ `from`.

  Anything else fails the whole payload, the same clear-on-failure rule
  as today. Shape only: it doesn't check that a window sits on a hero at
  0 HP, the way token validation doesn't check who may hold them.

## Respawn Window Logic
In `frontend/src/lib/battle/respawn.ts`, pure and unit-tested in
`respawn.test.ts`:

```ts
/** Each player's starting basic action deck (rulebook p. 6). */
const BASIC_DECK_SIZE = 12;
/** Cards held after every Cleanup draw (rulebook p. 12). Also the
 * fastest draw: discard the whole hand, draw 8. */
const HAND_SIZE = 8;

/** Cards to be drawn before a hero's card that has just gone onto the
 * discard pile (intent/24): every card outside the hand (12 basic plus one
 * power card per level), minus the one on each living hero, which is
 * discarded after it. */
export function cardsAhead(team: BattleTeamState): number;

/** The respawn window for a hero of `team` defeated in `round`
 * (intent/24). `team` is read after the defeat, so the hero is already
 * at 0 HP. The hero's card is the one after `cardsAhead`; the defeat
 * round's own Cleanup is the first draw. */
export function respawnWindow(team: BattleTeamState, round: number): RespawnWindow;
```

- **The card count uses the sum of hero levels,** not `teamLevel`.
  Intent 20's team level counts level-ups (0 to 12), which is the sum of
  levels minus 4. So `cardsAhead` is
  `BASIC_DECK_SIZE + sum of levels − HAND_SIZE − living heroes`, i.e.
  4 + the sum of levels − living heroes. A defeated hero's levels still
  count, since its power cards are still in the deck. Living means
  `hp > 0`.
- **The window**, with `card = cardsAhead + 1`:
  - `from = round + ceil(card / HAND_SIZE) − 1`;
  - `to = round + ceil(card / living) − 1`, or `null` when `living` is 0.
- **No phase is read.** Heroes fall before Cleanup, so the defeat round's
  Cleanup always counts (intent's Scope). A defeat entered during Cleanup,
  after that round's draws, is one round early at both ends. The window
  is an estimate, so that's accepted rather than special-cased.

Cases, per intent's Scope and Proposed Outcome:

| Levels | Living after defeat | Round | Cards ahead | Window |
|---|---|---|---|---|
| 1, 2, 2, 3 | 3 | 3 | 9 | Round 4–6 |
| 1, 1, 1, 1 | 3 | 1 | 5 | Round 1–2 |
| 1, 1, 1, 1 | 2 (second defeat) | 2 | 6 | Round 2–5 |
| 4, 4, 4, 4 | 3 | 5 | 17 | Round 7–10 |
| 4, 4, 4, 4 | 0 | 5 | 20 | Round 7+ |
| 2, 2, 2, 2 | 1 | 4 | 11 | Round 5–15 |

## Layout
- **One formatter, `formatRespawnWindow(window: RespawnWindow, short = false): string`,**
  in `respawn.ts` next to the math, so both screens read the same rule:
  - `from` and `to` differ: "Round 4–6" (an en dash, as in the intent).
  - The same round: "Round 4".
  - `to` is `null`: "Round 4+".
  - `short` swaps "Round " for "R": "R4–6", "R4", "R4+". Only the Map uses
    it (decided on the canvas).

  Only the window is shown, never the round the hero fell (intent's
  Scope).
- **Battle Board: `HeroCard` (`components/HeroCard/HeroCard.tsx`).** The
  battle variant gains an optional prop, `respawnWindow?: RespawnWindow | null`.
  - When the hero is defeated (`hp === 0`) and the window isn't `null`,
    a band over the bottom of the greyed portrait (inside
    `.battleTokenWrapper`, absolutely positioned) shows a small
    "Respawn" label above the long form, e.g. "Round 4–6". Its `title`
    reads "Ceralin respawns Round 4–6".
  - The band sits over the portrait, so the card doesn't grow: the
    Board's hero cards are 172px tall with no spare vertical room
    (spec 22).
  - A defeated hero with no window (a save from before this ships) shows
    no band.
  - `BattleTeamPanel` passes `team.heroes[hero.id].respawnWindow` through.
- **Battle Map: `MapTeamStatusPanel` (`components/MapTeamStatusPanel/`).**
  - **The window replaces the HP** in a defeated hero's row (decided on
    the canvas): "Boreas · R2–4" instead of "Boreas · ♥ 0", in the short
    form. The row keeps one line, so the panel doesn't grow.
  - The row is still dimmed, but the window isn't: `.dimmed` moves from
    the row to its children other than the window.
  - The window has an `aria-label` and `title` with the long form,
    "Boreas respawns Round 2–4". If the row runs short, the name
    truncates first (it already has an ellipsis); the window doesn't
    shrink.
  - **No window, HP as before.** A defeated hero with no window (a save
    from before this ships) still shows "♥ 0", so the row is never
    missing its value.
  - The respawn area isn't used for it: it also holds undeployed heroes,
    and its tokens are drag sources.
- **Not shown** on `ResultsScreen`, `WinScreen` or the Draft screens.

## UI Design Reference
On the same canvas as intents 01-23 ("BfbHelper — App Flow"):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

Drawn in versions 107-110:

- **"Battle Board"** (107): a defeated hero's portrait has a dark band
  across its bottom edge, with "RESPAWN" in small muted caps above the
  window in Cinzel, e.g. "Round 2–4". Boreas starts defeated with
  Round 2–4.
  - Its prototype works: setting a hero's HP to 0 computes its window from
    the round on the phase control, the team's levels and the heroes
    still standing. Raising HP clears it, and a second defeat gets its
    own later window. With a whole team down it shows "Round N+".
- **"Battle Map"** (109): Boreas's row in Player 1's status panel reads
  "Boreas R2–4", the window in Cinzel at full brightness in place of his
  dimmed "♥ 0". It's static on this artboard.
  - Version 107 put it on its own line ("RESPAWN Round 2–4") under the
    name. Version 108 moved it inline between the name and the HP, and
    109 dropped the HP for it.
- **"Battle Map — Arena"** (110): the same change to Boreas's row, so
  both Map artboards match.

This is a prototype for visual direction only, the same caveat as earlier
intents' references. If a revised canvas supersedes these choices, it
wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- ~~Draw the respawn window on the canvas: a defeated hero's card on
  "Battle Board" and its status-panel row on "Battle Map". Get sign-off,
  then rewrite UI Design Reference to describe it.~~ **Decided:** drawn in
  versions 107-110 and signed off 2026-10-28. On the Board it's a band
  over the portrait, and on the Map it replaces the HP, in the short form.
- ~~Check at 1280x800 that the Board's hero card stays 172px tall with the
  band, that the band's "Round 7–10" fits the 80px portrait, and that a
  long name (Agatha Trunch) still leaves the Map's window whole.~~
  **Decided:** it all fits.
  - At 1280x800 and 2560x1440 every hero card stays 172px tall with the
    band, and "Round 7–10" is 66px wide inside the 80px band.
  - On the Map, "Agatha Trunch R7–10" fits its 22px row without
    truncating. The window is at full opacity while the name is at 0.5.
  - Neither page scrolls.
  - A schema-16 save with a hero at 0 HP upgrades in place: "♥ 0" on the
    Map and no band on the Board.
- The reducer's equal-window no-op compares by value through
  `sameRespawnWindow`, exported from `respawn.ts` next to the formatter,
  since `setHeroField`'s `===` would treat every new window object as a
  change.
- Tests:
  - `respawn.test.ts`: `cardsAhead`, `respawnWindow` and
    `formatRespawnWindow`, covering the table above and all three label
    forms, long and short.
  - `reducer.test.ts`: `SET_HERO_RESPAWN_WINDOW` changes only that hero's
    field, and returns the same reference for an unchanged window or an
    unknown hero.
  - `useBattle.test.tsx`: a `setHeroHp (intent/24)` block:
    - a defeat sets the window from the current round, and the fallen
      hero doesn't count as living;
    - a second defeat gets a later window and leaves the first one as is;
    - raising HP from 0 clears it;
    - a later defeat replaces it;
    - level changes and phase steps leave it alone.
  - `storage.test.ts`: a schema-16 payload upgrades with every
    `respawnWindow` at `null`, an older one chains to 17, and a bad window
    (`from` 0 or 1.5, `to` below `from`, a string) clears the payload.
  - `HeroCard.test.tsx` and `BattleMapScreen.test.tsx` (there's no
    separate `MapTeamStatusPanel` test file; the panel is tested through
    the Map screen): the window shows on a defeated hero with one, and not
    on a standing hero or a defeated one without a window. On the Map it
    replaces the HP, and a defeated hero without a window still shows
    "♥ 0".
  - Every older migration test strips `respawnWindow` from its legacy
    payload, through the shared `withoutHeroFields`. The hero fixtures
    get it from `NO_TOKENS` in `src/test/heroState.ts`.
  - A new `e2e/respawn-window.spec.ts`, following the intent's Proposed
    Outcome: defeat a hero in Round 3, see the window on the Board and the
    Map, reload to check it's kept, then raise its HP and see it go.
