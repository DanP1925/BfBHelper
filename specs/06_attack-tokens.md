# Spec: BfbHelper v6 — +1 Attack Tokens

> **DRAFT.** Architecture for intent 06's scope. Build-out has not started
> yet. See [../intent/06_attack-tokens.md](../intent/06_attack-tokens.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as v1-v5: React + TypeScript, Next.js,
  static build, no backend.
- No new screen. One new component, `TokenChip`, goes on the Battle
  Board's hero cards (the `HeroCard` battle variant). The Map gets a
  read-only count in `MapTeamStatusPanel` (see Layout).
- No new store or storage key. Per intent's Affected Systems, the count is
  one new field on each hero's entry in `BattleTeamState.heroes`, next to
  `hp` and `level`. That makes this a battle schema bump (3 → 4) with an
  in-place migration, the same approach as intents 04 and 05.

## State Management
- One new mutator on `UseBattleResult` (`frontend/src/lib/useBattle.ts`):
  `setHeroAttackTokens: (side: PlayerId, heroId: HeroId, value: number) => void`.
  A plain `useCallback` dispatching `SET_HERO_ATTACK_TOKENS` into
  `battleReducer`, the same shape as `setHeroLevel`. It takes the new
  value, not a delta, like every other mutator. The chip computes
  `count ± 1`.
- **What doesn't touch the count.** `setHeroHp` keeps its HP-to-0 →
  respawn-area side effect but leaves `attackTokens` alone. So do
  `setHeroPosition` and `passInitiative`. Per intent's Scope ("Manual
  only") and Session Lifecycle, defeat, respawn and the end of a round
  never clear tokens. The app has no Stun or activation tracking to hook
  into anyway.
- `useBattle`'s hydrate effect and its parameters don't change. A fresh
  battle gets 0 tokens from `createInitialHeroState`, and a loaded one
  keeps its stored counts.
- `clearDraft()` already removes the persisted `BattleState`, so a new
  draft resets every count to 0 with everything else (intent's Session
  Lifecycle). No change needed there.

## Data Model
- `frontend/src/lib/battle/types.ts`: name the per-hero entry, which is
  currently an inline `{ hp: number; level: number }` repeated in
  `types.ts`, `reducer.ts` and the team-state cast:
  ```ts
  export type HeroBattleState = {
    hp: number;
    level: number;
    /** +1 Attack tokens on this hero (intent/06). 0..HERO_ATTACK_TOKEN_CEILING,
     * changed only by hand: never cleared on defeat, respawn or a new round. */
    attackTokens: number;
  };

  export type BattleTeamState = {
    gold: number;
    heroes: Record<HeroId, HeroBattleState>;
    structures: StructuresState;
    heroPositions: Record<HeroId, MapSpaceId | null>;
  };

  export type BattleState = {
    schemaVersion: 4;
    // p1, p2, goldPiles, initiative: unchanged
  };
  ```
  Per-hero, not a top-level map, because tokens belong to the hero they
  sit on (they can go on allies, but the count lives with the target).
  Intent's Out of Scope says no record of who placed them is kept.
- `frontend/src/lib/battle/constants.ts`: `HERO_ATTACK_TOKEN_CEILING = 9`
  (intent's Value Bounds: floor 0, ceiling 9, decided 2026-10-11).
- `frontend/src/lib/battle/bounds.ts`: `clampHeroAttackTokens(value)` =
  `clamp(value, 0, HERO_ATTACK_TOKEN_CEILING)`, next to `clampHeroLevel`.
- `createInitialHeroState(hero)` (`reducer.ts`) returns `HeroBattleState`
  with `attackTokens: 0`. Per intent's Constraints, new battles, upgraded
  saves and the `?? createInitialHeroState(hero)` fallbacks in
  `BattleTeamPanel`, `WinScreen` and `MapTeamStatusPanel` all agree on 0.
- `frontend/src/lib/persistence/schema.ts`:
  - `CURRENT_BATTLE_SCHEMA_VERSION = 4`. `CURRENT_DRAFT_SCHEMA_VERSION`
    doesn't change.
  - `PersistedBattleStateV2` and `PersistedBattleStateV3` are typed with
    `BattleTeamState`, which now carries `attackTokens`. Their heroes
    never had it, so add a legacy team type for them, the same way
    `LegacyBattleTeamStateV1` was added for schema 1:
    ```ts
    /** One side's battle-team state in schemas 2-3: heroPositions, but no
     * per-hero attackTokens yet (intent/06). */
    export type LegacyBattleTeamStateV2 = Omit<BattleTeamState, "heroes"> & {
      heroes: Record<HeroId, { hp: number; level: number }>;
    };
    ```
    `PersistedBattleStateV2.p1/p2` become `LegacyBattleTeamStateV2`, and V3
    inherits that through its existing `Omit<PersistedBattleStateV2, …>`.
  - New `PersistedBattleStateV4` = `PersistedBattleStateV3` with
    `p1`/`p2: BattleTeamState` and `schemaVersion: 4`. It's the shape
    `saveBattleState` writes and `isValidPersistedBattleState` narrows to.
- `upgradeV1ToV2`'s `upgradeTeam` returns `LegacyBattleTeamStateV2`, not
  `BattleTeamState`. That's a type-only change.
- `saveBattleState` / `loadBattleState` (`storage.ts`) need no new field
  copying. `attackTokens` rides inside `p1`/`p2`. Only the
  `schemaVersion` literal in `loadBattleState`'s return goes to 4.
- **Validation:** `hasValidBattleTeamShape` additionally requires every
  `heroes` entry to have `attackTokens` within
  `isNumberInRange(…, 0, HERO_ATTACK_TOKEN_CEILING)`. A missing,
  negative, above-9 or non-numeric value fails the whole payload, the
  same clear-on-failure convention as hp/level. `hasValidLegacyBattleTeamShape`
  stays as it is, since it still gates raw schema-1 payloads.
- **Migration.** `loadPersisted` now chains one-step migrations from the
  stored version up to the current one (changed in the build: it used to
  run exactly one step, so each entry had to land on the current schema):
  - New `upgradeV3ToV4(data)`: returns `null` unless `p1` and `p2` are
    objects with an object `heroes`. Otherwise it returns the payload with
    `attackTokens: 0` added to every hero on both sides, `schemaVersion: 4`
    and a fresh `updatedAt`. Everything else (`hp`, `level`,
    `heroPositions`, `structures`, `gold`, `goldPiles`, `initiative`) passes
    through unchanged. The current-shape validator checks the result
    afterward, as with `upgradeV2ToV3`.
  - `battleMigrations` becomes one step per version, typed
    `MigrationSteps` (`(data: unknown) => unknown`, since the validator
    checks the end result):
    ```ts
    1: upgradeV1ToV2,
    2: upgradeV2ToV3,
    3: upgradeV3ToV4,
    ```
    A later schema bump adds one entry and touches no others.
  - Default for upgraded saves: **0 for every hero** (intent's
    Constraints). A battle that was mid-game with physical tokens on the
    table gets them re-entered by hand, one tap each.

## Attack Token Logic
- New `BattleAction` variant in `battleReducer`:
  `{ type: "SET_HERO_ATTACK_TOKENS"; side: PlayerId; heroId: HeroId; value: number }`.
  It's a clamp-and-replace on `heroes[heroId].attackTokens` through
  `clampHeroAttackTokens`, a copy of the `SET_HERO_LEVEL` branch. It
  returns the same state reference if the hero doesn't exist on that side
  or the clamped value already matches, per the reducer's no-op convention.
- It changes nothing else: no attack values, no HP, no position. Per
  intent's Out of Scope, the app never shows a total attack or applies the
  bonus.
- No automatic expiry and no group actions. One tap is one token on one
  hero (intent's Out of Scope: no "give every friendly hero in this
  space" for *Spoony Bard*, no "clear all").
- **Always editable.** Nothing gates the action on `hp === 0` or
  `heroPositions[heroId] === null` (intent's Scope, and intent 03's "the
  app never blocks a value from changing").

## Layout
- **`TokenChip`** (new, `frontend/src/components/TokenChip/`, with a
  `.module.css` and a test file like `InitiativeBadge`). It's generic on
  purpose: per intent's "Shared token pattern", later counted tokens
  (Shield, Chill, Stone) reuse it with their own icon and label.
  - Props: `count: number`, `max: number`, `onChange: (next: number) => void`,
    `icon: ReactNode`, `label: string` (the token's name for aria and
    tooltips, e.g. `"+1 Attack"`), `heroName: string`. There's no visible
    text label: the icon alone identifies the token. +1 Attack is the
    only attack token, so a "+1" next to the swords would add nothing.
  - Plus two props for the open state, which the chip doesn't own (see
    "One open at a time" below): `expanded: boolean` and
    `onExpandedChange: (next: boolean) => void`.
  - **Collapsed** (the default, per intent's Scope) it's one toggle
    button:
    - **At 0:** a muted swords icon (`--color-muted`) with no border or
      fill, so a hero without tokens costs about 20px of width.
    - **From 1 up:** a gold pill with the icon and `×{count}` (e.g.
      "⚔ ×2"), so counts read at a glance without opening anything.
  - **Expanded:** tapping the toggle reveals − and + buttons after the
    count, inside the same pill. At 0 the pill takes the gold style while
    open and shows "×0".
    - The − is disabled at 0 and the + at `max` (9). Each tap calls
      `onChange(count ± 1)` and **leaves the chip open**, so Cynthia's
      three tokens are three taps on +.
    - There's no numeric input (intent's Scope: no direct entry), so it
      doesn't reuse `NumberStepper`.
  - **Closing** (intent's Scope): tap the toggle again, tap anywhere
    outside the chip, or press Escape. It uses the same pattern as
    `OverflowMenu`: while expanded, `document` `mousedown` and `keydown`
    listeners check `containerRef`. Escape also returns focus to the
    toggle, as `OverflowMenu` does with its trigger.
  - **Animation.** The − / + group is always rendered, inside a
    `.controls` wrapper that transitions between collapsed and expanded:
    - Collapsed: `max-width: 0` and `opacity: 0`. Expanded: `max-width`
      around 48px and `opacity: 1`. About 150ms, `ease-out`, so the pill
      grows rightward from the count.
    - While collapsed the wrapper also gets `visibility: hidden`, with
      the visibility change delayed until the width animation ends when
      closing. Hidden buttons can't be tabbed to or clicked, and screen
      readers skip them.
    - Under `@media (prefers-reduced-motion: reduce)` the transition is
      off, so the controls appear and disappear instantly.
    - This is the first animation in the app. Keep it to this one
      wrapper; nothing else on the card moves.
  - **Accessibility.**
    - The toggle has `aria-expanded` and `aria-controls` (the wrapper's
      id). Its `aria-label` carries the count and the action, e.g.
      "Caligar: 2 +1 Attack tokens. Show controls", or "Hide controls"
      when open.
    - The − / + labels are "Remove +1 Attack token from Caligar" and
      "Add +1 Attack token to Caligar". Its `title` tooltip is "+1 Attack
      tokens".
  - **Sizes.** Buttons are 18px square, smaller than `NumberStepper`'s
    22px. The pill is 20px tall with 11-12px text. That reads as a token
    rather than a stat (intent's Scope). Same `:focus-visible` outline and
    `--color-button-border` borders as `NumberStepper`. Expanded, the pill
    is about 90px wide, which fits the ~145px info column at 1280x800.
  - Pill tint: a gold-ish accent (`--color-gold` border, low-alpha
    background via `color-mix`, like `.hpBadge`'s), so it doesn't compete
    with the red HP badge. The mockup uses this.
  - The icon is an inline crossed-swords SVG (`aria-hidden`), not the "⚔"
    emoji, matching `InitiativeBadge`'s inline-SVG choice. There's no
    token art in the repo or `specs/`.
  - No count state of its own. It re-renders from `count` and `expanded`.
    Clamping lives in the reducer, though the chip also disables − / + at
    the bounds.
- **One open at a time** (intent's Scope). Which chip is open is
  `BattleBoardScreen` UI state:
  ```ts
  const [openTokenKey, setOpenTokenKey] = useState<string | null>(null);
  ```
  - The key is `` `${side}:${heroId}:attack` ``, so later token types on
    the same hero (Confuse, Shield) get their own keys.
  - It lives on the screen, not in each panel, because opening a chip in
    one team's panel must close the other team's. Each chip gets
    `expanded={openTokenKey === key}` and
    `onExpandedChange={(open) => setOpenTokenKey(open ? key : null)}`.
  - Tapping another hero's icon works in one tap. The first chip's
    outside-`mousedown` closes it, then the new chip's click opens itself.
  - It's not persisted and not in `BattleState`. Reloading, or switching
    to the Map and back, starts with every chip closed. Only token
    *counts* are battle state (intent's Session Lifecycle).
- **`HeroCard` battle variant** (`frontend/src/components/HeroCard/`)
  gains one optional prop, `attackTokens?: HeroCardTokenProps`
  (`{ count, onChange, expanded, onExpandedChange }`), grouped so the chip
  can't be wired half-way. The token row renders only when it's provided:
  - The Battle Board (`BattleTeamPanel`) passes it.
  - `WinScreen` doesn't, so its cards stay as they are. Intent's
    Out of Scope keeps token counts off the Win Screen.
- **Placement on the card:** a new `.tokenRow` (flex, `flex-wrap: wrap`,
  4px gap) as the last child of `.battleInfo`, under the level row. It
  sits with the HP and level controls, as intent's Affected Systems asks.
  It's a row of its own rather than squeezed onto the level row, which has
  only about 30px spare at 1280x800. That's enough for a collapsed chip,
  but not for one expanded to ~90px. A row of its own also means the
  expanding pill never pushes the level controls around. Later Confuse and Immobilize chips go into the same row, next
  to this one, and wrap to a second line if they run out of width. The
  BACKLOG follow-up ("Revisit every token's display") reviews that once
  they all exist.
- **Height cost at 1280x800.** `.battleInfo`'s content is about 115px
  tall inside the 120px token column today. One 20px row plus the
  existing 8px gap makes each card about 23px taller, so a panel (2 rows
  of hero cards) grows about 46px, from ~570 to ~616px. That's inside the
  ~670px the Board's scroll area has below the top bar at 800px tall, so
  the Board should still fit without scrolling. It's an estimate from the
  initiative QA screenshot and has to be checked in the browser (Open
  Items). If it's tight, `.battleInfo`'s gap can drop from 8px to 6px.
  The Map isn't affected, since it doesn't use `HeroCard`.
- **Wiring:**
  - `BattleTeamPanel` gains `onHeroAttackTokensChange: (heroId, value) => void`
    and passes `heroState.attackTokens` and the handler to each
    `HeroCard`. It also passes through `openTokenKey` and
    `onOpenTokenKeyChange` from `BattleBoardScreen`. `HeroCard` turns those
    into the chip's `expanded` / `onExpandedChange` props.
  - `BattleBoardScreen` gains `setHeroAttackTokens` (same signature as
    `UseBattleResult`'s) and forwards it per side, like `setHeroLevel`.
  - `page.tsx` passes `battle.setHeroAttackTokens`.
- **Map: a read-only count in `MapTeamStatusPanel`.** This answers intent's
  open question ("Is there room on the Map?") with the panel, not the
  `MapToken`:
  - A badge on the `MapToken` would sit on the board area, where tokens
    already cluster when several heroes share a space. It would crowd the
    hero tokens that intent's Constraints protect, and it would also show
    on tokens in the respawn strips.
  - The panel's hero rows are already per-hero glance stats (name + ♥ HP).
    When `attackTokens > 0`, a **token line under the hero's name** shows
    a small crossed-swords icon and the count (e.g. "⚔2"). It's slightly
    indented, under the name and HP row, which stays as it is.
    - It's its own line, not part of the name row, so later tokens
      (Confuse, Immobilize, the hero-specific ones) can sit next to it and
      wrap. The name row has no width to spare for them, per intent's
      "Shared token pattern".
    - It also means names never truncate because of tokens.
    - At 0 the line isn't rendered, so heroes without tokens look the
      same as today.
    - The line goes inside the row's own element, so the defeated
      dimming (`.dimmed`) covers it too.
    - In markup, `.heroRow` becomes `flex-wrap: wrap` when it has tokens,
      and the new `.tokenLine` takes `flex-basis: 100%`. The panel's
      170px width doesn't change.
  - Display only. No buttons, no `onChange` prop. Intent's Affected
    Systems says the Map never edits the count. `MapTeamStatusPanel`
    already gets `team`, so `BattleMapScreen` and `page.tsx` need no new
    props.
  - **Cost: height.** Each hero with tokens adds about 17px (a 14px line
    plus a 3px gap). In the worst case, all four heroes on a team, that's
    about 68px on that team's panel. At 1280x800 the left column (status
    panel + respawn strip) ends around y=660 today, against a board area
    ending around y=670. A fully tokened team would push that column
    roughly 60px past the board, alongside the gold-piles bar below it.
    Whether that makes the page scroll or squeezes the board area depends
    on how `BattleMapScreen`'s row sizes, so it has to be checked in the
    browser (Open Items). If it doesn't fit, tighten the line first (a
    smaller gap, or tokens beside the HP only when space allows). Only as
    a last resort, fall back to intent's rule and leave the Map
    unchanged.
  - The icon is shared with `TokenChip`. Export it from
    `TokenChip/AttackTokenIcon.tsx` (a size prop: 12px on the chip, 13px
    in the panel to match the panel's heart) instead of drawing it twice.
- **Not shown** on `ResultsScreen` (before the battle), `WinScreen`
  (after it), `MapToken` or `RespawnAreaStrip`.

## UI Design Reference
No new artboard. The token chip and the Map entry were added to two
existing artboards in the same Claude design artifact as intents 01-05
("BfbHelper — App Flow"):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK
- **"Battle Board"**: every hero card has a token row under its level
  stepper. This artboard was called "Battle Board — Controls" in specs
  03-05. With this change, the read-only intent-02 "Battle Board"
  artboard it replaced was removed from the mockup, and this one took
  its name.
  - Collapsed at 0 it's a muted crossed-swords icon with no border,
    which turns gold on hover. Collapsed from 1 up it's a gold pill with
    the icon and "×N".
  - Clicking the icon expands the pill. The same 16px − and + step
    buttons the card's other steppers use slide in after the count,
    fading in over 150ms. An open chip at 0 shows "×0". − is disabled at
    0 and + at 9.
  - Clicking the icon again closes it. Opening another hero's chip, or
    clicking elsewhere, closes it too. A transparent backdrop catches
    that outside click, so in the prototype switching to another hero
    takes two clicks. The app's `mousedown` listener does it in one
    (Layout above). The prototype also has no Escape key, since the
    mockup format doesn't allow global key handlers.
  - Seeded with Boreas ×1 (at 0 HP, showing tokens stay on defeat),
    Agatha Trunch ×2 and Caligar ×2.
- **"Battle Map"**: in each team status panel, a hero with tokens gets a
  second line under its name and HP row. The line is slightly indented
  and holds a gold swords icon and the count, with room for later token
  icons beside it. A defeated hero's whole row, token line included, is
  dimmed (Boreas). It's static and matches the Board's seeds.

This is a prototype for visual direction only, the same caveat as earlier
intents' references. It settles two choices in Layout above:
- The swords icon is an inline SVG.
- The pill is tinted gold.

It also shows the collapsed/expanded chip and its animation, which
replaced the intent's earlier always-visible "+" (decided 2026-10-11). If
a revised mockup supersedes these choices, it wins over what's written
here.

## Deployment
No change from v1-v5: same static Vercel deployment, no new infra.

## Open Items for Implementation
- ~~Add the token chip to the "Battle Board — Controls" artboard (0 → "+"
  only; 1+ → pill with − / +) and the "⚔N" entry to the "Battle Map"
  artboard's status panels, then update UI Design Reference above.~~
  **Decided:** done (App Flow version 55). See UI Design Reference.
- ~~Check the Board at 1280x800 with all four hero cards per team holding
  tokens, and one chip expanded. Both panels should still fit without scrolling (estimate
  above: ~616px of ~670px). If not, tighten `.battleInfo`'s gap or the
  card padding before anything else moves.~~
  **Decided:** fits as specced, no gap change.
- ~~Check the Map at 1280x800 with all four heroes on one team holding
  tokens. The status panel grows about 68px (see Layout).~~
  **Decided:** fits as specced with all eight heroes tokened. The Map
  entry stays.
- ~~Pill accent color: gold border/tint as proposed, or neutral like the
  ⋯ button. Decide in the browser next to the red HP badge.~~
  **Decided:** gold.
- ~~Animation feel: check the 150ms expand/collapse in the browser. Too
  slow gets in the way of tapping + three times for Cynthia, and too fast
  reads as a jump. Also check that `prefers-reduced-motion` turns it off.~~
  **Decided:** 150ms kept. Reduced motion turns the transition off.
