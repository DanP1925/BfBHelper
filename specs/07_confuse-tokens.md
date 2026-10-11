# Spec: BfbHelper v7 — Confuse Tokens

> **DRAFT.** Architecture for intent 07's scope. Build-out has not started
> yet. See [../intent/07_confuse-tokens.md](../intent/07_confuse-tokens.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as v1-v6: React + TypeScript, Next.js,
  static build, no backend.
- No new screen. One new component, `TokenToggle`, goes in the Battle
  Board hero card's existing token row, next to the +1 Attack `TokenChip`.
  The Map shows a read-only icon in `MapTeamStatusPanel`'s existing token
  line (see Layout).
- No new store or storage key. Per intent's Affected Systems, the flag is
  one new field on each hero's `HeroBattleState`, next to `hp`, `level`
  and `attackTokens`. That makes this a battle schema bump (4 → 5) with an
  in-place migration, the same approach as intents 04-06.
- `TokenToggle` is generic for on/off tokens, the way `TokenChip` is for
  counted ones (intent's "Shared token pattern"). Immobilize, the next
  backlog item, reuses it with its own icon and label.

## State Management
- One new mutator on `UseBattleResult` (`frontend/src/lib/useBattle.ts`):
  `setHeroConfused: (side: PlayerId, heroId: HeroId, value: boolean) => void`.
  A plain `useCallback` dispatching `SET_HERO_CONFUSED` into
  `battleReducer`, the same shape as `setHeroAttackTokens`. It takes the
  new value, not a "toggle" command, like every other mutator. The toggle
  computes `!confused`. Setting a value rather than flipping also means a
  double-dispatch can't land on the wrong state.
- **What doesn't touch the flag.** `setHeroHp` keeps its HP-to-0 →
  respawn-area side effect but leaves `confused` alone. So do
  `setHeroPosition`, `setHeroAttackTokens` and `passInitiative`. Per
  intent's Out of Scope ("Automatic clearing") and Session Lifecycle,
  defeat, respawn and passing initiative never clear it. The app has no
  phase tracking to hook an Orders Phase clear into anyway.
- `useBattle`'s hydrate effect and its parameters don't change. A fresh
  battle gets `confused: false` from `createInitialHeroState`, and a
  loaded one keeps its stored flags.
- `clearDraft()` already removes the persisted `BattleState`, so a new
  draft resets every flag with everything else (intent's Session
  Lifecycle). No change needed there.
- No UI state either. Unlike `TokenChip` there's nothing to expand, so
  `BattleBoardScreen`'s `openTokenKey` doesn't get a Confuse key. Tapping
  a toggle while a chip is open still closes the chip, through the
  chip's own outside-`mousedown` listener (`useDismiss`), and toggles in
  the same tap.

## Data Model
- `frontend/src/lib/battle/types.ts`:
  ```ts
  export type HeroBattleState = {
    hp: number;
    level: number;
    attackTokens: number;
    /** A Confuse token on this hero (intent/07). On/off, not a count:
     * the rules give one top-of-deck card however many are stacked.
     * Changed only by hand: never cleared on defeat, respawn or a new round. */
    confused: boolean;
  };

  export type BattleState = {
    schemaVersion: 5;
    // p1, p2, goldPiles, initiative: unchanged
  };
  ```
  Per-hero, not a top-level set, because the token sits on the hero it
  affects. Intent's Out of Scope says who placed it isn't stored.
- No constant or clamp. A boolean has no bounds, so nothing goes in
  `constants.ts` or `bounds.ts`.
- `createInitialHeroState(hero)` (`reducer.ts`) returns `confused: false`.
  Per intent's Constraints, new battles, upgraded saves and the
  `?? createInitialHeroState(hero)` fallbacks in `BattleTeamPanel`,
  `WinScreen` and `MapTeamStatusPanel` all agree on off.
  `createInitialBattleState` writes `schemaVersion: 5`.
- `frontend/src/lib/persistence/schema.ts`:
  - `CURRENT_BATTLE_SCHEMA_VERSION = 5`. `CURRENT_DRAFT_SCHEMA_VERSION`
    doesn't change.
  - `PersistedBattleStateV4` is typed with `BattleTeamState`, which now
    carries `confused`. Its heroes never had it, so add a legacy team type
    for it, as spec 06 did with `LegacyBattleTeamStateV2`:
    ```ts
    /** One side's battle-team state in schema 4: per-hero attackTokens,
     * but no confused flag yet (intent/07). */
    export type LegacyBattleTeamStateV4 = Omit<BattleTeamState, "heroes"> & {
      heroes: Record<HeroId, Omit<HeroBattleState, "confused">>;
    };
    ```
    `PersistedBattleStateV4.p1/p2` become `LegacyBattleTeamStateV4`.
  - New `PersistedBattleStateV5` = `PersistedBattleStateV4` with
    `p1`/`p2: BattleTeamState` and `schemaVersion: 5`. It's the shape
    `saveBattleState` writes and `isValidPersistedBattleState` narrows to.
- `upgradeV3ToV4`'s `upgradeTeam` returns `LegacyBattleTeamStateV4`, not
  `BattleTeamState`. That's a type-only change.
- `saveBattleState` / `loadBattleState` (`storage.ts`) need no new field
  copying. `confused` rides inside `p1`/`p2`. Only the payload type and
  the `schemaVersion` literal in `loadBattleState`'s return change (to 5).
- **Validation:** `hasValidBattleTeamShape` additionally requires every
  `heroes` entry to have `typeof confused === "boolean"`. A missing or
  non-boolean value (e.g. `0`, `"true"`) fails the whole payload, the same
  clear-on-failure convention as the other hero fields.
- **Migration.** `loadPersisted` already chains one-step migrations (spec
  06), so this is one new step and one new entry:
  - New `upgradeV4ToV5(data)`: a copy of `upgradeV3ToV4`. It returns
    `null` unless `p1` and `p2` are objects with an object `heroes`.
    Otherwise it returns the payload with `confused: false` added to every
    hero on both sides, `schemaVersion: 5` and a fresh `updatedAt`.
    Everything else passes through unchanged. The current-shape validator
    checks the result afterward.
  - `battleMigrations` gains `4: upgradeV4ToV5`. A schema-1 to schema-3
    save chains through every step and lands on 5 too.
  - Default for upgraded saves: **off for every hero** (intent's
    Constraints). A battle mid-game with physical Confuse tokens on the
    table gets them re-entered by hand, one tap each.

## Confuse Logic
- New `BattleAction` variant in `battleReducer`:
  `{ type: "SET_HERO_CONFUSED"; side: PlayerId; heroId: HeroId; value: boolean }`.
  It replaces `heroes[heroId].confused`. It returns the same state
  reference if the hero doesn't exist on that side or the value already
  matches, per the reducer's no-op convention.
- `setHeroField` currently takes `value: number`. Make it generic over the
  field so the new branch reuses it instead of copying it:
  ```ts
  function setHeroField<K extends keyof HeroBattleState>(
    state: BattleState,
    side: PlayerId,
    heroId: HeroId,
    field: K,
    value: HeroBattleState[K],
  ): BattleState
  ```
  The existing hp / level / attackTokens call sites don't change.
- It changes nothing else: no HP, no tokens, no position. Per intent's
  Rules, the app shows the state only. Players deal the top card
  themselves.
- No automatic clearing, no reminders, no "clear all" (intent's Out of
  Scope). One tap is one hero.
- **Always editable.** Nothing gates the action on `hp === 0` or
  `heroPositions[heroId] === null` (intent's Scope, and intent 03's "the
  app never blocks a value from changing").

## Layout
- **`TokenToggle`** (new, `frontend/src/components/TokenToggle/`, with a
  `.module.css` and a test file like `TokenChip`). Generic per intent's
  "Shared token pattern":
  - Props: `on: boolean`, `onChange: (next: boolean) => void`,
    `icon: ReactNode`, `label: string` (the token's name for aria and the
    tooltip, e.g. `"Confuse"`), `heroName: string`. No `expanded` props:
    there's no expand step (intent's Scope, decided 2026-10-11).
  - One `<button>`. A tap calls `onChange(!on)`.
  - **Off:** a muted icon (`--color-muted`) with no border or fill, the
    same as a collapsed `TokenChip` at 0, so it costs about 20px of width.
    It turns the token's accent color on hover, as the chip turns gold.
  - **On:** the chip's lit pill shape (20px tall, accent border, low-alpha
    `color-mix` accent background, accent icon), but in the token's own
    color, not gold. Icon only, no text, since there's no count to show.
  - **Accent color.** A new `accent: string` prop (a CSS color, e.g.
    `"var(--color-confuse)"`), set as a `--token-accent` custom property
    on the button so the CSS stays one set of rules. Confuse passes
    `--color-confuse`, a new `globals.css` token, `#c06ad0`: the purple
    of the rulebook's Confuse token, lightened to read on the dark panels.
    That way it reads apart from the gold +1 Attack chip at a glance.
    Immobilize picks its own accent when it reuses the toggle.
  - Share the pill shape with `TokenChip` rather than restyle it: either
    `TokenToggle.module.css` repeats the chip's `.chip` / `.active` /
    `.toggle` rules with the accent swapped in, or both import a shared
    `tokenPill.module.css` that reads `--token-accent` (the chip setting
    it to gold). Pick in the build; the shared file is preferred if it
    stays small.
  - **Accessibility.** `aria-pressed={on}` carries the state, so the
    `aria-label` stays fixed: "Confuse token on Agatha Trunch". `title`
    tooltip: "Confuse token". Same `:focus-visible` outline as the chip,
    in the accent color.
  - No state of its own. It re-renders from `on`.
- **`ConfuseTokenIcon`** (new, `components/TokenToggle/ConfuseTokenIcon.tsx`,
  `size` prop, `aria-hidden`), next to the toggle the way
  `AttackTokenIcon` sits next to `TokenChip`. Simplified line art of the
  rulebook's Confuse token (components, p. 2: a "?" ringed by swirling
  stars), drawn as a 16px-viewBox stroke SVG like the +1 Attack swords:
  a "?" with three small sparkles around it, as in the mockup. 12px on
  the Board, 13px on the Map. It draws in `currentColor`, so the Map
  entry sets `color: var(--color-confuse)`.
- **`HeroCard` battle variant** gains one optional prop,
  `confused?: HeroCardToggleProps` (`{ on, onChange }`), grouped like
  `attackTokens`:
  - `.tokenRow` renders when either token prop is provided. Confuse goes
    after the +1 Attack chip, per intent's Scope ("next to the +1 Attack
    chip").
  - The Battle Board (`BattleTeamPanel`) passes it. `WinScreen` doesn't
    (intent's Out of Scope).
- **Width and height at 1280x800.** The token row is about 145px wide.
  The chip expanded is about 90px, plus a 4px gap and a ~22px toggle,
  is ~116px. Both fit on the one row spec 06 added, so **no card gets
  taller** and the Board's height is as checked in spec 06. The row's
  `flex-wrap: wrap` stays as the fallback. Checked in the browser (Open
  Items).
- **Wiring:**
  - `BattleTeamPanel` gains `onHeroConfusedChange: (heroId, value: boolean) => void`
    and passes `heroState.confused` and the handler to each `HeroCard`.
  - `BattleBoardScreen` gains `setHeroConfused` (same signature as
    `UseBattleResult`'s) and forwards it per side, like
    `setHeroAttackTokens`.
  - `page.tsx` passes `battle.setHeroConfused`.
- **Map: a read-only icon in `MapTeamStatusPanel`.** Per intent's Scope,
  on the hero's token line under its name, next to the +1 Attack count,
  only while confused. Never on `MapToken` (intent's Scope).
  - The token line currently *is* the +1 Attack entry (one `<span>` with
    its aria-label). Split it: `.tokenLine` becomes the container,
    rendered when `attackTokens > 0 || confused`, holding one span per
    token. The attack span keeps its icon, count, label and title. The
    Confuse span is the 13px `ConfuseTokenIcon` alone, with
    `aria-label="Confused"` and `title="Confuse token"`. A small gap
    (~6px) between them.
  - **No new height.** spec 06 already budgeted one token line per hero
    and checked all eight heroes tokened at 1280x800. Confuse only adds
    width on that line, or shows the line for a hero with no +1 Attack
    tokens, which is the same height. The 170px panel width has room for
    both entries.
  - Display only, no `onChange`. `MapTeamStatusPanel` already gets
    `team`, so `BattleMapScreen` and `page.tsx` need no new props.
  - Inside the row element, so `.dimmed` covers it for a defeated hero.
- **Not shown** on `ResultsScreen`, `WinScreen`, `MapToken` or
  `RespawnAreaStrip`.

## UI Design Reference
No new artboard. The Confuse toggle and its Map entry were added to two
existing artboards in the same Claude design artifact as intents 01-06
("BfbHelper — App Flow", versions 56-57):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK
- **"Battle Board"**: every hero card's token row has a Confuse toggle
  after the +1 Attack chip.
  - Off, it's a muted icon with no border, which turns purple on hover.
    On, it's a purple pill (the chip's lit shape, `--color-confuse`
    `#c06ad0`) with the icon alone, so it reads apart from the gold chip.
  - One click toggles it. It has `aria-pressed` and a fixed label
    ("Confuse token on Boreas").
  - The icon is a line-art "?" with three small sparkles around it, a
    16px-viewBox stroke SVG like the swords.
  - Seeded with Boreas confused (at 0 HP, also holding a +1 Attack token,
    showing it stays on defeat and sits beside the chip) and Sterling
    confused (no other tokens).
- **"Battle Map"**: in each team status panel, Boreas's token line shows
  the purple Confuse icon after its gold swords count. Sterling, who had
  no token line, now gets one holding the Confuse icon alone. Boreas's dimmed row
  dims it too. It's static and matches the Board's seeds.

This is a prototype for visual direction only, the same caveat as earlier
intents' references. It settles the toggle's purple accent (changed
from gold in version 57, to match the rulebook token) and the "?" with
sparkles icon. If a revised mockup supersedes these choices, it wins over
what's written here.

## Deployment
No change from v1-v6: same static Vercel deployment, no new infra.

## Open Items for Implementation
- ~~Add the Confuse toggle to the "Battle Board" artboard and the Confuse
  icon to the "Battle Map" artboard's status panels, then rewrite UI
  Design Reference above to describe what's there.~~
  **Decided:** done (App Flow version 56). See UI Design Reference.
- ~~Lit color: gold like the +1 Attack chip (one consistent token look),
  or the rulebook token's magenta (reads apart from +1 Attack at a
  glance).~~
  **Decided:** purple, `--color-confuse` `#c06ad0` (App Flow version 57).
  The BACKLOG's "Revisit every token's display" item reviews it again
  once Immobilize exists.
- `ConfuseTokenIcon` drawing: the mockup's "?" with sparkles. Check it
  reads at 12px in the browser.
- Shared pill CSS (`tokenPill.module.css`) vs a copy in
  `TokenToggle.module.css`.
- Check the Board at 1280x800 with a chip expanded next to a lit toggle
  on every hero: the token row should stay one line.
- Check the Map at 1280x800 with all eight heroes holding both +1 Attack
  tokens and Confuse: the token line should stay one line in the 170px
  panel.
