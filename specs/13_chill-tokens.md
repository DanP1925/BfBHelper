# Spec 13: Chill Tokens

> **BUILT.** Architecture for intent 13's scope, all built in one PR
> (plan 13). See [../intent/13_chill-tokens.md](../intent/13_chill-tokens.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-12: React + TypeScript,
  Next.js, static build, no backend.
- No new screen and no new component. Chill is a fourth **counted** token,
  after +1 Attack, +1 Shield and +1 Stone, so it reuses `TokenChip` for the
  held chip and `TokenPicker` for adding (intent's Scope: "it behaves like
  +1 Attack, +1 Shield and +1 Stone there"):
  - **Board:** a Chill chip and picker option in the `HeroCard` token row,
    on Dazeem's enemies only, after Stone.
  - **Map:** a read-only Chill icon and count in `MapTeamStatusPanel`'s
    token line, after the Stone icon.
- No new store or storage key. Per intent's Affected Systems, the count is
  one new field on each hero's `HeroBattleState`, next to `stoneTokens`.
  That makes this a battle schema bump (9 → 10) with an in-place migration,
  as intents 04-12 did.
- **One shared path for counted tokens** (decided 2026-10-17, folded into
  this intent's build PR). Spec 12 added Stone as its own action, setter,
  clamp and ceiling constant, the third copy of the same code. `/simplify`
  on intent 12 suggested sharing it, and Chill is the fourth copy, so the
  build replaces all of them with:
  - one `HERO_COUNTED_TOKEN_CEILINGS` table, keyed by field;
  - one `clampHeroCountedToken(field, value)`;
  - one `SET_HERO_COUNTED_TOKEN` action carrying the field;
  - one `setHeroCountedToken` mutator on `useBattle`;
  - one validation loop over the table in `storage.ts`.

  The stored fields stay plain, one per token (spec 09's choice), and so do
  the migrations: only the write path is shared. The on/off tokens
  (Confuse, Immobilize, Death Mark) keep their own actions and setters.
  They have no clamp or ceiling to share, and no new on/off token is in
  this intent.
- **After the refactor, Chill is table rows:**
  - one `HERO_COUNTED_TOKEN_CEILINGS` entry and one `CountedTokenField`
    member;
  - one `BATTLE_TOKENS` row (`components/battleTokens.ts`), which drives
    `HeroCard`'s row and picker, `BattleTeamPanel`'s per-hero controls,
    `BattleBoardScreen`'s visibility gating and the Map's token line;
  - one `HERO_SPECIFIC_TOKENS` rule (`lib/battle/heroSpecificTokens.ts`);
  - its stored field and migration;
  - one line in `page.tsx`'s `setHeroToken` map.

  None of `HeroCard`, `BattleTeamPanel`, `BattleBoardScreen` or
  `MapTeamStatusPanel` needs a code change, as with Stone.
- **Visibility:** `chill: { owner: "dazeem", targets: "enemies" }`, the
  `"enemies"` branch Death Mark and Stone already use. It's Dazeem's
  opposing side only, so he never gets a control on his own card
  (intent's Scope).

## State Management
- **`useBattle` (`frontend/src/lib/useBattle.ts`)** replaces
  `setHeroAttackTokens`, `setHeroShieldTokens` and `setHeroStoneTokens`
  with one mutator:
  ```ts
  setHeroCountedToken: (
    side: PlayerId,
    heroId: HeroId,
    field: CountedTokenField,
    value: number,
  ) => void;
  ```
  A plain `useCallback` dispatching `SET_HERO_COUNTED_TOKEN`, the same
  shape as the setters it replaces. It takes the new count. Clamping
  happens in the reducer. There's no `setHeroChillTokens`.
- **`page.tsx`'s `setHeroToken` map** keeps its shape (`BoardTokenSetters`,
  one setter per field), so the components don't change. Its counted
  entries bind the field:
  ```ts
  attackTokens: (side, heroId, value) =>
    battle.setHeroCountedToken(side, heroId, "attackTokens", value),
  // shieldTokens, stoneTokens, chillTokens: the same
  ```
- **What doesn't touch the count.** Per intent's Scope ("Manual only"),
  Out of Scope and Session Lifecycle:
  - Nothing clears Chill at the end of a hero's action. The app has no
    notion of an action.
  - `setHeroHp` keeps its HP-to-0 → respawn-area side effect and leaves
    the count alone, including when the hero is defeated (the rulebook
    discards its tokens) and when Dazeem is.
  - `setHeroPosition`, the on/off token setters, the other counted fields
    and `passInitiative` don't touch it.
  - **+1 Attack is separate** (intent's Scope, decided 2026-10-17). The
    reducer writes one field per action, so a Chill write never changes
    `attackTokens` and the reverse, and nothing nets them.
- The reducer doesn't check visibility, as with Death Mark, Shield and
  Stone. `SET_HERO_COUNTED_TOKEN` with `chillTokens` on one of Dazeem's
  allies, or in a battle without him, still sets the count. Only the UI
  decides who gets a control.
- `useBattle`'s hydrate effect doesn't change. A fresh battle gets
  `chillTokens: 0` from `createInitialHeroState`, and `clearDraft()`
  already removes the persisted `BattleState`, so a new draft resets every
  count (intent's Session Lifecycle).
- **Open state:** `BattleTeamPanel` already builds open keys from the
  field, so the Chill stepper is `` `${side}:${heroId}:chillTokens` ``
  against `BattleBoardScreen`'s single `openTokenKey`. At most one chip or
  picker is open across both panels (intents 06 and 09).
- **Picking** "+1 Chill" from "+" calls the setter with `count + 1`, and
  the picker stays open, like the other counted options (`countedEntry`
  in `HeroCard`).

## Data Model
- `frontend/src/lib/battle/types.ts`:
  ```ts
  export type HeroBattleState = {
    // hp, level, attackTokens, confused, immobilized, deathMarked,
    // shieldTokens, stoneTokens: unchanged
    /** Chill tokens on this hero (intent/13), given by Dazeem's Winter's
     * Chill and power cards: each is -1 to all of the hero's attacks.
     * 0..HERO_COUNTED_TOKEN_CEILINGS.chillTokens. Only the UI limits it to
     * Dazeem's enemies (heroSpecificTokens.ts). Changed only by hand:
     * never cleared at the end of an action, on defeat, respawn or a new
     * round, and never netted against attackTokens. */
    chillTokens: number;
  };

  /** A per-hero counted token's stored field (intents 06, 11, 12, 13). */
  export type CountedTokenField = keyof Pick<
    HeroBattleState,
    "attackTokens" | "shieldTokens" | "stoneTokens" | "chillTokens"
  >;

  export type BattleState = {
    schemaVersion: 10;
    // p1, p2, goldPiles, initiative: unchanged
  };
  ```
  - `CountedTokenField` moves here from `components/battleTokens.ts`, so
    `lib/battle/` (constants, bounds, reducer) can use it without
    importing from `components/`. `battleTokens.ts` imports it from here.
  - The existing fields' doc comments point at
    `HERO_COUNTED_TOKEN_CEILINGS` instead of the removed constants.
  - Chill is on every hero, Dazeem's team included, so `HeroBattleState`
    stays one shape and validation stays uniform.
- `constants.ts` replaces `HERO_ATTACK_TOKEN_CEILING`,
  `HERO_SHIELD_TOKEN_CEILING` and `HERO_STONE_TOKEN_CEILING` with one
  table. Each entry keeps its old comment:
  ```ts
  /** Per-hero ceiling for each counted token (intents 06, 11, 12, 13). */
  export const HERO_COUNTED_TOKEN_CEILINGS = {
    /** intent/06's Value Bounds: keeps the count to a single digit. */
    attackTokens: 9,
    /** intent/11: the same single digit. The box's 15 aren't a per-hero limit. */
    shieldTokens: 9,
    /** intent/12: a hero at 3 is defeated and their tokens are discarded. */
    stoneTokens: 3,
    /** intent/13 (decided 2026-10-17): the box's 5. No rule caps it, but a
     * hero can't physically hold more. */
    chillTokens: 5,
  } as const satisfies Record<CountedTokenField, number>;
  ```
- `bounds.ts` replaces `clampHeroAttackTokens`, `clampHeroShieldTokens`
  and `clampHeroStoneTokens` with:
  ```ts
  /** A counted token: floor 0, ceiling HERO_COUNTED_TOKEN_CEILINGS[field]. */
  export function clampHeroCountedToken(field: CountedTokenField, value: number): number {
    return clamp(value, 0, HERO_COUNTED_TOKEN_CEILINGS[field]);
  }
  ```
- `createInitialHeroState(hero)` (`reducer.ts`) returns `chillTokens: 0`,
  and its doc comment adds "no Chill tokens". Per intent's Constraints,
  new battles, upgraded saves and the `?? createInitialHeroState(hero)`
  fallbacks all agree on 0. `createInitialBattleState` writes
  `schemaVersion: 10`.
- `frontend/src/lib/persistence/schema.ts`:
  - `CURRENT_BATTLE_SCHEMA_VERSION = 10`. The draft schema doesn't change.
  - The legacy hero chain gains a link at the top:
    ```ts
    type LegacyHeroBattleStateV9 = Omit<HeroBattleState, "chillTokens">;
    type LegacyHeroBattleStateV8 = Omit<LegacyHeroBattleStateV9, "stoneTokens">;
    ```
  - New `LegacyBattleTeamStateV9` (heroes: `LegacyHeroBattleStateV9`).
    `PersistedBattleStateV9.p1/p2` become `LegacyBattleTeamStateV9`, and its
    doc comment says it's now only the migration source for
    `battleMigrations[9]`.
  - New `PersistedBattleStateV10` = `PersistedBattleStateV9` with
    `p1`/`p2: BattleTeamState` and `schemaVersion: 10`. It's the shape
    `saveBattleState` writes and `isValidPersistedBattleState` narrows to.
- `storage.ts`:
  - The payload types move from `PersistedBattleStateV9` to `V10`
    (`saveBattleState`, `isValidPersistedBattleState`, the import), plus
    the `schemaVersion` literal (to 10). No field copying, since
    `chillTokens` rides inside `p1`/`p2`.
  - **Validation:** `hasValidBattleTeamShape` replaces its three
    counted-token checks with one loop over the table, which covers
    `chillTokens` too:
    ```ts
    for (const [field, ceiling] of Object.entries(HERO_COUNTED_TOKEN_CEILINGS)) {
      if (!isNumberInRange(hv[field], 0, ceiling)) return false;
    }
    ```
    The on/off checks stay as they are. Its doc comment lists "each counted
    token within `HERO_COUNTED_TOKEN_CEILINGS`". A missing, non-numeric or
    out-of-range count fails the whole payload. It doesn't check that only
    Dazeem's enemies hold Chill: validation checks shape, not game rules.
  - **Migration:**
    ```ts
    /** Schema 9 → 10: every hero gets `chillTokens: 0` (intent/13:
     * "upgrades in place", every hero's Chill at 0). */
    const upgradeV9ToV10 = addHeroFieldsStep<PersistedBattleStateV10>(10, { chillTokens: 0 });
    ```
    `battleMigrations` gains `9: upgradeV9ToV10`. `loadPersisted` chains
    steps, so saves from schema 1-8 also land on 10.
- **Test fixtures.** Every hand-written `HeroBattleState` in tests gains
  `chillTokens: 0` (the files that already carry `stoneTokens: 0`; the
  type checker finds the rest). `storage.test.ts`'s `withoutHeroFields`
  calls for older schemas also strip `"chillTokens"`, and a new schema-9
  case checks the upgrade. Its validation cases import the ceilings from
  the table. No e2e spec seeds a persisted battle, so `e2e/` needs no
  fixture edits.

## Chill Logic
- **One `BattleAction` variant replaces three** in `battleReducer`:
  ```ts
  | {
      type: "SET_HERO_COUNTED_TOKEN";
      side: PlayerId;
      heroId: HeroId;
      field: CountedTokenField;
      value: number;
    }
  ```
  replacing `SET_HERO_ATTACK_TOKENS`, `SET_HERO_SHIELD_TOKENS` and
  `SET_HERO_STONE_TOKENS`. Its branch is one
  `setHeroField(state, side, heroId, field, clampHeroCountedToken(field, value))`
  call, which returns the same state reference if the hero isn't on that
  side or the value already matches.
- **One manual-only comment** replaces the three per-token ones, keeping
  each token's specifics: no counted token is cleared by defeat (either
  hero's), respawn or a passed round; Shield is never spent on damage;
  reaching 3 Stone doesn't defeat; Chill isn't cleared at the end of an
  action. No visibility check: only the UI limits the hero-specific ones.
- It changes nothing else: no HP, no other token, no position. Per
  intent's Rules, the app shows the counts only. Players apply the -1 to
  each attack and the expiry themselves.
- **Visibility:** `HERO_SPECIFIC_TOKENS` gains
  `chill: { owner: "dazeem", targets: "enemies" }`.
  `heroSpecificTokenSide("chill", rosters)` returns the side opposite
  Dazeem, or `null` when he wasn't drafted. "In the battle" means drafted,
  so Dazeem at 0 HP or in the respawn area still counts (intent's Scope).
- **Always editable.** Nothing gates the action on `hp === 0` or
  `heroPositions[heroId] === null` (intent's Scope).
- **At 5** the chip's + is disabled and the picker row too, the same as
  any counted chip at its ceiling.
- No "clear all", no automatic clearing, no netting against +1 Attack and
  nothing on Dazeem's own card (intent's Out of Scope).

## Layout
- **`BATTLE_TOKENS` row**, after Stone (intent's Scope: "Fixed order:
  after Stone"):
  ```ts
  // Named "+1 Chill" to match the other counted tokens (intent/13).
  {
    kind: "counted",
    field: "chillTokens",
    Icon: ChillTokenIcon,
    label: "+1 Chill",
    accent: "var(--color-chill)",
    max: HERO_COUNTED_TOKEN_CEILINGS.chillTokens,
    heroSpecific: "chill",
  },
  ```
  - Every counted row's `max` reads from `HERO_COUNTED_TOKEN_CEILINGS`.
  - `CountedTokenField` gains `chillTokens` (now in `types.ts`).
    `HeroCardTokens`, `TeamTokenSetters` and `BoardTokenSetters` are
    mapped over the field types, so they gain `chillTokens` with no edit.
  - The `BATTLE_TOKENS` doc comment's order list adds Chill after Stone,
    and its last sentence says counted tokens share one action and setter
    while the stored fields stay plain.
- **Named "+1 Chill"** in the picker row, the chip's label and the Map's
  tooltip (intent's Scope, decided 2026-10-17). So the chip reads
  "Baldwin: 2 +1 Chill tokens. Show controls" through `tokenCountLabel`,
  and the Map's tooltip "+1 Chill tokens".
- **`ChillTokenIcon`** (new, `components/TokenChip/ChillTokenIcon.tsx`,
  `size` prop, `aria-hidden`), next to `StoneTokenIcon`. Following the
  token icon style (simplified line-art of the rulebook token, 16px
  stroke SVG like the +1 Attack swords), it draws the Chill token's
  central motif. The rulebook token (p. 11, Tokens) is a white snowflake
  on a blue disk. The icon is a six-armed snowflake: three crossing
  strokes, each arm with a small V near its tip. The disk is left out.
  It's 12px on the Board, 14px in the picker and 13px on the Map, like
  the other icons. The canvas draws it (Open Items).
- **Accent color.** A new `globals.css` token, `--color-chill`, with a
  comment like `--color-stone`'s. The rulebook token is icy blue, but
  that's taken: `--color-immobilize` `#8fb4e0` is already an ice blue,
  and Dazeem's power cards immobilize, so a chilled hero will often hold
  both. So Chill must read apart from `--color-immobilize`, `--color-p2`
  `#4f9aa0` (teal), `--color-stone` `#a3adb8` and `--color-shield`. The
  starting point is a brighter, more saturated frost cyan, `#5ccfe6`,
  picked on the canvas and checked in the browser (Open Items).
- **`HeroCard`, `BattleTeamPanel`, `BattleBoardScreen`,
  `MapTeamStatusPanel`:** no code change. `BattleBoardScreen`'s
  `teamTokenSetters` reads the row's `heroSpecific` id and drops
  `chillTokens` on Dazeem's own side. `HeroCard`'s loop makes a
  `countedEntry`, so the chip shows while `count > 0 || expanded`, and
  the option is always listed on Dazeem's enemies, disabled at 5.
- **`page.tsx`**: `setHeroToken`'s four counted entries bind their field
  to `battle.setHeroCountedToken` (State Management).
- **Width at 1280x800.** Spec 09 sized the row for at most 8 tokens on one
  hero. Chill is the fourth counted chip (about 36px with its "×N"):
  - The new heaviest case is a hero who's an ally of Cyrus and an enemy of
    Kunoichi, Sedusa and Dazeem (all three on the other team), holding all
    seven tokens: 4 × 36 + 3 × 24 + 24 for the "+", plus 7 gaps of 4px,
    about 268px. In the card's 144px that's two lines: +1 Attack to Death
    Mark on the first (120px), then Shield, Stone, Chill and "+" on the
    second (exactly 144px). A pixel more and it's three lines. It's the
    rare wrap intent 09 accepted, but the margin is gone (Open Items).
  - A typical chilled enemy (Chill ×1 or ×2, maybe Immobilize from
    Dazeem's power cards) stays on one line.
- **Map:** no code change. `MapTeamStatusPanel` loops over
  `BATTLE_TOKENS`, so a held Chill renders as a counted span after Stone
  (13px icon, the count, `--token-accent` from the row), only while above
  0, inside the row so `.dimmed` covers it for a defeated hero. Never on
  `MapToken`. The line already wraps (`flex-wrap: wrap`) in the 170px
  panel.
- **Not shown** on `ResultsScreen`, `WinScreen`, `MapToken` or
  `RespawnAreaStrip`, and nothing new on Dazeem's own card (intent's
  Scope).

## UI Design Reference
No new artboard. Chill was added to two existing artboards on the same
canvas as intents 01-12 ("BfbHelper — App Flow", version 76):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

- **The roster:** Dazeem replaces Sterling on Player 2 (Sterling held
  only Confuse, which Dazeem keeps). Sedusa stays on Player 2, so Player 1
  is the enemy of both Sedusa and Dazeem, and only Player 1's cards get
  Chill. Player 2's cards, Dazeem's own included, don't.
- **"Battle Board":**
  - **The held chip** is the +1 Attack pill and stepper from intent 06,
    in `--color-chill` `#5ccfe6`: the snowflake icon, then "×N". Tapping
    it slides in − / +. Its + is disabled at 5, and it shares the
    one-open-at-a-time rule with the other chips and pickers.
  - **The picker** gains a "+1 Chill" row after "+1 Stone", on Player 1's
    cards only, with the cyan snowflake. Player 2's pickers are
    unchanged.
  - **Seeds:**
    - Cyrus has the picker open, now ending "+1 Shield", "+1 Stone",
      "+1 Chill".
    - Kunoichi holds Immobilize, Stone ×1 and Chill ×1: the typical
      chilled enemy, with Immobilize's ice blue next to Chill's cyan.
    - Agatha Trunch holds +1 Attack ×2, Shield ×3 and Chill ×5: +1 Attack
      and Chill side by side, never netted, and Chill at its ceiling (its
      picker row disabled).
    - Boreas, at 0 HP, holds +1 Attack ×1, Confuse, Immobilize, Shield ×2,
      Stone ×3 and Chill ×2: all four counted chips, wrapping to a second
      line.
- **"Battle Map":** in Player 1's status panel, Boreas's line ends with
  "Chill 2" after "Stone 3", Kunoichi's with "Chill 1" and Agatha
  Trunch's with "Chill 5". Each is the cyan snowflake at 11px plus the
  count, like the other counted icons. Dazeem replaces Sterling on
  Player 2's status panel and respawn area.
- **Not drawn:** the seven-token case (adding Death Mark to Boreas's
  six). The canvas puts Kunoichi on Cyrus's team, so no card can hold
  Death Mark and Shield together. It's a build check (Open Items).

This is a prototype for visual direction only, the same caveat as earlier
intents' references. It settles the frost-cyan accent, the snowflake icon
and Chill's place in the row and the picker. If a revised canvas
supersedes these choices, it wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- ~~Add Chill to the canvas: a held "+1 Chill" chip on Dazeem's enemies
  (one at ×5, one next to Immobilize), a "+1 Chill" row after "+1 Stone"
  in an open picker, and the icon on the "Battle Map" artboard's token
  line. Then rewrite UI Design Reference above.~~
  **Decided:** done (App Flow version 76), with Dazeem replacing Sterling
  on Player 2. See UI Design Reference.
- `--color-chill` is `#5ccfe6` on the canvas (frost cyan, from the
  rulebook token's blue). Check at 1280x800 that a held Chill chip reads
  apart from Immobilize's ice blue on the same card (Kunoichi) and from
  P2's teal.
  **Decided (2026-10-17):** kept. In the browser the cyan chip reads
  clearly apart from Immobilize's ice blue on the same card and from P2's
  teal.
- The canvas draws `ChillTokenIcon` as a six-armed snowflake (16px
  viewBox, stroke 1.5): three crossing strokes, each arm with a V near
  its tip:
  ```svg
  <path d="M8 2v12M2.8 5l10.4 6M2.8 11l10.4-6M9.6 2.8L8 4.4L6.4 2.8M4.3 4.01L4.88 6.2L2.7 6.79M2.7 9.21L4.88 9.8L4.3 11.99M6.4 13.2L8 11.6L9.6 13.2M11.7 11.99L11.12 9.8L13.3 9.21M13.3 6.79L11.12 6.2L11.7 4.01" />
  ```
  Check it at 12px on the Board and 13px on the Map. If the six V tips
  blur at 12px, drop them and keep the three strokes.
  **Decided (2026-10-17):** kept as drawn. The V tips stay legible at
  12px on the Board and 13px on the Map.
- Check the Board at 1280x800 with the seven-token case (an ally of Cyrus
  who's an enemy of Kunoichi, Sedusa and Dazeem, with every counted token
  at its ceiling): the card wraps to
  two lines, not three, and the Board doesn't scroll, with any stepper
  open. Also check that hero's Map token line in the 170px panel.
  **Decided (2026-10-17):** the chips fit on two lines, but the "+"
  picker wraps alone to a third. Accepted: the Board still fits at
  1280x800 with no scroll, open or closed, and the case needs Cyrus,
  Kunoichi, Sedusa and Dazeem in one game. Tightening is left to
  BACKLOG.md's token-display review. The Map's token line wraps to two
  lines (Chill alone on the second) and fits the panel.
- Validation doesn't reject a fractional count, for `chillTokens` as for
  the other counted tokens (spec 11). Left as is.
