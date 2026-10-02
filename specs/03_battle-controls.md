# Spec: BfbHelper v3 — Battle Controls

> **DRAFT.** Architecture for intent 03's scope. Build-out has not started
> yet. See [../intent/03_battle-controls.md](../intent/03_battle-controls.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as v1/v2 — React + TypeScript, Next.js,
  static build, no backend.
- No new screen-level component family beyond one addition: a **Win
  Screen**, sitting alongside `StartScreen` / `DraftBoardScreen` /
  `ResultsScreen` / `BattleBoardScreen`. Everything else is new
  controls/state layered onto the existing Battle Board.

## State Management
- New hook `useBattle(p1Heroes, p2Heroes)`
  (`frontend/src/lib/useBattle.ts`), parallel in shape to `useDraft`:
  - Inactive (`state === null`) whenever either heroes array is empty —
    i.e. before a draft is done. Once both are non-empty (Battle Board
    reachable), an effect hydrates `state`:
    - If a persisted `BattleState` exists (see Data Model) **and** its
      hero id sets exactly match `p1Heroes`/`p2Heroes`, load it —
      handles a reload mid-battle.
    - Otherwise, build a fresh default `BattleState` from the heroes'
      `baseHp` plus the existing intent-02 constants
      (`TOWER_STARTING_HP`, `BIT_STARTING_HP`, `HERO_STARTING_LEVEL`,
      `TEAM_STARTING_GOLD`) and persist it immediately — this is what
      "starting a battle" means now; there's no separate init action.
    - The hero-id-set check is belt-and-suspenders: `clearDraft()`
      already wipes battle state on every new draft (below), so a
      mismatch should only happen if storage was hand-edited.
  - When heroes arrays go back to empty (draft left "done" — new draft
    or return to start), `state` resets to `null` in the same effect,
    mirroring how `page.tsx` already resets its own `view` state on
    `draft.phase` leaving `"done"`.
  - A second effect persists `state` via `saveBattleState` on every
    change, mirroring `useDraft`'s `saveDraft` effect.
  - Exposes mutators — `setGold`, `setHeroHp`, `setHeroLevel`,
    `setStructureHp` (all `(side, ...args, value: number) => void`) —
    each clamping to its field's bounds (see Value Bounds below) before
    writing. A ±1 tap and a direct-entry commit both resolve to the same
    mutator call with the already-computed next value; there's no
    separate "tap" vs "type" action type.
  - Exposes `winner: PlayerId | "draw" | null`, derived each render via
    a pure selector (`getBattleWinner`, `lib/battle/selectors.ts`): `null`
    unless some side's Bit is at 0 HP, `"draw"` if both are (simultaneous
    zero is only reachable by direct-entry, not normal play, but needs a
    defined answer), otherwise the side whose Bit is *not* at 0.
- `clearDraft()` (`lib/persistence/storage.ts`) additionally removes the
  persisted `BattleState` key, for the same structural reason it already
  removes `bfbhelper:battle-view`: neither means anything without the
  draft they belong to.
- `view` in `page.tsx` gains a third value: `"results" | "battle" |
  "win"`. The existing `loadBattleView`/`saveBattleView` pair (storage.ts)
  is generalized to `loadView(): View` / `saveView(view: View)` — same
  mechanics (only non-default values are written; absence means
  `"results"`), just a third literal instead of a boolean-ish check.
  This supersedes specs/02's description of those two helpers.

## Data Model
- New file `frontend/src/lib/battle/types.ts`:
  ```ts
  export type StructuresState = {
    top: number;
    middle: number;
    bottom: number;
    bit: number;
  };

  export type BattleTeamState = {
    gold: number;
    heroes: Record<HeroId, { hp: number; level: number }>;
    structures: StructuresState;
  };

  export type BattleState = {
    schemaVersion: 1;
    p1: BattleTeamState;
    p2: BattleTeamState;
  };
  ```
  `heroes` is keyed by `HeroId` rather than array position — each team's
  4 drafted heroes are already unique ids, and keying by id makes a
  mutator's job (`setHeroHp(side, heroId, value)`) a direct lookup
  instead of an index search.
- New constant, `frontend/src/lib/battle/constants.ts`:
  `HERO_HP_CEILING = 15`. The existing `TOWER_STARTING_HP`/
  `BIT_STARTING_HP` now double as each structure's HP *ceiling* too, not
  just its starting value — a structure can't be healed past full.
- New `frontend/src/lib/battle/bounds.ts` — one clamp helper per field
  (`clampHeroHp`, `clampHeroLevel`, `clampGold`, `clampStructureHp`),
  each a thin wrapper around a shared `clamp(value, min, max)`. Centralizes
  the Value Bounds table below into one place every mutator and every
  direct-entry input calls through, instead of each call site
  reimplementing its own min/max check.
- `Hero.baseHp` (`lib/draft/types.ts`) keeps its existing meaning
  unchanged — the printed card HP — but changes role: it's now only the
  *initializer* for a fresh `BattleState`'s hero HP, not what the Battle
  Board renders. Rendered HP comes from `BattleState` from this point on.
- New persistence key and type, `lib/persistence/schema.ts`:
  `BATTLE_STATE_STORAGE_KEY = "bfbhelper:battle-state"`,
  `PersistedBattleStateV1` (mirrors `BattleState` plus `schemaVersion: 1`).
  `loadBattleState`/`saveBattleState` in `storage.ts` follow the same
  pattern as `loadDraft`/`saveDraft`: parse, check `schemaVersion`,
  structurally validate (right shape, numeric fields within each field's
  floor/ceiling, hero id keys drawn from `HERO_IDS`), clear-and-return-
  `null` on any failure rather than throwing. This validation is generic
  (doesn't know about a specific draft's picks) — the hero-id-*set*-match
  check against the current draft's heroes happens in `useBattle`, above.

## Battle Logic
- Every mutator is a pure clamp-and-replace on one field — no mutator
  ever reads or changes a second field (no gold-on-level-up, no
  HP-from-level, no Tower-to-Bit chip damage), matching intent's
  player-driven-only scope.
- Win condition: `getBattleWinner` is the only place battle state is
  *read* for a derived conclusion rather than just displayed. "End
  Battle" (available whenever `winner !== null`) sits in the new
  `OverflowMenu`, below, not inline on the Battle Board. Clicking it
  opens a confirmation dialog (new shared `ConfirmDialog` component,
  below); confirming sets `view = "win"` (and persists it via
  `saveView`). Canceling or dismissing the dialog leaves the Battle Board
  exactly as it was — `winner` keeps being re-derived from live state
  every render, so a misclick that's then corrected (HP nudged back
  above 0) removes the menu item on its own, no extra reset logic
  needed.

## Layout
- **`NumberStepper`** (new, `frontend/src/components/NumberStepper/`) —
  the one control every editable value (gold, hero HP, hero level,
  structure HP) is built from: a "–" button, a numeric `<input
  type="number">` showing the current value, and a "+" button. The
  input is always directly editable (typing a new number and committing
  with Enter/blur), not a separate tap-to-reveal edit mode, satisfying
  the ±1-tap and direct-entry requirement with one control. Props:
  `value`, `min`, `max?`, `onChange(next: number)`, `label` (for
  `aria-label`s). The buttons disable themselves at `min`/`max`; a typed
  value is clamped on commit (so e.g. typing "99" into hero HP settles
  at 15, not silently rejected); an invalid/empty commit reverts to the
  last valid value.
- **`HeroCard`'s `"battle"` variant** (`components/HeroCard/HeroCard.tsx`)
  changes from a static display to this intent's live one:
  - New props: `hp: number` (replaces reading `hero.baseHp` directly —
    `baseHp` is no longer rendered here), `onHpChange?`, `onLevelChange?`.
  - When `onHpChange`/`onLevelChange` are provided (Battle Board), the HP
    badge and level meter each render a `NumberStepper` instead of plain
    text — `onHpChange`/`onLevelChange` wired to `setHeroHp`/
    `setHeroLevel` through `clampHeroHp`/`clampHeroLevel`.
  - When they're omitted (Win Screen), HP/level render as the existing
    plain text/pips — read-only, no behavior change needed for that case.
  - `hp === 0` adds a "defeated" styling class (desaturated token art +
    a small "Defeated" tag) regardless of which mode it's in — purely a
    function of the `hp` prop, clearing the instant `hp` is raised above
    0 again.
- **`StructureSlot`** (`components/StructureSlot/StructureSlot.tsx`)
  gains `onHpChange?: (value: number) => void` (wired to
  `setStructureHp` through `clampStructureHp`, rendering a
  `NumberStepper` in place of the plain `{hp} HP` text when present) and
  `reactiveStyling?: boolean`. `BattleTeamPanel` passes
  `reactiveStyling` for the 3 Tower slots only (adds a "destroyed"
  class at `hp === 0`) — the Bit slot omits it, per intent: the Bit's
  zero-HP state drives the win condition, not a cosmetic style, and
  getting both at once on the same number would be visually redundant.
- **Gold** moves from `BattleTeamPanel`'s static gold badge text to a
  `NumberStepper` in the same spot (icon + stepper instead of icon +
  plain text), floor 0, no `max`.
- **`ConfirmDialog`** (new, `frontend/src/components/ConfirmDialog/`) —
  a small, framework-free modal (no new dependency; nothing like it
  exists yet in `package.json`): a title, a body line, Cancel/Confirm
  buttons, `role="dialog"` + `aria-modal="true"`, closes on Escape or a
  backdrop click (treated as Cancel). Generic enough to reuse if a
  future intent needs another confirm step, but only "End Battle" uses
  it here.
- **`OverflowMenu`** (new, `frontend/src/components/OverflowMenu/`) —
  a small icon button (⋯, top corner of `BattleBoardScreen`, replacing
  its current footer) that opens a short dropdown list. Per intent:
  "New Draft" and "End Battle" are both exceptional, rarely-tapped
  actions next to the continuous HP/level/gold adjustments this intent
  adds, so neither sits inline on the main battle view any more.
  - "New Draft" (`draft.returnToStart`) is always in the list — this
    moves it out of intent 02's always-visible footer link; this spec
    supersedes that description.
  - "End Battle" is only in the list when `winner !== null`, opening
    `ConfirmDialog` as described above; the menu itself closes first
    (standard menu-item-click behavior) so the dialog isn't stacked
    under it.
  - A generic `{ label, onSelect, disabled? }[]` items prop, so it's not
    hardcoded to these two actions if a later intent adds a third.
    Closes on Escape, a click outside, or selecting an item.
- **`WinScreen`** (new,
  `frontend/src/components/screens/WinScreen/`) — two-panel layout
  reusing `BattleBoardScreen`'s panel grid structure (not
  `ResultsScreen`'s, since Results' panels are plain, equal-weight
  columns and this needs one panel visually emphasized):
  - Each panel renders its team's 4 heroes via `HeroCard` `"battle"`
    variant in read-only mode (final `hp`/`level` from `BattleState`, no
    change handlers), in the team's existing slot order — no sorting.
  - No Structures section on either panel.
  - The winning side's panel gets an emphasized treatment — the mockup
    (UI Design Reference below) uses a gold border glow plus a "Winner"
    ribbon; on a `"draw"`, neither panel is emphasized and the heading
    reads "Draw" instead of naming a winner.
  - Footer has only "← New Draft" (`draft.returnToStart`, same as the
    other screens) — no action returns to the Battle Board.
- `page.tsx` wiring: compute `p1Picks`/`p2Picks` once, unconditionally
  (currently only computed inside the `phase === "done"` branch), since
  `useBattle` needs them on every render to decide whether it's active.
  Render `WinScreen` when `view === "win"`, same pattern as the existing
  `view === "battle"` branch.

## UI Design Reference
Two new artboards were added to the same Claude design artifact as
intents 01-02 ("BfbHelper — App Flow"), right after the Battle Board:
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK
- **"Battle Board — Controls"** — the Battle Board with every editable
  value wired to a working `NumberStepper` (±1 buttons plus a typable
  number field between them, matching this spec's Layout section), a
  hero shown defeated, a Tower shown destroyed, and a team's Bit already
  at 0 HP so the "End Battle" button and its confirmation dialog are
  live and clickable.
- **"Win Screen"** — the two-panel layout with the winning team's panel
  emphasized (gold glow + "Winner" ribbon) and the losing team's panel
  dimmed; a `winner` tweak (p1/p2/draw) previews all three outcomes,
  including the "draw" case from this spec's Battle Logic section.
This is a prototype for visual direction only, same caveat as intents
01-02's references — not implemented code, and expected to evolve
during build-out. It resolves (as a starting point, not a final
decision) the visual polish this spec left open above: the defeated/
destroyed treatment is a grayscale image filter plus a small tag, and
the winner emphasis is a gold border glow plus ribbon. If a revised
mockup supersedes these choices, it wins over what's written here.

## Deployment
No change from v1/v2 — same static Vercel deployment, no new infra.

## Open Items for Implementation (not yet decided)
- `ConfirmDialog`'s exact visual styling — the mockup doesn't include
  one; it's functionally specified above, not styled.
- Whether `NumberStepper`'s numeric input should also constrain keystrokes
  live (e.g. blocking a `-` keypress on a floor-0 field) or only clamp on
  commit — either satisfies the Value Bounds table; this is a minor UX
  polish call for implementation.
