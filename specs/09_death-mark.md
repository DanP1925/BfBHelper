# Spec: BfbHelper v9 — Death Mark and token row

> **DRAFT.** Architecture for intent 09's scope. Build-out has not started
> yet. See [../intent/09_death-mark.md](../intent/09_death-mark.md) for the
> product-level problem, scope, and behavior this spec exists to satisfy.

## Architecture Overview
- Same frontend-only architecture as v1-v8: React + TypeScript, Next.js,
  static build, no backend.
- No new screen. Two changes on the Battle Board and one on the Map (see
  Layout):
  - **The hero card's token row is redesigned** for every token (intent's
    Scope, decided 2026-10-15). It shows only held tokens, then an
    always-visible "+" that opens a new `TokenPicker` popover. The existing
    `TokenChip` (counted) and `TokenToggle` (on/off) stay as the held
    chips. This is a display change only: no stored field, action or
    mutator for +1 Attack, Confuse or Immobilize changes.
  - **Death Mark** is one more on/off token in that row and picker,
    offered only on Kunoichi's enemies.
  - **The Map** gets a read-only Death Mark icon in `MapTeamStatusPanel`'s
    token line, after the Immobilize icon. Otherwise it stays read-only.
- No new store or storage key. Per intent's Affected Systems, the flag is
  one new field on each hero's `HeroBattleState`, next to `hp`, `level`,
  `attackTokens`, `confused` and `immobilized`. That makes this a battle
  schema bump (6 → 7) with an in-place migration, the same approach as
  intents 04-08.
- **New: hero-specific visibility, as data.** This is the first
  hero-specific token, so it settles the question spec 08 and
  `BACKLOG.md`'s "Revisit every token's display" follow-up left open
  ("one token registry ... best decided with the first hero-specific
  token intent"). The decision (2026-10-15) splits it in two:
  - **Stored state stays plain fields.** `deathMarked: boolean` sits
    next to `confused` and `immobilized`. The counted and on/off tokens
    already have a uniform storage story (one field, one action, one
    `addHeroFieldsStep` migration line each). A keyed map would only move
    that boilerplate around, and would cost a migration of every existing
    field. Spec 08's reasoning still holds.
  - **Visibility gets a small registry.** Who can carry a hero-specific
    token is the part that repeats across the backlog with real logic: an
    owning hero, plus which team it targets. Death Mark, Chill, Stone and
    Favored Enemy target the owner's enemies. Shield targets the owner's
    allies. So that rule lives once, as a table in a new
    `lib/battle/heroSpecificTokens.ts` (see Death Mark Logic), and Death
    Mark is its first row. Later intents add a row instead of a new
    "is Cyrus drafted?" check in each component.
  - Moving the stored fields into a registry later is still one
    migration step, so this doesn't close that door.

## State Management
- One new mutator on `UseBattleResult` (`frontend/src/lib/useBattle.ts`):
  `setHeroDeathMarked: (side: PlayerId, heroId: HeroId, value: boolean) => void`.
  A plain `useCallback` dispatching `SET_HERO_DEATH_MARKED`, the same
  shape as `setHeroConfused` and `setHeroImmobilized`. It takes the new
  value, and the toggle computes `!deathMarked`.
- **What doesn't touch the flag.** Per intent's Out of Scope ("Automatic
  clearing") and Session Lifecycle:
  - `setHeroHp` keeps its HP-to-0 → respawn-area side effect and leaves
    the flag alone. That holds both for the marked hero's defeat and for
    Kunoichi's, even though the rulebook discards the marks in both cases
    (intent's Rules: decided 2026-10-15).
  - `setHeroPosition`, `setHeroAttackTokens`, `setHeroConfused`,
    `setHeroImmobilized` and `passInitiative` don't touch it either.
  - Nothing marks a hero automatically at the end of an Action Phase,
    even though the Map knows who shares Kunoichi's space (intent's Out of
    Scope).
- The reducer doesn't check visibility. `SET_HERO_DEATH_MARKED` on a hero
  of Kunoichi's own team, or in a battle without Kunoichi, still sets the
  flag. Only the UI decides who gets a control (see Death Mark Logic). That
  keeps the reducer a clamp-and-replace on one field, like every other
  branch, and the reducer has no roster to check against anyway.
- `useBattle`'s hydrate effect and its parameters don't change. A fresh
  battle gets `deathMarked: false` from `createInitialHeroState`, and a
  loaded one keeps its stored flags.
- `clearDraft()` already removes the persisted `BattleState`, so a new
  draft resets every flag (intent's Session Lifecycle). No change needed.
- **One new piece of UI state: the open picker.** `BattleBoardScreen`'s
  `openTokenKey` (intent 06: at most one token chip open across both
  panels) also covers the pickers, with a per-hero key
  `` `${side}:${heroId}:picker` ``. So opening a picker closes any open
  chip or other picker, and the reverse. It isn't persisted: a reload or
  a Map round-trip starts with everything closed.
- **No new mutators for the picker.** Picking a token calls the setter
  that already exists for it: `setHeroAttackTokens(side, id, count + 1)`,
  `setHeroConfused(side, id, true)`, `setHeroImmobilized(side, id, true)`,
  `setHeroDeathMarked(side, id, true)`. Removing a held on/off chip calls
  the same setter with `false`.

## Data Model
- `frontend/src/lib/battle/types.ts`:
  ```ts
  export type HeroBattleState = {
    hp: number;
    level: number;
    attackTokens: number;
    confused: boolean;
    immobilized: boolean;
    /** A Death Mark token on this hero (intent/09), placed by Kunoichi's
     * Know Your Enemy. On/off: the card only marks unmarked enemies. Only
     * the UI limits it to Kunoichi's enemies (heroSpecificTokens.ts).
     * Changed only by hand: never cleared on defeat (either hero's),
     * respawn or a new round. */
    deathMarked: boolean;
  };

  export type BattleState = {
    schemaVersion: 7;
    // p1, p2, goldPiles, initiative: unchanged
  };
  ```
  - It's on every hero, Kunoichi's allies included, so `HeroBattleState`
    stays one shape for every hero and validation stays uniform. For
    heroes who can't be marked, it just stays `false`.
  - Per intent's Out of Scope, who placed it isn't stored.
- No constant or clamp. A boolean has no bounds, so `constants.ts` and
  `bounds.ts` don't change. The box's 4 tokens aren't a cap (intent's
  Rules).
- `createInitialHeroState(hero)` (`reducer.ts`) returns
  `deathMarked: false`, and its doc comment adds "unmarked". Per intent's
  Constraints, new battles, upgraded saves and the
  `?? createInitialHeroState(hero)` fallbacks in `BattleTeamPanel`,
  `WinScreen` and `MapTeamStatusPanel` all agree on off.
  `createInitialBattleState` writes `schemaVersion: 7`.
- `frontend/src/lib/persistence/schema.ts`:
  - `CURRENT_BATTLE_SCHEMA_VERSION = 7`. `CURRENT_DRAFT_SCHEMA_VERSION`
    doesn't change.
  - New legacy team type for schema 6, as spec 08 did for schema 5:
    ```ts
    /** One side's battle-team state in schema 6: per-hero immobilized,
     * but no deathMarked flag yet (intent/09). */
    export type LegacyBattleTeamStateV6 = Omit<BattleTeamState, "heroes"> & {
      heroes: Record<HeroId, Omit<HeroBattleState, "deathMarked">>;
    };
    ```
    `PersistedBattleStateV6.p1/p2` become `LegacyBattleTeamStateV6`, and
    its doc comment says it's now only the migration source for
    `battleMigrations[6]`.
  - The older legacy types are built with `Omit` from `HeroBattleState`,
    so each must also omit `deathMarked` to stay what its schema stored:
    `LegacyBattleTeamStateV4` omits `"confused" | "immobilized" | "deathMarked"`,
    and `LegacyBattleTeamStateV5` omits `"immobilized" | "deathMarked"`.
  - New `PersistedBattleStateV7` = `PersistedBattleStateV6` with
    `p1`/`p2: BattleTeamState` and `schemaVersion: 7`. It's the shape
    `saveBattleState` writes and `isValidPersistedBattleState` narrows to.
- `saveBattleState` / `loadBattleState` (`storage.ts`) need no field
  copying. `deathMarked` rides inside `p1`/`p2`. Only the payload type and
  the `schemaVersion` literal in `loadBattleState`'s return change (to 7).
- **Validation:** `hasValidBattleTeamShape` additionally requires every
  `heroes` entry to have `typeof deathMarked === "boolean"`, next to the
  `immobilized` check. A missing or non-boolean value fails the whole
  payload (the same clear-on-failure convention as other hero fields). Its
  doc comment lists the new field. It does **not** check that only
  Kunoichi's enemies are marked: validation checks shape, not game rules,
  and the reducer allows it anyway.
- **Migration:** one line, with spec 07's `addHeroFieldsStep` helper:
  ```ts
  /** Schema 6 → 7: every hero gets `deathMarked: false` (intent/09:
   * "upgrades in place", no hero marked). */
  const upgradeV6ToV7 = addHeroFieldsStep<PersistedBattleStateV7>(7, { deathMarked: false });
  ```
  - `battleMigrations` gains `6: upgradeV6ToV7`. `loadPersisted` already
    chains steps, so saves from schema 1 to 5 also land on 7.
  - Default for upgraded saves: **no hero marked** (intent's Constraints).
    Marks already on the table mid-game are re-entered by hand, one tap
    each.

## Death Mark Logic
- New `BattleAction` variant in `battleReducer`:
  `{ type: "SET_HERO_DEATH_MARKED"; side: PlayerId; heroId: HeroId; value: boolean }`.
  It's one `setHeroField(state, side, heroId, "deathMarked", value)` call.
  It returns the same state reference if the hero isn't on that side or
  the value already matches. A short comment marks it manual-only, like
  the Confuse and Immobilize branches.
- It changes nothing else: no HP, no other token, no position. Per
  intent's Rules, the app shows the marks only. Players apply the +2
  Attack themselves.
- **Visibility registry** (new, `frontend/src/lib/battle/heroSpecificTokens.ts`):
  ```ts
  /** Which team a hero-specific token can go on, relative to its owner. */
  type HeroSpecificTarget = "enemies" | "allies";

  /** Hero-specific tokens (BACKLOG's visibility rule, decided
   * 2026-10-10): each one only exists while its owner is in the battle,
   * on either team. One row per token; later intents add rows. */
  export const HERO_SPECIFIC_TOKENS = {
    deathMark: { owner: "kunoichi", targets: "enemies" },
  } as const satisfies Record<string, { owner: HeroId; targets: HeroSpecificTarget }>;

  export type HeroSpecificTokenId = keyof typeof HERO_SPECIFIC_TOKENS;

  /** The side whose heroes can carry `token`, or `null` when its owner
   * wasn't drafted (then no hero gets a control). */
  export function heroSpecificTokenSide(
    token: HeroSpecificTokenId,
    rosters: Record<PlayerId, readonly Hero[]>,
  ): PlayerId | null;
  ```
  - It finds the owner's side from the drafted rosters (`p1Heroes` /
    `p2Heroes`, which `BattleBoardScreen` already gets). For `"enemies"` it
    returns `otherPlayer(ownerSide)`, and for `"allies"` the owner's side.
    It's pure, with no battle state, and unit-tested.
  - "In the battle" means drafted, so Kunoichi at 0 HP or in the respawn
    area still counts (intent's Scope). Rosters don't change mid-battle,
    so the result is fixed for a whole battle.
  - The draft can't pick a hero twice, so the owner is on at most one
    side and the answer is unique.
  - `targets` is a closed union. Self-only tokens (Runika's Artifacts) and
    tokens on map spaces (Bear Trap, Ice Wall) aren't modeled yet. Their
    intents extend the table if it fits, or don't use it.
- **Always editable.** Nothing gates the action on `hp === 0` or
  `heroPositions[heroId] === null` (intent's Scope, and intent 03's "the
  app never blocks a value from changing").
- No "clear all", no automatic marking or clearing, and nothing applies
  the +2 Attack (intent's Out of Scope).

## Layout
- **`DeathMarkIcon`** (new, `components/TokenToggle/DeathMarkIcon.tsx`,
  `size` prop, `aria-hidden`), next to `ConfuseTokenIcon` and
  `ImmobilizeIcon`. Following the token icon style (simplified line-art
  of the rulebook token), it draws the Death Mark token's central motif:
  a dagger on the diagonal, blade up and right, with a short crossguard
  and a single drop below the tip. The token's red splatter rim is left
  out. It's the same dagger as the icon on Kunoichi's hero card, so it
  reads as hers. It's a 16px-viewBox stroke SVG in `currentColor`, 12px on
  the Board and 13px on the Map, as drawn on the canvas (see UI Design
  Reference).
- **Accent color.** A new `globals.css` token, `--color-death-mark`. The
  token is black and blood red, but plain red clashes with three colors
  already on the cards: `--color-hp` `#e0564a`, `--color-p1` `#c1665a`,
  and the defeated styling. So it's a raspberry crimson, `#d04a7a` (from
  the canvas): bluer than both reds, and redder than `--color-confuse`
  purple `#c06ad0`.
- **`TokenToggle`: only ever rendered lit.** It now shows only while the
  token is held, so it's always in its "on" look, and a tap removes the
  token (`onChange(false)`). Its props, `aria-pressed` and label stay as
  they are. Death Mark passes `label="Death Mark token"`, so it reads
  "Death Mark token on Ceralin, toggle button, pressed", tooltip "Death
  Mark token". The muted "off" look and its hover color become unused and
  are deleted from `TokenToggle.module.css`. Its tests drop the "off"
  rendering case.
- **`TokenChip`: only rendered while held or open.** It shows when
  `count > 0 || expanded`. While its stepper is open it stays, even at 0,
  so the − / + buttons don't vanish under the finger. Once it closes at 0
  it's gone (intent's Scope: "Going to 0 removes the chip"). The muted
  "0, collapsed" look becomes unused and is deleted. Otherwise unchanged.
- **New `TokenPicker`** (`components/TokenPicker/TokenPicker.tsx`): the
  "+" button and its popover.
  ```ts
  /** One row in the picker: a token this hero can take right now. */
  export type TokenPickerOption = {
    key: string; // "attack" | "confused" | "immobilized" | "deathMarked"
    icon: ReactNode; // the token's 12px icon
    label: string; // "+1 Attack", "Confuse", "Immobilize", "Death Mark"
    accent: string; // the token's color, for the row's icon
    onPick: () => void;
  };

  type TokenPickerProps = {
    heroName: string;
    options: TokenPickerOption[];
    expanded: boolean;
    onExpandedChange: (next: boolean) => void;
  };
  ```
  - **The "+":** a 20px-tall pill, the same height as the chips, so the
    row stays one 20px line. It's a `<button>` with `aria-expanded`,
    `aria-haspopup="true"`, `aria-label` `` `Add a token to ${heroName}` ``
    and the tooltip "Add a token". It's always rendered, even with nothing
    held (intent's Scope).
  - **The popover:** a list of `<button>` rows, icon then name, in the
    fixed order. Each row calls `onPick` and the popover **stays open**
    (intent's Scope). On/off rows disappear once picked, because the
    caller stops listing a held one. The +1 Attack row stays and adds 1 per
    tap, and its label shows the current count ("+1 Attack ×2") so
    repeated taps have visible feedback. It's disabled at
    `HERO_ATTACK_TOKEN_CEILING`.
  - **Closing:** a tap outside, a second tap of "+", or Escape, through
    the existing `useDismiss` hook (focus returns to "+"), like
    `TokenChip` and `OverflowMenu`.
  - **Never empty.** +1 Attack is always listed, so there's no "nothing to
    add" state.
  - **Positioning: it must not be clipped.** `HeroCard`'s battle card and
    its inner boxes use `overflow: hidden`, and `BattleBoardScreen`'s
    scroll area is `overflow: auto`. A popover absolutely positioned inside
    the card would be cut off, and one that extends the scroll area would
    scroll the Board (intent's Constraints). So the popover renders
    `position: fixed`, placed from the "+" button's bounding rect when it
    opens (below it, flipped above when there's no room under it, and
    clamped to the viewport), with a z-index above the Board panels. It
    closes on scroll or resize rather than tracking them. A portal isn't
    needed for `position: fixed` unless an ancestor sets `transform` or
    `filter`. Checked in the build (Open Items).
  - Generic: it knows nothing about which tokens exist. Shield, Chill,
    Stone and Favored Enemy later add options, not picker code.
- **`HeroCard` battle variant:**
  - It gains `deathMarked?: HeroCardToggleProps` next to `immobilized`,
    and `tokenPicker?: { expanded: boolean; onExpandedChange: (next: boolean) => void }`.
  - **`.tokenRow` renders when `tokenPicker` is provided** (the Battle
    Board). `WinScreen` passes neither, so its cards stay as they are
    (intent's Out of Scope).
  - **Held chips, in the fixed order** (intent's Scope): `TokenChip` for
    +1 Attack if `count > 0 || expanded`, then `TokenToggle` for each of
    Confuse, Immobilize and Death Mark that's `on`. Then the "+" last.
  - **Picker options, same order:** +1 Attack always. Confuse,
    Immobilize and Death Mark each only when its prop is provided and
    `on` is false. `deathMarked` is only passed for Kunoichi's enemies (see
    Wiring), so that's how Death Mark's visibility reaches the picker,
    with no roster logic in `HeroCard`.
  - The order lives in one place: `HeroCard` builds both the chip list and
    the option list from one array of token entries, so the row and the
    picker can't disagree.
- **Width at 1280x800.** The row is now sized by what's held, not by
  every possible control:
  - Typical cards hold 0-3 tokens. A lit `TokenToggle` is 24px, a lit
    `TokenChip` with "×N" about 36px, and the "+" 24px, with 4px gaps.
    So 3 held tokens plus "+" come to about 36 + 24 + 24 + 24 + 12 = 120px of
    the card's 144px, and a hero with nothing held shows just the "+".
    That's one 20px line, so **no card is taller than today**.
  - **A wrap is accepted only for heavy heroes.** All four of today's
    tokens on one hero is 36 + 3 × 24 + 24 for the "+", plus 4 gaps, about
    148px, so it wraps to a second line. The exact threshold depends on
    the mix (counted chips are wider), but it's around 4 held tokens.
    That card's grid row grows by about 24px, which is acceptable because
    it's rare, and every card stays today's height until then. The
    Board's vertical slack at 1280x800, with one wrapped card per panel,
    is checked in the build (Open Items).
  - The old "fourth toggle overflows" problem and the proposed padding
    trim no longer apply: a hero holds a Death Mark only when it's
    marked, and empty slots don't take space.
- **Wiring:**
  - `BattleBoardScreen` computes
    `const deathMarkSide = heroSpecificTokenSide("deathMark", { p1: p1Heroes, p2: p2Heroes })`
    and passes `showDeathMark={deathMarkSide === team.side}` to each
    `BattleTeamPanel`. It also gains `setHeroDeathMarked` (same signature as
    `UseBattleResult`'s) and forwards it per side, like
    `setHeroImmobilized`.
  - `BattleTeamPanel` gains `showDeathMark: boolean` and
    `onHeroDeathMarkedChange: (heroId, value: boolean) => void`. When
    `showDeathMark` is true it passes `deathMarked={{ on, onChange }}` to
    each `HeroCard`, otherwise it omits the prop. It also passes
    `tokenPicker` per hero, keyed `` `${side}:${hero.id}:picker` `` against
    `openTokenKey`, next to the existing `attackTokenKey`.
  - `page.tsx` passes `battle.setHeroDeathMarked`.
- **Map: a read-only icon in `MapTeamStatusPanel`.** Per intent's Scope,
  it goes on the hero's token line under its name, after the Immobilize
  icon, only while the hero is marked. Never on `MapToken` (intent's Out
  of Scope).
  - `.tokenLine` renders when
    `attackTokens > 0 || confused || immobilized || deathMarked`. It gains
    `flex-wrap: wrap` (with a 2px row gap), so a hero holding 6 or more
    tokens wraps to a second token line instead of overflowing the panel
    (intent's Scope). Today's 4 tokens fit on one line. The new
    span is the 13px `DeathMarkIcon` alone, with
    `aria-label="Death Mark"` and `title="Death Mark token"`. Its new
    `.deathMarked` class sets `color: var(--color-death-mark)`, like
    `.immobilized`.
  - **No visibility check here.** The icon only shows while the flag is
    on, and only the Board's controls (gated above) can turn it on. So
    the panel needs no roster logic, and `BattleMapScreen` and `page.tsx`
    need no new Map props.
  - **No new height for now.** The line already exists in the budget.
    Death Mark adds ~19px of width (6px gap + 13px icon). Even an enemy of
    Kunoichi with all four entries (swords and a 2-digit count, Confuse,
    Immobilize, Death Mark) stays well inside the 170px panel. A second
    token line only appears once the hero-specific counted tokens exist.
    Check in the browser (Open Items).
  - It's inside the row element, so `.dimmed` covers it for a defeated
    hero.
- **Not shown** on `ResultsScreen`, `WinScreen`, `MapToken` or
  `RespawnAreaStrip`.

## UI Design Reference
No new artboard. The Death Mark toggle and its Map entry were added to two
existing artboards on the same canvas as intents 01-08 ("BfbHelper — App
Flow", version 62):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

**Version 64 redraws the Board's token row** (decided the same day as
version 62's Death Mark), so the token row is described here as version
64 has it.

- **"Battle Board"** (version 64): every card's token row shows only
  held tokens, lit, then a "+" pill.
  - **The "+"** is a 20px pill with a dashed border and a plus icon, muted
    until hovered or open. It's always last, even on a card with nothing
    held (Cyrus, Runika).
  - **Held on/off chips** (Confuse, Immobilize, Death Mark) are the lit
    pills from intents 07-08 and version 62, now only ever lit, with
    `aria-pressed="true"`. The tooltip says "(tap to remove)", and a tap
    removes the chip. The held +1 Attack chip is intent 06's gold pill
    with "×N", and its − / + stepper works as before.
  - **The picker** opens under the "+" as a dark panel (`--color-panel-bg`,
    border, drop shadow), at least 160px wide, with 32px rows. Each row
    has the token's colored 14px icon, then its name. The +1 Attack row
    shows the count ("×2") once the hero holds any. Rows read
    "+1 Attack", "Confuse", "Immobilize", then "Death Mark", and the
    Death Mark row only appears on Player 2's cards, since Kunoichi is on
    Player 1. Picking keeps it open, on/off rows drop out once held, and
    a tap outside (the shared backdrop) closes it. One popover is open at
    a time, shared with the +1 Attack stepper.
  - **Seeds:**
    - Runika (Player 2), with nothing held, has the picker open, showing
      all four options.
    - Boreas holds 3 tokens (+1 Attack ×1, Confuse, Immobilize) at 0 HP:
      the widest typical row.
    - Caligar holds all 4 (×2, Confuse, Immobilize, Death Mark), so his
      row wraps to a second line: the heavy case.
    - Kunoichi holds Immobilize alone, Agatha Trunch +1 Attack ×2,
      Sterling Confuse, and Vladiator a Death Mark.
  - Death Mark's look is the same as version 62: crimson
    `--color-death-mark` `#d04a7a`, and the dagger icon (a blade on the
    diagonal, tip up and right, a short crossguard, a handle down to the
    lower left, and a single drop under the tip).
  - **Not drawn:** a picker flipping above "+" on a bottom-row card.
    That's a build check (Open Items).
- **"Battle Map"**: in Player 2's status panel, Caligar's token line shows
  the swords count, then the Confuse, Immobilize and crimson Death Mark
  icons. Vladiator, who had no token line, now gets one holding the Death
  Mark alone. It's static and matches the Board's seeds. Caligar shares
  the gold pile's space with Kunoichi on the board, which is how he'd get
  marked.
- No marked hero at 0 HP is seeded. On the Map that would mean moving a
  Player 2 hero to the respawn area, and Boreas already shows that
  tokens stay on a defeated hero and dim with its row.

This is a prototype for visual direction only, the same caveat as earlier
intents' references. It settles the crimson accent, the dagger icon, the
dashed "+" pill and the picker's look. If
a revised canvas supersedes these choices, it wins over what's written
here.

## Deployment
No change from v1-v8: same static Vercel deployment, no new infra.

## Open Items for Implementation
- ~~Redraw the "Battle Board" artboard's token row: held tokens only, the
  "+" pill at the end, and the picker open on one card. Show a card with
  nothing held (just "+"), the widest typical card, and one heavy card
  that wraps. Then update UI Design Reference above.~~
  **Decided:** done (App Flow version 64). See UI Design Reference.
- Check that the picker isn't clipped and doesn't scroll the Board at
  1280x800, including on a bottom-row card, where it should flip above
  the "+".
- Check the Board's height at 1280x800 with one wrapped card in each
  panel. If even one wrap scrolls the Board, rethink the row (e.g. the
  "+" as an icon alone) before building the hero-specific tokens.
- ~~Add the Death Mark toggle to the "Battle Board" artboard and its icon
  to the "Battle Map" artboard (Player 2 only, after Immobilize in
  both), then rewrite UI Design Reference above to describe what's
  there.~~
  **Decided:** done (App Flow version 62). See UI Design Reference.
- ~~Pick `--color-death-mark` on the canvas: a deep crimson that reads
  apart from `--color-hp`, `--color-p1`, `--color-confuse` and the
  defeated styling.~~
  **Decided:** raspberry crimson `#d04a7a` (App Flow version 62). It's
  pinker than `--color-hp` `#e0564a` and `--color-p1` `#c1665a`, and
  redder than `--color-confuse` `#c06ad0`. The BACKLOG's "Revisit every
  token's display" item reviews it again with the other tokens.
- `DeathMarkIcon` drawing: settled on the canvas as the diagonal dagger
  with a drop (version 62). Still to check for legibility at 12px on the
  Board and 13px on the Map, in the build.
- Check the Map at 1280x800 with every hero holding +1 Attack tokens,
  Confuse and Immobilize, and every enemy of Kunoichi also marked: every
  token line should stay one line in the 170px panel, and the page
  shouldn't scroll.
