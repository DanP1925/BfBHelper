# Spec 12: Stone Tokens

> **DRAFT.** Architecture for intent 12's scope. Build-out has not started
> yet. See [../intent/12_stone-tokens.md](../intent/12_stone-tokens.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-11: React + TypeScript,
  Next.js, static build, no backend.
- No new screen and no new component. Stone is a third **counted** token,
  after +1 Attack and +1 Shield, so it reuses `TokenChip` for the held
  chip and `TokenPicker` for adding (intent's Scope: "it behaves like
  +1 Attack and +1 Shield there"):
  - **Board:** a Stone chip and picker option in the `HeroCard` token
    row, on Sedusa's enemies only, after Shield.
  - **Map:** a read-only Stone icon and count in `MapTeamStatusPanel`'s
    token line, after the Shield icon.
- No new store or storage key. Per intent's Affected Systems, the count is
  one new field on each hero's `HeroBattleState`, next to `shieldTokens`.
  That makes this a battle schema bump (8 → 9) with an in-place migration,
  as intents 04-11 did.
- **Almost all of it is table rows.** Since v0.11.1 ("Drive the token
  wiring from `BATTLE_TOKENS`"), a new token is:
  - one `BATTLE_TOKENS` row (`components/battleTokens.ts`), which drives
    `HeroCard`'s row and picker, `BattleTeamPanel`'s per-hero controls,
    `BattleBoardScreen`'s visibility gating and the Map's token line;
  - one `HERO_SPECIFIC_TOKENS` rule (`lib/battle/heroSpecificTokens.ts`),
    named by the row's `heroSpecific` id;
  - its stored field, reducer action, `useBattle` setter and migration
    (spec 09's plain-fields choice, kept by the refactor);
  - one line in `page.tsx`'s `setHeroToken` map.

  None of `HeroCard`, `BattleTeamPanel`, `BattleBoardScreen` or
  `MapTeamStatusPanel` needs a code change. Their types widen through
  `CountedTokenField`.
- **Visibility:** `stone: { owner: "sedusa", targets: "enemies" }`, the
  `"enemies"` branch Death Mark already uses. It's Sedusa's opposing side
  only, so she never gets a control on her own card (intent's Scope).

## State Management
- One new mutator on `UseBattleResult` (`frontend/src/lib/useBattle.ts`):
  `setHeroStoneTokens: (side: PlayerId, heroId: HeroId, value: number) => void`.
  A plain `useCallback` dispatching `SET_HERO_STONE_TOKENS`, the same
  shape as `setHeroShieldTokens`. It takes the new count. Clamping happens
  in the reducer.
- **What doesn't touch the count.** Per intent's Out of Scope ("Automatic
  defeat", "Automatic clearing") and Session Lifecycle:
  - Reaching 3 doesn't change HP or position. Players lower HP to 0
    themselves.
  - `setHeroHp` keeps its HP-to-0 → respawn-area side effect and leaves
    the count alone, including when the hero is defeated (the rulebook
    discards its tokens) and when Sedusa is.
  - `setHeroPosition`, every other token setter and `passInitiative`
    don't touch it.
- The reducer doesn't check visibility, as with Death Mark and Shield.
  `SET_HERO_STONE_TOKENS` on one of Sedusa's allies, or in a battle
  without her, still sets the count. Only the UI decides who gets a
  control.
- `useBattle`'s hydrate effect doesn't change. A fresh battle gets
  `stoneTokens: 0` from `createInitialHeroState`, and `clearDraft()`
  already removes the persisted `BattleState`, so a new draft resets every
  count (intent's Session Lifecycle).
- **Open state:** `BattleTeamPanel` already builds open keys from the
  field, so the Stone stepper is `` `${side}:${heroId}:stoneTokens` ``
  against `BattleBoardScreen`'s single `openTokenKey`. At most one chip or
  picker is open across both panels (intents 06 and 09).
- **Picking** "+1 Stone" from "+" calls the setter with `count + 1`, and
  the picker stays open, like the other counted options (`countedEntry`
  in `HeroCard`).

## Data Model
- `frontend/src/lib/battle/types.ts`:
  ```ts
  export type HeroBattleState = {
    // hp, level, attackTokens, confused, immobilized, deathMarked,
    // shieldTokens: unchanged
    /** Stone tokens on this hero (intent/12), given by Sedusa's Stony
     * Glare and power cards. 0..HERO_STONE_TOKEN_CEILING. Only the UI
     * limits it to Sedusa's enemies (heroSpecificTokens.ts). Changed only
     * by hand: reaching 3 doesn't defeat the hero, and defeat, respawn
     * and a new round don't clear it. */
    stoneTokens: number;
  };

  export type BattleState = {
    schemaVersion: 9;
    // p1, p2, goldPiles, initiative: unchanged
  };
  ```
  - It's on every hero, Sedusa's team included, so `HeroBattleState`
    stays one shape and validation stays uniform.
- `constants.ts`: `HERO_STONE_TOKEN_CEILING = 3`, with a comment citing
  intent 12's Value Bounds (decided 2026-10-16): a hero at 3 is defeated
  and their tokens are discarded, so a higher count never matters. The
  box's 8 isn't a per-hero limit.
- `bounds.ts`: `clampHeroStoneTokens(value)` = `clamp(value, 0, HERO_STONE_TOKEN_CEILING)`,
  next to `clampHeroShieldTokens`.
- `createInitialHeroState(hero)` (`reducer.ts`) returns `stoneTokens: 0`,
  and its doc comment adds "no Stone tokens". Per intent's Constraints,
  new battles, upgraded saves and the `?? createInitialHeroState(hero)`
  fallbacks all agree on 0. `createInitialBattleState` writes
  `schemaVersion: 9`.
- `frontend/src/lib/persistence/schema.ts`:
  - `CURRENT_BATTLE_SCHEMA_VERSION = 9`. The draft schema doesn't change.
  - The legacy hero chain gains a link at the top:
    ```ts
    type LegacyHeroBattleStateV8 = Omit<HeroBattleState, "stoneTokens">;
    type LegacyHeroBattleStateV7 = Omit<LegacyHeroBattleStateV8, "shieldTokens">;
    ```
  - New `LegacyBattleTeamStateV8` (heroes: `LegacyHeroBattleStateV8`).
    `PersistedBattleStateV8.p1/p2` become `LegacyBattleTeamStateV8`, and its
    doc comment says it's now only the migration source for
    `battleMigrations[8]`.
  - New `PersistedBattleStateV9` = `PersistedBattleStateV8` with
    `p1`/`p2: BattleTeamState` and `schemaVersion: 9`. It's the shape
    `saveBattleState` writes and `isValidPersistedBattleState` narrows to.
- `storage.ts`:
  - The payload types move from `PersistedBattleStateV8` to `V9`
    (`saveBattleState`, `isValidPersistedBattleState`, the import), plus
    the `schemaVersion` literal (to 9). No field copying, since
    `stoneTokens` rides inside `p1`/`p2`.
  - **Validation:** `hasValidBattleTeamShape` also requires
    `isNumberInRange(hv.stoneTokens, 0, HERO_STONE_TOKEN_CEILING)`, next to
    the `shieldTokens` check, and its doc comment lists it. A missing,
    non-numeric or out-of-range count fails the whole payload. It doesn't
    check that only Sedusa's enemies hold Stone: validation checks shape,
    not game rules.
  - **Migration:**
    ```ts
    /** Schema 8 → 9: every hero gets `stoneTokens: 0` (intent/12:
     * "upgrades in place", every hero's Stone at 0). */
    const upgradeV8ToV9 = addHeroFieldsStep<PersistedBattleStateV9>(9, { stoneTokens: 0 });
    ```
    `battleMigrations` gains `8: upgradeV8ToV9`. `loadPersisted` chains
    steps, so saves from schema 1-7 also land on 9.
- **Test fixtures.** Every hand-written `HeroBattleState` in tests gains
  `stoneTokens: 0` (the files that already carry `shieldTokens: 0`; the
  type checker finds the rest). `storage.test.ts`'s `withoutHeroFields`
  calls for older schemas also strip `"stoneTokens"`, and a new schema-8
  case checks the upgrade. No e2e spec seeds a persisted battle, so `e2e/`
  needs no fixture edits.

## Stone Logic
- New `BattleAction` variant in `battleReducer`:
  `{ type: "SET_HERO_STONE_TOKENS"; side: PlayerId; heroId: HeroId; value: number }`.
  One `setHeroField(state, side, heroId, "stoneTokens", clampHeroStoneTokens(value))`
  call, which returns the same state reference if the hero isn't on that
  side or the value already matches. A short comment marks it manual-only
  ("reaching 3 doesn't defeat, never cleared on defeat"), like the
  `shieldTokens` branch.
- It changes nothing else: no HP, no other token, no position. Per
  intent's Rules, the app shows the counts only. Players apply the defeat
  at 3 themselves.
- **Visibility:** `HERO_SPECIFIC_TOKENS` gains
  `stone: { owner: "sedusa", targets: "enemies" }`.
  `heroSpecificTokenSide("stone", rosters)` returns the side opposite
  Sedusa, or `null` when she wasn't drafted. "In the battle" means
  drafted, so Sedusa at 0 HP or in the respawn area still counts (intent's
  Scope).
- **Always editable.** Nothing gates the action on `hp === 0` or
  `heroPositions[heroId] === null` (intent's Scope).
- **No warning at 3.** The chip at 3 looks like the chip at 1 or 2 apart
  from its count, and its + is disabled because 3 is the ceiling, the same
  as any counted chip at its ceiling (intent's Out of Scope).
- No "clear all", no automatic defeat or clearing, and nothing on
  Sedusa's own card (intent's Out of Scope).

## Layout
- **`BATTLE_TOKENS` row**, after Shield (intent's Scope: "Fixed order:
  after Shield"):
  ```ts
  {
    kind: "counted",
    field: "stoneTokens",
    Icon: StoneTokenIcon,
    label: "+1 Stone",
    accent: "var(--color-stone)",
    max: HERO_STONE_TOKEN_CEILING,
    heroSpecific: "stone",
  },
  ```
  - `CountedTokenField` widens to
    `"attackTokens" | "shieldTokens" | "stoneTokens"`, and its doc comment
    cites intent 12. `HeroCardTokens`, `TeamTokenSetters` and
    `BoardTokenSetters` are mapped over the field types, so they gain
    `stoneTokens` with no edit.
  - The `BATTLE_TOKENS` doc comment's order list adds Stone after Shield.
- **Named "+1 Stone"** in the picker row, the chip's label and the Map's
  tooltip (intent's Scope, decided 2026-10-16), to match "+1 Attack" and
  "+1 Shield". So the chip reads "Baldwin: 2 +1 Stone tokens. Show
  controls" through `tokenCountLabel`, and the Map's tooltip "+1 Stone
  tokens". The stored field and code names still say Stone
  (`stoneTokens`, `StoneTokenIcon`).
- **`StoneTokenIcon`** (new, `components/TokenChip/StoneTokenIcon.tsx`,
  `size` prop, `aria-hidden`), next to `ShieldTokenIcon`. Following the
  token icon style (simplified line-art of the rulebook token, 16px
  stroke SVG like the +1 Attack swords), it draws the Stone token's
  central motif. The rulebook token (p. 3, Components; p. 11, Tokens) is
  an olive coiled snake with red glare marks on a grey, cracked stone
  disk, the same snake as Sedusa's card icon. The icon is the coiled
  snake's outline. The disk and the cracks are left out. It's 12px on the
  Board, 14px in the picker and 13px on the Map, like the other icons.
  The canvas draws it (see UI Design Reference; the paths are in Open
  Items).
- **Accent color.** A new `globals.css` token, `--color-stone`, with a
  comment like `--color-shield`'s. The rulebook token is grey stone with
  an olive snake, and both are crowded:
  - Grey sits close to `--color-muted` `#a8987d` and the defeated row's
    dimming, so a grey chip could read as disabled.
  - The snake's olive sits close to `--color-shield` `#84c25e`, the other
    hero-specific counted chip.

  So it must read apart from `--color-shield`, `--color-gold`, the muted
  and defeated styling, and the P1 / P2 colors. The canvas takes a cool
  stone grey, `#a3adb8`, checked in the browser (Open Items).
- **`HeroCard`, `BattleTeamPanel`, `BattleBoardScreen`:** no code change.
  `BattleBoardScreen`'s `teamTokenSetters` reads the row's `heroSpecific`
  id and drops `stoneTokens` on Sedusa's own side. `BattleTeamPanel`'s
  `heroTokens` builds the Stone props for the other side. `HeroCard`'s
  loop makes a `countedEntry`, so the chip shows while `count > 0 ||
  expanded`, and the option is always listed on Sedusa's enemies,
  disabled at 3 (intent's Scope).
- **`page.tsx`**: `setHeroToken` gains `stoneTokens: battle.setHeroStoneTokens`.
- **Width at 1280x800.** Spec 09 sized the row for at most 8 tokens on one
  hero. Stone is the third counted chip (about 36px with its "×N"):
  - The new heaviest case is a hero who's an ally of Cyrus and an enemy
    of both Kunoichi and Sedusa (Kunoichi and Sedusa on the other team),
    holding all six tokens: 36 + 3 × 24 + 36 + 36 + 24 for the "+", plus
    6 gaps of 4px, about 228px. In the card's 144px that's two lines
    (+1 Attack to Death Mark on the first, Shield, Stone and "+" on the
    second). It's the rare wrap intent 09 accepted, still two lines.
  - A typical stoned enemy (Stone ×1 or ×2, maybe Immobilize from
    Sedusa's power cards) stays on one line.
  - Checked in the browser (Open Items).
- **Map:** no code change. `MapTeamStatusPanel` loops over
  `BATTLE_TOKENS`, so a held Stone renders as a counted span after Shield
  (13px icon, the count, `--token-accent` from the row), only while above
  0, inside the row so `.dimmed` covers it for a defeated hero. Never on
  `MapToken`. The line already wraps (`flex-wrap: wrap`) in the 170px
  panel.
- **Not shown** on `ResultsScreen`, `WinScreen`, `MapToken` or
  `RespawnAreaStrip`, and nothing new on Sedusa's own card (intent's
  Scope).

## UI Design Reference
No new artboard. Stone was added to two existing artboards on the same
canvas as intents 01-11 ("BfbHelper — App Flow", version 74):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

- **The roster:** Sedusa replaces Runika on Player 2 (Runika held no
  tokens and was only on these two artboards). So only Player 1's cards
  get Stone. Player 2's cards, Sedusa's own included, don't.
- **"Battle Board":**
  - **The held chip** is the +1 Attack pill and stepper from intent 06,
    in `--color-stone` `#a3adb8`: the snake icon, then "×N". Tapping it
    slides in − / +. Its + is disabled at 3, and it shares the
    one-open-at-a-time rule with the other chips and pickers.
  - **The picker** gains a "+1 Stone" row after "+1 Shield", on Player 1's
    cards only, with the grey snake icon. Player 2's pickers are
    unchanged.
  - **Seeds:**
    - Cyrus has the picker open, now ending "+1 Shield", "+1 Stone".
    - Kunoichi holds Immobilize and Stone ×1: the typical stoned enemy,
      on one line.
    - Boreas, at 0 HP, holds +1 Attack ×1, Confuse, Immobilize,
      Shield ×2 and Stone ×3, wrapping to a second line. He's the hero
      players defeated at 3 Stone, still holding it until they clear it
      by hand. His picker's "+1 Stone" row is disabled.
- **"Battle Map":** in Player 1's status panel, Boreas's line ends with
  "Stone 3" after "Shield 2", and Kunoichi's reads Immobilize, then
  "Stone 1". Each is the grey snake at 11px plus the count, like the
  swords and the shield. Sedusa replaces Runika on Player 2's token and
  status panel.
- **Not drawn:** the six-token case (an ally of Cyrus who's an enemy of
  both Kunoichi and Sedusa). The canvas puts Kunoichi on Cyrus's team, so
  no card can hold Death Mark and Shield together. It's a build check
  (Open Items).

This is a prototype for visual direction only, the same caveat as earlier
intents' references. It settles the stone-grey accent, the snake icon and
Stone's place in the row and the picker. If a revised canvas supersedes
these choices, it wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- ~~Add Stone to the canvas: a held "+1 Stone" chip on Sedusa's enemies
  (one at ×3), a "+1 Stone" row after "+1 Shield" in an open picker, and
  the icon on the "Battle Map" artboard's token line. Then rewrite UI
  Design Reference above.~~
  **Decided:** done (App Flow version 74), with Sedusa replacing Runika
  on Player 2. See UI Design Reference.
- ~~Pick `--color-stone` on the canvas.~~
  **Decided (provisional):** cool stone grey `#a3adb8` (App Flow
  version 74), from the rulebook token's stone. It's cooler and lighter
  than `--color-muted` `#a8987d` (warm) and less saturated than
  `--color-immobilize` `#8fb4e0`. Check in the browser at 1280x800 that a
  held Stone chip doesn't read as disabled or muted next to a defeated
  hero's dimming, and that it reads apart from Immobilize's ice blue.
  Adjust on the canvas and here if not.
- Check `StoneTokenIcon` for legibility at 12px on the Board and 13px on
  the Map, apart from the swords and the shield. The canvas draws a
  coiled snake: an oval head top right and an S-shaped body (16px
  viewBox, stroke 1.5):
  ```svg
  <path d="M9.5 3.5a2 1.5 0 1 0 4 0a2 1.5 0 1 0-4 0z" />
  <path d="M10 4.75C7 5.25 4.5 6.5 5.5 8.5s6 .5 6.75 2.75S9 14.5 3.5 13.75" />
  ```
  If the snake blurs, simplify it, and update this spec.
- Check the Board at 1280x800 with the six-token case (an ally of Cyrus
  who's an enemy of Kunoichi and Sedusa, with both counted tokens at their
  ceilings): the card wraps to two lines and the Board doesn't scroll,
  with any stepper open. Also check that hero's Map token line in the
  170px panel.
- Validation doesn't reject a fractional count, for `stoneTokens` as for
  the other counted tokens (spec 11). Left as is.
