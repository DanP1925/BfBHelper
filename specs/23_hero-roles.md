# Spec 23: Hero Roles

> **BUILT.** Architecture for intent 23's scope, all built in one PR. See
> [../intent/23_hero-roles.md](../intent/23_hero-roles.md) for the
> product-level problem, scope, and behavior this spec exists to satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-22: React + TypeScript,
  Next.js, static build, no backend.
- **The role is static hero data.** Each `Hero` in `data/heroes.ts` gains
  a `role`, next to `className` and `baseHp`. Nothing derives it at
  runtime.
- **The filter is local UI state on `DraftBoardScreen`.** It's not
  part of `DraftState`, isn't dispatched and isn't saved (intent's
  Constraints and Session Lifecycle). The screen filters the pool it
  already receives before handing it to `HeroPool`.
- **A new `RoleFilter` component** renders the four options with their
  counts. It's presentational: it gets the counts and the active role,
  and reports a click.
- **The role logic is pure functions in `lib/draft/roles.ts`**: counting
  the remaining heroes per role and filtering the pool. Both are
  unit-tested.
- **What doesn't change:** `DraftState`, `draftReducer`, the step
  sequence and selectors, `useDraft`, the draft persistence schema,
  `page.tsx`'s wiring, `TeamPanel`, `TurnBanner`, `ResultsScreen`, every
  battle screen, and `HeroCard`'s pool variant (no role label on the
  card, per intent's Scope).

## State Management
- **`DraftBoardScreen`** holds the filter as:
  ```ts
  /** The role chosen, and the draft step (one player's turn) it was
   * chosen in. */
  const [roleChoice, setRoleChoice] = useState<{ step: number; role: HeroRole } | null>(null);
  ```
  The active filter is derived on each render:
  ```ts
  const counts = countRemainingByRole(pool);
  const activeRole: RoleFilterValue =
    currentTurnPlayer !== null &&
    roleChoice?.step === stepNumber &&
    counts[roleChoice.role] > 0
      ? roleChoice.role
      : "all";
  ```
  - **Back to All when the turn passes** (intent's Scope). A step is
    exactly one player's turn (`getCurrentTurnPlayer` alternates by
    step), so a choice applies only within the step it was made in. The
    filter reads All once the step changes, without an effect or a reset
    call. Keying on the step rather than the player matters: steps 1, 3
    and 5 are all the initiative player's, and their step-1 choice must
    not come back in step 3.
  - **Back to All when the role runs out.** If the chosen role's count
    drops to 0 mid-step (e.g. Player 2 filters Support and drafts the
    last two Supports in one step), the filter reads All. It follows from
    the intent's "an option with 0 left can't be selected": the empty
    role can't stay selected either.
  - **Done and reload.** Once the draft is done, `currentTurnPlayer` is
    null, so the filter reads All. A reload remounts the screen with
    `roleChoice` null, so it reads All (intent's Session Lifecycle).
  - **New Draft.** The screen's New Draft handler clears `roleChoice`
    before calling `onNewDraft`, so a choice from step 1 of the old
    draft can't match step 1 of the new one.
- **Picking doesn't reset it.** Within a two-pick step the filter stays
  on the chosen role after the first pick, so a player can draft two of
  the same role without choosing it again.
- `onPick` and `onFinalPickLanded` are unchanged, and `page.tsx` passes
  the same props as today.

## Data Model
- **`lib/draft/types.ts`:**
  ```ts
  /** The project owner's own hero roles (intent/23), not the rulebook's
   * printed Type. Every hero has exactly one. */
  export type HeroRole = "damage" | "utility" | "support";
  ```
  `Hero` gains a required `role: HeroRole`.
- **`data/heroes.ts`:** each of the 19 entries gets its role, from the
  intent's Scope:
  - `"damage"`: agatha-trunch, boreas, cynthia, dolgolae, felix,
    kunoichi, sterling, vladiator (8).
  - `"utility"`: ceralin, dazeem, ken-obi, kerrick, longshanks, motley,
    runika, sedusa (8).
  - `"support"`: baldwin, caligar, cyrus (3).
- **No schema change** (intent's Constraints). Draft state stores hero
  ids only, and `role` is read from the roster, so the draft and battle
  schemas stay as they are and existing saves load unchanged.
- **Test fixtures typed `Hero`** gain a `role` to keep type-checking:
  `reducer.test.ts`, `useBattle.test.tsx`, `storage.test.ts`,
  `RespawnAreaStrip.test.tsx`, `WinScreen.test.tsx` and
  `BattleMapScreen.test.tsx`.

## Role Logic
In `frontend/src/lib/draft/roles.ts`, pure and unit-tested in
`roles.test.ts`:

```ts
export type RoleFilterValue = "all" | HeroRole;

/** The filter's options in display order, with their labels (intent/23). */
export const ROLE_FILTER_OPTIONS: Array<{ value: RoleFilterValue; label: string }> = [
  { value: "all", label: "All" },
  { value: "damage", label: "Damage" },
  { value: "utility", label: "Utility" },
  { value: "support", label: "Support" },
];

/** How many of `pool`'s heroes are in each role, plus "all". */
export function countRemainingByRole(pool: readonly Hero[]): Record<RoleFilterValue, number>;

/** `pool` narrowed to one role, in its existing order; "all" returns it as is. */
export function filterPoolByRole(pool: readonly Hero[], role: RoleFilterValue): Hero[];
```

- **The order stays alphabetical** (intent's Scope). `filterPoolByRole`
  keeps the pool's order rather than sorting, and the pool already
  arrives in roster order.
- The counts are over the remaining pool, so they fall as heroes are
  drafted: at the start Damage 8, Utility 8, Support 3 and All 19.

Cases, following the intent's Proposed Outcome:

| Situation | Counts (All / D / U / S) | Filter reads |
|---|---|---|
| Draft start | 19 / 8 / 8 / 3 | All |
| P1 picked Caligar; P2's turn, chose Support | 18 / 8 / 8 / 2 | Support: Baldwin, Cyrus |
| P2 picked Cyrus, still their step, chose Damage | 17 / 8 / 8 / 1 | Damage |
| P2 picked Sterling; turn passes to P1 | 16 / 7 / 8 / 1 | All |
| Baldwin drafted | … / 0 for Support | Support can't be selected |
| Chosen role drafted out mid-step | that role 0 | All |
| Draft done, or reload | – | All |

## Layout
- **`RoleFilter` (`components/RoleFilter/RoleFilter.tsx`):** a row of
  four buttons, one per `ROLE_FILTER_OPTIONS` entry, each reading its
  label and its count (e.g. "Support 2").
  ```ts
  type RoleFilterProps = {
    active: RoleFilterValue;
    counts: Record<RoleFilterValue, number>;
    onSelect: (role: RoleFilterValue) => void;
  };
  ```
  - `role="group"` with `aria-label="Filter heroes by role"`. Each
    button has `aria-pressed` for the active option, like
    `ViewToggle`.
  - An option with a count of 0 is `disabled` (intent's Scope). "All"
    is never 0 while the board shows, since the draft ends at 8 of 19.
  - Clicking the active option is a no-op.
  - Its look follows `ViewToggle`'s pill-group style, as drawn on the
    canvas (see UI Design Reference).
- **`DraftBoardScreen`** places `RoleFilter` above `HeroPool`, in the
  middle column between the two `TeamPanel`s. The pool and the filter
  become one column (a wrapper with `flex-direction: column`), so the
  filter takes its height from the pool, not from the header or the
  team panels. `HeroPool` gets `filterPoolByRole(pool, activeRole)`.
- **Fit at 1280x800** (intent's Constraints). `HeroPool`'s
  `useFitGrid` sizes the cards to the space it's given, so the filter's
  row shrinks the pool area rather than adding a page scroll. With all
  19 heroes the pool may drop to a smaller card or scroll sooner, as it
  already does below `MIN_CARD_WIDTH`. Checked in the browser (Open
  Items): the cards keep their size. A filtered pool has fewer cards, so
  they grow up to `MAX_CARD_WIDTH`.
- **The pick animation (intent 10).** `useDraftPickAnimation` keeps
  receiving the full `pool`, not the filtered one: it uses it to tell
  whether a pick committed. Its FLIP glide only moves cards it measured
  at the tap. When a pick brings back cards the filter hid (the turn
  passes and the filter goes back to All), gliding the few measured ones
  would drag them, at their larger filtered size, across the new cards.
  So `glide` fades every pool card in at its new layout instead
  (opacity 0 → 1, `POOL_GLIDE_MS` after `PICK_FADE_MS`, like the glide).
  The picked card's fade-out and the slot reveal are unchanged, and a
  pick that brings nothing back glides as before.

## UI Design Reference
On the same canvas as intents 01-22 ("BfbHelper — App Flow"):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

Drawn in version 106, on the **"Draft"** and **"Draft — Mid-Selection"**
artboards:

- **The filter row** sits above the pool, left-aligned in the middle
  column, 14px above the grid. It's a pill group: a `#241d17` track with
  a 1px border, and four pill buttons reading the label (14px, semibold)
  and the count (12px), e.g. "Support 3".
- **Selected** is a gold pill (`--color-gold`) with dark text, like
  `ViewToggle`'s pressed option. **Unselected** is plain light-muted
  text. **0 left** is dimmed (`#5c5142`) and can't be clicked.
- **"Draft"** opens at step 1 on All 19 · Damage 8 · Utility 8 ·
  Support 3. **"Draft — Mid-Selection"** opens at step 3 with Player 1
  filtering Damage (7 left), so only Damage heroes show.
- **Its prototype behaves as specced.** Choosing a role narrows the
  pool, the counts drop with each pick, and the filter goes back to All
  when the step changes or the chosen role runs out. New Draft clears it.
- The canvas's pool is a fixed 5-column grid that scrolls, not the
  app's fit-to-screen grid, so it doesn't show how much the row shrinks
  the cards at 1280x800 (Open Items).

This is a prototype for visual direction only, the same caveat as earlier
intents' references. If a revised canvas supersedes these choices, it
wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- ~~Draw the role filter on the canvas's draft artboard (its place above
  the pool, the counts, the selected and empty states), and get sign-off
  before building the UI.~~ **Decided:** drawn in version 106 on the
  "Draft" and "Draft — Mid-Selection" artboards, signed off 2026-10-28.
- ~~Check in the browser at 1280x800 and 2560x1440 that the filter row
  doesn't add a page scroll, and how much it shrinks the 19-hero pool's
  cards.~~ **Decided:** no page scroll at either size, with All, a
  filtered role or a role at 0. At 1280x800 the 19 cards stay 121x168,
  the same as before: the row only moves the grid down, and the pool
  scrolled before and still does. Support's 3 cards grow to 167px wide
  (height-bound), and Damage's 8 fit without scrolling. At 2560x1440
  cards reach their 260px cap. There the grid is narrower than its
  column and centred, so the left-aligned filter starts about 85px left
  of the cards; left as it is.
- ~~Check that the pick animation reads well when the filter goes back to
  All as the turn passes, with hidden cards appearing un-animated. If it
  doesn't, the fallback is to fade them in.~~ **Decided:** it didn't. The
  remaining filtered cards glided over the new ones for about 300ms. Built
  with the fallback, widened to the whole pool (see Layout), signed off
  2026-10-28.
- Tests (built as listed, plus a `useDraftPickAnimation` test for the
  fade-in, and the `role` added to six `Hero` test fixtures):
  - `roles.test.ts`: `countRemainingByRole` and `filterPoolByRole`,
    including order kept and "all" returning the pool, and that the
    roster's counts are 8 / 8 / 3.
  - `RoleFilter.test.tsx`: four options with counts, `aria-pressed` on
    the active one, a 0-count option disabled, click reports the role.
  - `DraftBoardScreen` test: choosing a role narrows the pool; the
    filter stays after a pick within a step; it reads All when the turn
    passes, when the chosen role runs out, and when the same player's
    next step starts.
  - e2e: a new `hero-roles.spec.ts` following the intent's Proposed
    Outcome, plus a reload showing All. `startBattle` in
    `e2e/helpers.ts` picks the first "Pick …" button with the filter on
    All, so it and the specs using it are unaffected.
