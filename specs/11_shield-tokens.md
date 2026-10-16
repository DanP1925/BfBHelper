# Spec 11: Shield Tokens

> **BUILT.** Architecture for intent 11's scope, all built in one PR
> (plan 11). See [../intent/11_shield-tokens.md](../intent/11_shield-tokens.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-10: React + TypeScript, Next.js,
  static build, no backend.
- No new screen and no new component. Shield is a second **counted**
  token, so it reuses intent 06's `TokenChip` for the held chip and
  intent 09's `TokenPicker` for adding (intent's Scope: "it behaves like
  +1 Attack there"):
  - **Board:** a Shield chip and picker option in the `HeroCard` token
    row, on Cyrus's team only, after Death Mark.
  - **Map:** a read-only Shield icon and count in `MapTeamStatusPanel`'s
    token line, after the Death Mark icon.
- No new store or storage key. Per intent's Affected Systems, the count is
  one new field on each hero's `HeroBattleState`, next to `attackTokens`.
  That makes this a battle schema bump (7 → 8) with an in-place migration,
  as intents 04-09 did.
- **Visibility** is one new row in spec 09's registry,
  `HERO_SPECIFIC_TOKENS` (`lib/battle/heroSpecificTokens.ts`):
  `shield: { owner: "cyrus", targets: "allies" }`. It's the first row to
  use the `"allies"` branch, which spec 09 already built and unit-tested
  through `targetSideForRule`. `"allies"` means the owner's whole side,
  owner included, which is what intent's Scope asks for ("Cyrus's team
  only, Cyrus included").
- **One display table for every token.** Intent 09's `/simplify` pass
  (v0.9.1) put the on/off tokens' look in one table, `ON_OFF_TOKENS`
  (`components/TokenToggle/onOffTokens.ts`), which both `HeroCard` and
  `MapTeamStatusPanel` loop over. +1 Attack is still hand-written in both.
  A second counted token would mean copying that +1 Attack code twice
  more, and Chill and Stone (both counted) would copy it again. And the
  fixed order mixes the two kinds: +1 Attack, Confuse, Immobilize, Death
  Mark, Shield. So this spec merges them into one ordered table,
  `BATTLE_TOKENS`, with a `kind` discriminator (see Layout). Shield is one
  row in it, and Chill and Stone become one row each.
  - **Stored state stays plain fields**, as spec 09 decided. The table is
    display-only (icon, labels, accent, ceiling). It doesn't key the
    reducer, the actions or the migrations.

## State Management
- One new mutator on `UseBattleResult` (`frontend/src/lib/useBattle.ts`):
  `setHeroShieldTokens: (side: PlayerId, heroId: HeroId, value: number) => void`.
  A plain `useCallback` dispatching `SET_HERO_SHIELD_TOKENS`, the same
  shape as `setHeroAttackTokens`. It takes the new count. Clamping happens
  in the reducer.
- **What doesn't touch the count.** Per intent's Out of Scope ("Automatic
  absorption", "Automatic clearing") and Session Lifecycle:
  - `setHeroHp` keeps its HP-to-0 → respawn-area side effect and leaves
    the count alone. Lowering HP never takes shields off first, and
    raising it doesn't either. That holds when the shielded hero is
    defeated (the rulebook discards its shields) and when Cyrus is
    defeated (the rulebook keeps them).
  - `setHeroPosition`, every other token setter and `passInitiative` don't
    touch it.
- The reducer doesn't check visibility, as with Death Mark (spec 09).
  `SET_HERO_SHIELD_TOKENS` on an enemy of Cyrus, or in a battle without
  him, still sets the count. Only the UI decides who gets a control.
- `useBattle`'s hydrate effect doesn't change. A fresh battle gets
  `shieldTokens: 0` from `createInitialHeroState`, and a loaded one keeps
  its stored counts. `clearDraft()` already removes the persisted
  `BattleState`, so a new draft resets every count (intent's Session
  Lifecycle).
- **Open state:** the Shield chip's − / + stepper joins
  `BattleBoardScreen`'s single `openTokenKey`, with a per-hero key
  `` `${side}:${heroId}:shield` ``, next to `:attack` and `:picker`. So at
  most one chip or picker is open across both panels (intents 06 and 09).
  It isn't persisted.
- **Picking** Shield from "+" calls `setHeroShieldTokens(side, id, count + 1)`.
  The picker stays open, like the +1 Attack option.

## Data Model
- `frontend/src/lib/battle/types.ts`:
  ```ts
  export type HeroBattleState = {
    hp: number;
    level: number;
    attackTokens: number;
    confused: boolean;
    immobilized: boolean;
    deathMarked: boolean;
    /** Shield tokens on this hero (intent/11), given by Cyrus's Holy Aura
     * and power cards. 0..HERO_SHIELD_TOKEN_CEILING. Only the UI limits it
     * to Cyrus's team (heroSpecificTokens.ts). Changed only by hand: never
     * spent on damage, and never cleared on defeat (either hero's),
     * respawn or a new round. */
    shieldTokens: number;
  };

  export type BattleState = {
    schemaVersion: 8;
    // p1, p2, goldPiles, initiative: unchanged
  };
  ```
  - It's on every hero, Cyrus's enemies included, so `HeroBattleState`
    stays one shape and validation stays uniform. It just stays 0 on
    heroes who can't be shielded.
  - Per intent's Out of Scope, who placed it isn't stored.
- `constants.ts`: `HERO_SHIELD_TOKEN_CEILING = 9`, with a comment citing
  intent 11's Value Bounds (decided 2026-10-16). It's its own constant
  rather than a reuse of `HERO_ATTACK_TOKEN_CEILING`, so the two bounds
  can change apart.
- `bounds.ts`: `clampHeroShieldTokens(value)` = `clamp(value, 0, HERO_SHIELD_TOKEN_CEILING)`,
  next to `clampHeroAttackTokens`.
- `createInitialHeroState(hero)` (`reducer.ts`) returns `shieldTokens: 0`,
  and its doc comment adds "no Shield tokens". Per intent's Constraints,
  new battles, upgraded saves and the `?? createInitialHeroState(hero)`
  fallbacks in `BattleTeamPanel`, `WinScreen` and `MapTeamStatusPanel` all
  agree on 0. `createInitialBattleState` writes `schemaVersion: 8`.
- `frontend/src/lib/persistence/schema.ts`:
  - `CURRENT_BATTLE_SCHEMA_VERSION = 8`. `CURRENT_DRAFT_SCHEMA_VERSION`
    doesn't change.
  - The legacy hero chain (v0.9.1's "each schema's hero is the next one's
    minus the field that schema added") gains a link at the top:
    ```ts
    type LegacyHeroBattleStateV7 = Omit<HeroBattleState, "shieldTokens">;
    type LegacyHeroBattleStateV6 = Omit<LegacyHeroBattleStateV7, "deathMarked">;
    ```
    `LegacyHeroBattleStateV5` and older already derive from V6, so they
    need no edit.
  - New `LegacyBattleTeamStateV7` (heroes: `LegacyHeroBattleStateV7`).
    `PersistedBattleStateV7.p1/p2` become `LegacyBattleTeamStateV7`, and its
    doc comment says it's now only the migration source for
    `battleMigrations[7]`.
  - New `PersistedBattleStateV8` = `PersistedBattleStateV7` with
    `p1`/`p2: BattleTeamState` and `schemaVersion: 8`. It's the shape
    `saveBattleState` writes and `isValidPersistedBattleState` narrows to.
- `storage.ts`:
  - `saveBattleState` / `loadBattleState` need no field copying, since
    `shieldTokens` rides inside `p1`/`p2`. Only the payload types change
    from `PersistedBattleStateV7` to `V8` (`saveBattleState`'s payload,
    `isValidPersistedBattleState`'s narrowing and the module's import),
    plus the `schemaVersion` literal (to 8).
  - **Validation:** `hasValidBattleTeamShape` also requires
    `isNumberInRange(hv.shieldTokens, 0, HERO_SHIELD_TOKEN_CEILING)`, next to
    the `attackTokens` check. A missing, non-numeric or out-of-range count
    fails the whole payload, the same clear-on-failure convention as other
    hero fields. It doesn't check that only Cyrus's team is shielded:
    validation checks shape, not game rules.
  - **Migration:** one line, with the `addHeroFieldsStep` helper:
    ```ts
    /** Schema 7 → 8: every hero gets `shieldTokens: 0` (intent/11:
     * "upgrades in place", every hero's Shield at 0). */
    const upgradeV7ToV8 = addHeroFieldsStep<PersistedBattleStateV8>(8, { shieldTokens: 0 });
    ```
    `battleMigrations` gains `7: upgradeV7ToV8`. `loadPersisted` already
    chains steps, so saves from schema 1-6 also land on 8. Shields already
    on the table mid-game are re-entered by hand.
- **Test fixtures.** Every hand-written `HeroBattleState` in tests gains
  `shieldTokens: 0`. The unit tests that mention `attackTokens` are
  `reducer.test.ts`, `selectors.test.ts`, `storage.test.ts`,
  `useBattle.test.tsx`, `HeroCard.test.tsx`, `BattleMapScreen.test.tsx` and
  `WinScreen.test.tsx`. The type checker finds any that build a full one.
  No e2e spec seeds a persisted battle, so `e2e/` needs no fixture edits.
  `storage.test.ts`'s `withoutHeroFields` calls for older schemas also
  strip `"shieldTokens"`, and a new schema-7 case checks the upgrade.

## Shield Logic
- New `BattleAction` variant in `battleReducer`:
  `{ type: "SET_HERO_SHIELD_TOKENS"; side: PlayerId; heroId: HeroId; value: number }`.
  It's one `setHeroField(state, side, heroId, "shieldTokens", clampHeroShieldTokens(value))`
  call, which returns the same state reference if the hero isn't on that
  side or the value already matches. A short comment marks it manual-only
  ("never spent on damage, never cleared on defeat"), like the
  `attackTokens` branch.
- It changes nothing else: no HP, no other token, no position. Per
  intent's Rules, the app shows the counts only. Players apply each
  shield's 1-damage absorption themselves.
- **Visibility:** `HERO_SPECIFIC_TOKENS` gains
  `shield: { owner: "cyrus", targets: "allies" }`.
  `heroSpecificTokenSide("shield", rosters)` returns Cyrus's side, or
  `null` when he wasn't drafted. "In the battle" means drafted, so Cyrus at
  0 HP or in the respawn area still counts (intent's Scope).
  `heroSpecificTokens.test.ts` adds a `"shield"` case for both sides and
  for a battle without Cyrus.
- **Always editable.** Nothing gates the action on `hp === 0` or
  `heroPositions[heroId] === null` (intent's Scope).
- No "clear all", no automatic absorption or clearing, and nothing on
  Cyrus's own card (intent's Out of Scope).

## Layout
- **`BATTLE_TOKENS`** (replaces `ON_OFF_TOKENS`; new file
  `components/battleTokens.ts`, and `components/TokenToggle/onOffTokens.ts`
  is deleted):
  ```ts
  /** A per-hero counted token's stored field (intents 06, 11). */
  export type CountedTokenField = keyof Pick<HeroBattleState, "attackTokens" | "shieldTokens">;
  /** A per-hero on/off token's stored field (intents 07-09). */
  export type OnOffTokenField = keyof Pick<
    HeroBattleState,
    "confused" | "immobilized" | "deathMarked"
  >;

  type TokenLook = {
    Icon: ComponentType<{ size: number }>;
    /** The picker row's label, e.g. "+1 Shield". */
    optionLabel: string;
    accent: string;
  };

  export type BattleToken =
    | (TokenLook & {
        kind: "counted";
        field: CountedTokenField;
        /** TokenChip's and tokenCountLabel's name, e.g. "+1 Attack", "+1 Shield". */
        label: string;
        max: number;
      })
    | (TokenLook & {
        kind: "onOff";
        field: OnOffTokenField;
        /** The held chip's label and the Map icon's tooltip, e.g. "Confuse token". */
        chipLabel: string;
        /** The Map icon's accessible name, e.g. "Confused". */
        mapLabel: string;
      });

  /** Every token in the fixed order (intents 09 and 11): +1 Attack,
   * Confuse, Immobilize, then the hero-specific ones (Death Mark, Shield).
   * HeroCard's row and picker and the Map's token line all loop over this,
   * so a new token is one row here. Which heroes may carry a hero-specific
   * token is decided elsewhere (heroSpecificTokens.ts). */
  export const BATTLE_TOKENS: readonly BattleToken[] = [
    { kind: "counted", field: "attackTokens", label: "+1 Attack", ... },
    { kind: "onOff", field: "confused", ... },
    { kind: "onOff", field: "immobilized", ... },
    { kind: "onOff", field: "deathMarked", ... },
    {
      kind: "counted",
      field: "shieldTokens",
      Icon: ShieldTokenIcon,
      label: "+1 Shield",
      optionLabel: "+1 Shield",
      accent: "var(--color-shield)",
      max: HERO_SHIELD_TOKEN_CEILING,
    },
  ];
  ```
  - The +1 Attack row carries today's values (`AttackTokenIcon`,
    `var(--color-gold)`, `HERO_ATTACK_TOKEN_CEILING`). Moving it into the
    table is a refactor: its chip, option and Map entry look and read as
    they do now.
  - The file sits at `components/` level because it's shared by
    `TokenChip`'s and `TokenToggle`'s callers alike, not owned by either.
- **`ShieldTokenIcon`** (new, `components/TokenChip/ShieldTokenIcon.tsx`,
  `size` prop, `aria-hidden`), next to `AttackTokenIcon`. Following the
  token icon style (simplified line-art of the rulebook token), it draws
  the Shield token's central motif: the rulebook's token (p. 3,
  Components) is a heater shield with a small emblem in its center, on a
  blue rim. The icon is the shield outline with a small diamond in its
  center for the emblem, and the rim is left out. It's a 16px-viewBox
  stroke SVG in `currentColor`, 12px on the Board, 14px in the picker and
  13px on the Map, like the other icons. The canvas draws it (see UI
  Design Reference):
  ```svg
  <path d="M8 1.75l5.25 2v4c0 3.2-2.3 5.4-5.25 6.5-2.95-1.1-5.25-3.3-5.25-6.5v-4z" />
  <path d="M8 5.25l1.75 2.5L8 10.25l-1.75-2.5z" />
  ```
- **Accent color.** A new `globals.css` token, `--color-shield`. The
  rulebook token is blue and green, but blue is taken twice:
  `--color-immobilize` `#8fb4e0` (ice blue) and `--color-p2` `#4f9aa0`
  (teal). So it has to read apart from both, and from `--color-gold`, since
  it's the second gold-sized counted chip. So it takes the token's green
  instead: `#84c25e` (from the canvas), a light leaf green. It's lighter
  and yellower than the teal, and greener than the gold.
- **`TokenChip` takes an `accent`.** Today its gold is hard-coded in
  `TokenChip.module.css` (border, fill, icon color, focus ring). It gains
  an `accent: string` prop, set inline as `--token-accent`, and the CSS
  reads `var(--token-accent)`, the same way `TokenToggle` already does.
  The "×N" count stays `--color-text`. +1 Attack passes
  `var(--color-gold)`, so it looks the same. Its aria label already comes
  from `tokenCountLabel(count, label)`, so Shield reads "Cyrus: 2 +1
  Shield tokens. Show controls" with no change there.
- **Named "+1 Shield"** in the picker row, the chip's label and the Map's
  tooltip, to match "+1 Attack" (decided 2026-10-16): each token is worth
  one point of shielding. The docs, the stored field and the code names
  still say Shield (`shieldTokens`, `ShieldTokenIcon`).
- **`HeroCard` battle variant:**
  - It gains `shieldTokens?: HeroCardTokenProps` next to `attackTokens`.
    The Battle Board passes it only on Cyrus's team, which is how Shield's
    visibility reaches the picker, with no roster logic in `HeroCard`
    (spec 09's pattern for `deathMarked`).
  - `tokenEntries` is built by one loop over `BATTLE_TOKENS`: a `"counted"`
    row reads its props from `{ attackTokens, shieldTokens }[field]` and
    makes a `countedEntry` (today's +1 Attack code, moved into a function
    beside `toggleEntry`, using the row's `Icon`, `label`, `accent` and
    `max`). An `"onOff"` row reads `{ confused, immobilized, deathMarked }[field]`
    and calls `toggleEntry` as now. A row whose prop is absent is skipped.
  - Entries and options are keyed by `field`, so +1 Attack's key changes
    from `"attack"` to `"attackTokens"`. It's a React key only. The
    `:attack` open-state key in `BattleTeamPanel` doesn't change. Check that
    no test selects on the old key.
  - So the Shield chip shows while `count > 0 || expanded`, and the Shield
    option is always listed on Cyrus's team, disabled at
    `HERO_SHIELD_TOKEN_CEILING` (intent's Scope). Like every picker row now,
    it shows no count (see `TokenPicker` below).
- **`TokenPicker`: no count on any row** (decided 2026-10-16). Intent 09
  drew the +1 Attack row with the held "×N", as feedback for repeated taps.
  With two counted tokens, "+1 Shield ×1" read as a second amount, so both
  rows drop it. The held chip in the row behind the popover already shows
  the count and updates on each tap.
  - `TokenPickerOption` loses `count`. The row's "×N" span and its
    `.optionCount` CSS are deleted, and its accessible name is always
    "Add {label}" (no ", N held").
  - `disabled` at the ceiling stays, so a 10th tap is still blocked.
  - Tests: `TokenPicker.test.tsx`'s "shows a held count and disables an
    option at its ceiling" keeps only the disabled check, and
    `e2e/attack-tokens.spec.ts` and `e2e/token-row.spec.ts` look for "Add
    +1 Attack" instead of "Add +1 Attack, 3 held".
- **Width at 1280x800.** Spec 09 sized the row for at most 8 tokens on one
  hero (intent 09's Scope), and Shield was one of them, so this spec
  doesn't resize it:
  - A held Shield chip is about 36px, the same as +1 Attack's.
  - The new heaviest case is an ally of Cyrus who's also an enemy of
    Kunoichi, holding all five tokens: 36 + 3 × 24 + 36 + 24 for the "+",
    plus 5 gaps of 4px, about 188px. That wraps to a second line in the
    card's 144px. It's the rare wrap intent 09 accepted (4 or more held
    tokens), and still two lines.
  - A typical shielded ally (Shield ×1, maybe a +1 Attack) stays on one
    line. Checked in the browser (Open Items).
- **Wiring:**
  - `BattleBoardScreen` computes
    `const shieldSide = heroSpecificTokenSide("shield", { p1: p1Heroes, p2: p2Heroes })`,
    gains `setHeroShieldTokens` (same signature as `UseBattleResult`'s), and
    passes `onHeroShieldTokensChange` to a `BattleTeamPanel` only when
    `shieldSide === team.side`, like `onHeroDeathMarkedChange`.
  - `BattleTeamPanel` gains an optional
    `onHeroShieldTokensChange?: (heroId, value: number) => void`. Its
    presence turns the control on (v0.9.1's pattern). When present it
    passes each `HeroCard`
    `shieldTokens={{ count, onChange, expanded, onExpandedChange }}`,
    keyed `` `${side}:${hero.id}:shield` `` against `openTokenKey`.
  - `page.tsx` passes `battle.setHeroShieldTokens`.
- **Map: a read-only icon and count in `MapTeamStatusPanel`.** Per intent's
  Scope, it goes on the hero's token line, after the Death Mark icon, only
  while the count is above 0. It's never on `MapToken`.
  - The line becomes one loop over `BATTLE_TOKENS`, keeping each held one.
    A counted token renders as today's +1 Attack span (its 13px icon then
    the number, `aria-label={tokenCountLabel(n, label)}`, and
    `` title={`${label} tokens`} ``, which keeps today's "+1 Attack tokens"
    and gives "+1 Shield tokens"). An on/off one renders as today's icon span.
  - CSS: `.attackTokens` becomes `.countedToken`, colored by
    `--token-accent` like `.onOffToken`. Each counted span sets
    `--token-accent` inline from its row's `accent`, as the on/off spans
    already do, so the swords stay gold and the shield takes
    `--color-shield`.
  - The line renders when any token is held. It already has
    `flex-wrap: wrap` (spec 09), so a crowded line wraps rather than
    overflowing the 170px panel.
  - **No visibility check here**, as with Death Mark: the count is only
    above 0 if the Board's gated controls put it there.
  - It's inside the row element, so `.dimmed` covers it for a defeated
    hero.
- **Not shown** on `ResultsScreen`, `WinScreen`, `MapToken` or
  `RespawnAreaStrip`, and nothing new on Cyrus's own card (intent's Scope).

## UI Design Reference
No new artboard. Shield was added to two existing artboards on the same
canvas as intents 01-10 ("BfbHelper — App Flow", version 72):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

- **"Battle Board"**: Cyrus is on Player 1, so only Player 1's cards get
  Shield, Cyrus's own card included.
  - **The held chip** is the +1 Attack pill and stepper from intent 06, in
    `--color-shield` `#84c25e`: the shield icon, then "×N". Tapping it
    slides in − / +, and it shares the one-open-at-a-time rule with the
    other chips and pickers.
  - **The picker** gains a "+1 Shield" row after Immobilize, on Player 1's
    cards only, with the green shield icon. Player 2's pickers still end
    with Death Mark.
  - **No row shows a count**, "+1 Attack" included. Only the held chips
    do.
  - **Seeds:**
    - Cyrus holds Shield ×1 and has the picker open, showing "+1 Attack",
      "Confuse", "Immobilize" and "+1 Shield": Shield goes on Cyrus too.
    - Agatha Trunch holds +1 Attack ×2 and Shield ×3, two counted chips
      side by side: the typical shielded ally, on one line.
    - Boreas, at 0 HP, holds +1 Attack ×1, Confuse, Immobilize and Shield
      ×2, so his row wraps to a second line: the heavy case, and shields
      stay on a defeated hero.
    - Kunoichi holds Immobilize alone, as before.
- **"Battle Map"**: in Player 1's status panel, Cyrus gets a token line
  holding "Shield 1". Boreas's line ends with "Shield 2" after the
  Immobilize icon, and Agatha Trunch's reads swords 2, then "Shield 3".
  Each is the green shield icon at 11px plus the count, like the swords.
  It's static and matches the Board's seeds.
- **Not drawn:** the five-token case (an ally of Cyrus who's also an enemy
  of Kunoichi, so +1 Attack, Confuse, Immobilize, Death Mark and Shield).
  The canvas puts Kunoichi on Cyrus's team, so no card can hold both. It's
  a build check (Open Items).

This is a prototype for visual direction only, the same caveat as earlier
intents' references. It settles the green accent, the shield icon and
Shield's place in the row and the picker. If a revised canvas supersedes
these choices, it wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new infra.

## Open Items for Implementation
- ~~Add Shield to the canvas: a held Shield chip on a Cyrus-team card on the
  "Battle Board" artboard, a "+1 Shield" row in the open picker (Cyrus's team
  only), the five-token heavy case wrapping, and the icon on the "Battle
  Map" artboard's token line. Then rewrite UI Design Reference above.~~
  **Decided:** done (App Flow version 72). The canvas shows a four-token
  wrap instead of five, since its Kunoichi is on Cyrus's team. See UI
  Design Reference.
- ~~Pick `--color-shield` on the canvas. It must read apart from
  `--color-gold` (the other counted chip), `--color-immobilize`,
  `--color-p2` and the defeated styling.~~
  **Decided:** leaf green `#84c25e` (App Flow version 72), from the
  rulebook token's green shield. The BACKLOG's "Review every token's
  display" item looks at it again with the other tokens.
- ~~Check `ShieldTokenIcon` (drawn on the canvas, version 72) for legibility
  at 12px on the Board and 13px on the Map, apart from the swords.~~
  **Decided:** the canvas drawing is kept. At both sizes it reads as a
  distinct green shield, apart from the swords.
- ~~Check the Board at 1280x800 with a Cyrus ally holding all five tokens
  (Kunoichi on the other team): the card wraps to two lines and the Board
  doesn't scroll. Also check the Map's token line for that hero with ×9 on
  both counted tokens.~~
  **Decided:** it fits. The five-token card wraps to two lines (row 44px)
  and the Board doesn't scroll at 1280x800 or 2560x1440, even with either
  ×9 stepper open. That hero's Map token line stays one line in the 170px
  panel.
- ~~Confirm the `BATTLE_TOKENS` refactor leaves +1 Attack, Confuse,
  Immobilize and Death Mark unchanged on the Board and the Map (existing
  tests and the `token-row` e2e pass with only fixture edits).~~
  **Decided:** unchanged apart from the picker count. Existing unit tests
  needed only fixture and picker-label edits, and all 13 e2e specs pass.
- Validation doesn't reject a fractional count (`isNumberInRange` doesn't
  check integers), for `shieldTokens` as for `attackTokens`. Left as is:
  only a hand-edited save could hold one, and the reducer always clamps to
  whole taps.
