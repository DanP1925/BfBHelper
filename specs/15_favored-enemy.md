# Spec 15: Favored Enemy

> **BUILT.** Architecture for intent 15's scope, all built in one PR
> (plan 15). See [../intent/15_favored-enemy.md](../intent/15_favored-enemy.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-14: React + TypeScript,
  Next.js, static build, no backend.
- No new screen and no new component. Favored Enemy is a fourth **on/off**
  token, after Confuse, Immobilize and Death Mark, so it reuses
  `TokenToggle` for the held chip and `TokenPicker` for adding (intent's
  Scope: "it behaves like Confuse, Immobilize and Death Mark there"):
  - **Board:** a Favored Enemy chip and picker option in the `HeroCard`
    token row, on Boreas's enemies only, after Chill.
  - **Map:** a read-only Favored Enemy icon in `MapTeamStatusPanel`'s
    token line, after the Chill icon.
- No new store or storage key. Per intent's Affected Systems, the flag is
  one new field on each hero's `HeroBattleState`, next to `chillTokens`.
  That makes this a battle schema bump (11 → 12) with an in-place
  migration, as intents 04-14 did.
- **One shared path for on/off tokens** (decided 2026-10-17, folded into
  this intent's build PR). Spec 13 merged the counted tokens into one
  action and setter but left Confuse, Immobilize and Death Mark with their
  own. Favored Enemy would be the fourth copy, so the build replaces them
  with:
  - one `SET_HERO_ON_OFF_TOKEN` action carrying the field;
  - one `setHeroOnOffToken` mutator on `useBattle`;
  - one `onOff` entry in `page.tsx`'s `setHeroToken` map;
  - one validation loop over `ON_OFF_TOKEN_FIELDS` in `storage.ts`.

  The stored fields stay plain, one per token (spec 09's choice), and so
  do the migrations: only the write path is shared, as with spec 13's
  counted tokens.
- **After the refactor, Favored Enemy is table rows**, as Chill was:
  - one `ON_OFF_TOKEN_FIELDS` entry and one `OnOffTokenField` member;
  - one `BATTLE_TOKENS` row (`components/battleTokens.ts`), which drives
    `HeroCard`'s row and picker, `BattleTeamPanel`'s per-hero controls,
    `BattleBoardScreen`'s visibility gating and the Map's token line;
  - one `HERO_SPECIFIC_TOKENS` rule (`lib/battle/heroSpecificTokens.ts`);
  - its stored field and migration.
- **One new behavior: one holder at a time** (intent's Scope, decided
  2026-10-17). No earlier token has it. It's a flag on the `BATTLE_TOKENS`
  row, `oneHolder: true`, read by `BattleTeamPanel` (Favored Enemy Logic).
  It's a UI rule, like visibility. The reducer and validation don't
  enforce it.
- **Visibility:** `favoredEnemy: { owner: "boreas", targets: "enemies" }`,
  the `"enemies"` branch Death Mark, Stone and Chill already use. It's
  Boreas's opposing side only, so he never gets a control on his own card
  (intent's Scope).

## State Management
- **`useBattle` (`frontend/src/lib/useBattle.ts`)** replaces
  `setHeroConfused`, `setHeroImmobilized` and `setHeroDeathMarked` with
  one mutator:
  ```ts
  setHeroOnOffToken: (
    side: PlayerId,
    heroId: HeroId,
    field: OnOffTokenField,
    value: boolean,
  ) => void;
  ```
  A plain `useCallback` dispatching `SET_HERO_ON_OFF_TOKEN`, the same
  shape as `setHeroCountedToken`. There's no `setHeroFavoredEnemy`.
- **`page.tsx`'s `setHeroToken` map** shrinks to two entries:
  ```ts
  setHeroToken={{
    counted: battle.setHeroCountedToken,
    onOff: battle.setHeroOnOffToken,
  }}
  ```
  `BoardTokenSetters` becomes `{ counted, onOff }`, and
  `BattleBoardScreen`'s `teamTokenSetters` binds each on/off row's `field`
  the way it already binds counted rows, so the next on/off token touches
  neither file.
- **What doesn't touch the flag.** Per intent's Scope ("Manual only"),
  Out of Scope and Session Lifecycle:
  - Nothing sets it at battle start. There's no prompt.
  - `setHeroHp` keeps its HP-to-0 → respawn-area side effect and leaves
    the flag alone, including when the marked hero is defeated and when
    Boreas is. This matches the rulebook exception (intent's Rules).
  - `setHeroPosition`, the other token setters and `passInitiative` don't
    touch it.
  - Setting it on one hero never clears it on another. The app never
    moves it (intent's Scope).
- The reducer doesn't check visibility or the one-holder rule.
  `SET_HERO_ON_OFF_TOKEN` with `favoredEnemy` on one of Boreas's allies,
  on a second enemy, or in a battle without him still sets the flag. Only
  the UI decides who gets a control.
- `useBattle`'s hydrate effect doesn't change. A fresh battle gets
  `favoredEnemy: false` from `createInitialHeroState`, and `clearDraft()`
  already removes the persisted `BattleState`, so a new draft clears it
  (intent's Session Lifecycle).
- **Picking** "Favored Enemy" from "+" calls the setter with `true`.
  `toggleEntry` in `HeroCard` then drops the option, as for every on/off
  token. The picker stays open. Its other options are still there.

## Data Model
- `frontend/src/lib/battle/types.ts`:
  ```ts
  export type HeroBattleState = {
    // hp, level, attackTokens, confused, immobilized, deathMarked,
    // shieldTokens, stoneTokens, chillTokens: unchanged
    /** The Favored Enemy token on this hero (intent/15), placed by Boreas
     * at the start of the game. On/off. Only the UI limits it to Boreas's
     * enemies (heroSpecificTokens.ts) and to one hero at a time
     * (BATTLE_TOKENS' oneHolder). Changed only by hand: never cleared on
     * defeat (either hero's), respawn or a new round. */
    favoredEnemy: boolean;
  };

  /** A per-hero on/off token's stored field (intents 07-09, 15), read from
   * ON_OFF_TOKEN_FIELDS so the list can't miss one. They share one reducer
   * action (SET_HERO_ON_OFF_TOKEN) and one useBattle setter. */
  export type OnOffTokenField = (typeof ON_OFF_TOKEN_FIELDS)[number];

  export type BattleState = {
    schemaVersion: 12;
    // p1, p2, goldPiles, initiative: unchanged
  };
  ```
  - `OnOffTokenField` moves here from `components/battleTokens.ts`, so
    `lib/battle/` can use it without importing from `components/`, as
    spec 13 did for `CountedTokenField`. `battleTokens.ts` imports it from
    here.
  - Favored Enemy is on every hero, Boreas's team included, so
    `HeroBattleState` stays one shape and validation stays uniform.
- `constants.ts` gains the list the validation loop reads, next to
  `HERO_COUNTED_TOKEN_CEILINGS`:
  ```ts
  /** Every per-hero on/off token's stored field (intents 07-09, 15). */
  export const ON_OFF_TOKEN_FIELDS = [
    "confused",
    "immobilized",
    "deathMarked",
    "favoredEnemy",
  ] as const satisfies readonly BooleanHeroField[];
  ```
  `BooleanHeroField` is the `HeroBattleState` keys whose value is a
  boolean. `OnOffTokenField` is derived from this list (changed by
  `/simplify`), so a field can't be left out of validation, and a new on/off
  token is one list entry plus its stored field (Open Items).
- `createInitialHeroState(hero)` (`reducer.ts`) returns
  `favoredEnemy: false`, and its doc comment adds "no Favored Enemy". Per
  intent's Constraints, new battles, upgraded saves and the
  `?? createInitialHeroState(hero)` fallbacks all agree.
  `createInitialBattleState` writes `schemaVersion: 12`.
- `frontend/src/lib/persistence/schema.ts` (updated 2026-10-17: intent
  14's Arena was built first and took schema 11, so this is 11 → 12):
  - `CURRENT_BATTLE_SCHEMA_VERSION = 12`. The draft schema doesn't change.
  - The legacy hero chain gains a link at the top. Schemas 10 and 11 have
    the same hero shape, so one type covers both:
    ```ts
    type LegacyHeroBattleStateV11 = Omit<HeroBattleState, "favoredEnemy">;
    type LegacyHeroBattleStateV9 = Omit<LegacyHeroBattleStateV11, "chillTokens">;
    ```
  - New `LegacyBattleTeamStateV11` = `BattleTeamState` with heroes of
    `LegacyHeroBattleStateV11`. `LegacyBattleTeamStateV10` derives from it
    (not from `BattleTeamState`), so the older team types, which all
    derive from V10, never pick up `favoredEnemy`.
  - `PersistedBattleStateV11.p1/p2` become `LegacyBattleTeamStateV11`, and
    its doc comment says it's now only the migration source for
    `battleMigrations[11]`.
  - New `PersistedBattleStateV12` = `PersistedBattleStateV11` with
    `p1`/`p2: BattleTeamState` and `schemaVersion: 12`. It's the shape
    `saveBattleState` writes and `isValidPersistedBattleState` narrows to.
- `storage.ts`:
  - The payload types move from `PersistedBattleStateV11` to `V12`, plus
    the `schemaVersion` literal (to 12). No field copying, since
    `favoredEnemy` rides inside `p1`/`p2`.
  - **Validation:** `hasValidBattleTeamShape` replaces its three boolean
    checks with one loop, which covers `favoredEnemy` too:
    ```ts
    for (const field of ON_OFF_TOKEN_FIELDS) {
      if (typeof hv[field] !== "boolean") return false;
    }
    ```
    Its doc comment lists "each on/off token a boolean". A missing or
    non-boolean flag fails the whole payload. It doesn't check that only
    Boreas's enemies hold it, or that only one does: validation checks
    shape, not game rules.
  - **Migration:**
    ```ts
    /** Schema 11 → 12: every hero gets `favoredEnemy: false` (intent/15:
     * "upgrades in place", with no hero holding it). */
    const upgradeV11ToV12 = addHeroFieldsStep<PersistedBattleStateV12>(12, {
      favoredEnemy: false,
    });
    ```
    `battleMigrations` gains `11: upgradeV11ToV12`. `loadPersisted` chains
    steps, so saves from schema 1-10 also land on 12.
- **Test fixtures.** Every hand-written `HeroBattleState` in tests gains
  `favoredEnemy: false`. Most use `src/test/heroState.ts`'s `NO_TOKENS`,
  which gains it once. The type checker finds the rest.
  `storage.test.ts`'s `withoutHeroFields` calls for older schemas also
  strip `"favoredEnemy"`, and a new schema-11 case checks the upgrade. No
  e2e spec seeds a persisted battle, so `e2e/` needs no fixture edits.

## Favored Enemy Logic
- **One `BattleAction` variant replaces three** in `battleReducer`:
  ```ts
  | {
      type: "SET_HERO_ON_OFF_TOKEN";
      side: PlayerId;
      heroId: HeroId;
      field: OnOffTokenField;
      value: boolean;
    }
  ```
  replacing `SET_HERO_CONFUSED`, `SET_HERO_IMMOBILIZED` and
  `SET_HERO_DEATH_MARKED`. Its branch is one
  `setHeroField(state, side, heroId, field, value)` call, which returns
  the same state reference if the hero isn't on that side or the value
  already matches.
- **One manual-only comment** replaces the three per-token ones, keeping
  each token's specifics: no on/off token is cleared by defeat (either
  hero's), respawn or a passed round; Immobilize never blocks a move;
  Favored Enemy is never moved to another hero. No visibility or
  one-holder check: only the UI limits those.
- It changes nothing else: no HP, no other token, no position. Per
  intent's Rules, the app shows the badge only. Players apply the +2
  Attack themselves.
- **Visibility:** `HERO_SPECIFIC_TOKENS` gains
  `favoredEnemy: { owner: "boreas", targets: "enemies" }`.
  `heroSpecificTokenSide("favoredEnemy", rosters)` returns the side
  opposite Boreas, or `null` when he wasn't drafted. "In the battle" means
  drafted, so Boreas at 0 HP or in the respawn area still counts (intent's
  Scope).
- **One holder at a time** (intent's Scope). `OnOffToken` in
  `battleTokens.ts` gains an optional flag:
  ```ts
  /** At most one hero holds it (intent/15): while one does, no other hero
   * gets a control for it, so its picker option is gone everywhere until
   * the holder taps it off. */
  oneHolder?: true;
  ```
  `BattleTeamPanel`'s `heroTokens` takes the side's `team.heroes` and
  skips a `oneHolder` token for a hero that doesn't hold it while another
  hero on the side does:
  ```ts
  if (
    token.oneHolder &&
    !heroState[token.field] &&
    Object.values(heroes).some((other) => other[token.field])
  ) {
    continue;
  }
  ```
  A skipped field gets no chip (it isn't held) and no picker option, the
  same way a hero-specific token is hidden today. The holder keeps its
  control, so its chip shows and a tap removes it. Then every enemy's
  picker offers it again on the next render (intent's Scope: "first taps
  it off the enemy holding it. Only then is it offered again").
  - The check is per side. That's enough: the Board only gives Boreas's
    opposing side a Favored Enemy setter, so no hero on his own side can
    hold it through the UI.
  - If a save holds it on two heroes (not reachable through the UI, but
    validation allows it), both chips show and remove on tap, and no
    picker offers it until both are off. Nothing breaks.
- **Always editable.** Nothing gates the action on `hp === 0` or
  `heroPositions[heroId] === null` (intent's Scope).
- No battle-start prompt, no "move it" shortcut, no lock, and nothing on
  Boreas's own card (intent's Out of Scope).

## Layout
- **`BATTLE_TOKENS` row**, after Chill (intent's Scope: "Fixed order:
  after Chill"):
  ```ts
  {
    kind: "onOff",
    field: "favoredEnemy",
    Icon: FavoredEnemyIcon,
    chipLabel: "Favored Enemy token",
    optionLabel: "Favored Enemy",
    mapLabel: "Favored Enemy",
    accent: "var(--color-favored-enemy)",
    heroSpecific: "favoredEnemy",
    oneHolder: true,
  },
  ```
  - The `BATTLE_TOKENS` doc comment's order list adds Favored Enemy after
    Chill. Its last sentences say on/off tokens share one action and
    setter too, so a new on/off token is one row plus its stored field and
    `ON_OFF_TOKEN_FIELDS` entry.
  - `HeroCardTokens` and `TeamTokenSetters` are mapped over the field
    types, so they gain `favoredEnemy` with no edit.
- **`FavoredEnemyIcon`** (new,
  `components/TokenToggle/FavoredEnemyIcon.tsx`, `size` prop,
  `aria-hidden`), next to `DeathMarkIcon`. Following the token icon style
  (simplified line-art of the rulebook token, 16px stroke SVG like the +1
  Attack swords), it draws the rulebook token's motif (p. 11, Tokens): a
  green crosshair on a black disk. The icon is the crosshair: a ring,
  four ticks crossing it and a center dot. The disk is left out. It's
  12px on the Board, 14px in the picker and 13px on the Map, like the
  other icons. The canvas draws it (Open Items).
- **Accent color.** A new `globals.css` token, `--color-favored-enemy`,
  with a comment like `--color-chill`'s. The rulebook token is bright
  green, but `--color-shield` `#84c25e` is already a yellow-green. So
  Favored Enemy is a bluer emerald, `#3fcf86`, picked on the canvas. It
  also has to read apart from `--color-chill` `#5ccfe6` and `--color-p2`
  `#4f9aa0`, which sit on the same cards (Open Items).
- **`HeroCard`, `BattleBoardScreen`, `MapTeamStatusPanel`:** no change
  for Favored Enemy itself. `HeroCard`'s loop makes a `toggleEntry`, so
  the chip shows while held and the option only while not held, on heroes
  that got a control. `BattleBoardScreen` changes only for the on/off
  refactor (`teamTokenSetters` binds `setters.onOff`).
- **`BattleTeamPanel`:** `heroTokens` gains the `heroes` parameter and
  the `oneHolder` skip above. That's the only component change the token
  needs.
- **Width at 1280x800.** Spec 09 sized the row for at most 8 tokens on
  one hero. Favored Enemy is the eighth (an on/off chip, about 24px):
  - The heaviest case is a hero who's an ally of Cyrus and an enemy of
    Kunoichi, Sedusa, Dazeem and Boreas (all four on the other team),
    holding all eight tokens. Spec 13's seven-token case already put the
    "+" alone on a third line. Favored Enemy (24px plus a 4px gap) doesn't
    fit after Chill on the second line (exactly 144px), so it joins the
    "+" on the third. The case needs five specific heroes in one game.
    Intent 09 accepted the rare wrap, and the BACKLOG token-display review
    covers tightening it (Open Items).
  - A typical Favored Enemy (the badge plus 0-3 other tokens) stays on
    one line.
- **Map:** no code change. `MapTeamStatusPanel` loops over
  `BATTLE_TOKENS`, so a held Favored Enemy renders as an on/off icon after
  Chill (13px, `--token-accent` from the row, `mapLabel` as its name),
  only while held, inside the row so `.dimmed` covers it for a defeated
  hero. It's never on `MapToken`.
- **Not shown** on `ResultsScreen`, `WinScreen`, `MapToken` or
  `RespawnAreaStrip`, and nothing new on Boreas's own card (intent's
  Scope).

## UI Design Reference
No new artboard. Favored Enemy was added to two existing artboards on the
same canvas as intents 01-14 ("BfbHelper — App Flow", version 82):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

- **The roster** is unchanged. Boreas is already on Player 1, so Player 2
  (Sedusa, Caligar, Dazeem, Vladiator) are his enemies, and only their
  cards get Favored Enemy. Player 1's cards, Boreas's own included, don't.
- **"Battle Board":**
  - **The held chip** is the on/off pill from intents 07-09, in
    `--color-favored-enemy` `#3fcf86`: the crosshair icon alone. Tapping
    it removes it.
  - **Seeds:** Vladiator holds Death Mark and Favored Enemy, side by side.
  - **The open picker** is now Dazeem's (it was Cyrus's): +1 Attack,
    Immobilize and Death Mark, and **no Favored Enemy row**, because
    Vladiator holds it. Tapping Vladiator's chip off brings the "Favored
    Enemy" row back to every Player 2 picker, after Death Mark.
- **"Battle Map":** in Player 2's status panel, Vladiator's line ends with
  the green crosshair after the Death Mark dagger, at 11px, like the other
  on/off icons.
- **Not drawn:** the eight-token case. The canvas puts Boreas and Cyrus
  on the same team, so no card can hold Shield and Favored Enemy
  together. It's a build check (Open Items).

This is a prototype for visual direction only, the same caveat as earlier
intents' references. It settles the emerald accent, the crosshair icon,
Favored Enemy's place in the row and the picker, and the one-holder
picker behavior. If a revised canvas supersedes these choices, it wins
over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- `--color-favored-enemy` is `#3fcf86` on the canvas (emerald, from the
  rulebook token's green). Check at 1280x800 that a held Favored Enemy
  chip reads apart from Shield's yellow-green, Chill's cyan and P2's
  teal.
  **Decided (2026-10-17):** kept. In the browser the emerald chip reads
  apart from Shield's yellow-green and Chill's cyan on the same card, and
  from P2's teal.
- The canvas draws `FavoredEnemyIcon` as a crosshair (16px viewBox,
  stroke 1.5):
  ```svg
  <circle cx="8" cy="8" r="4.5" />
  <path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" />
  <circle cx="8" cy="8" r="0.75" fill="currentColor" />
  ```
  Check it at 12px on the Board and 13px on the Map. If the center dot
  muddies at 12px, drop it.
  **Decided (2026-10-17):** kept as drawn, center dot included. It reads
  as a crosshair at 12px on the Board and 13px on the Map.
- Check the Board at 1280x800 with the eight-token case (an ally of Cyrus
  who's an enemy of Kunoichi, Sedusa, Dazeem and Boreas, holding every
  token): the card wraps to three lines at most, and the Board doesn't
  scroll, with any stepper open. Also check that hero's Map token line in
  the 170px panel.
  **Decided (2026-10-17):** three lines, as predicted: Favored Enemy and
  the "+" share the third (Chill joins them while a stepper is open). The
  Board fits at 1280x800 with no scroll, open or closed. The Map's token
  line wraps to two lines (Chill and Favored Enemy on the second) and fits
  the panel.
- ~~Keep `ON_OFF_TOKEN_FIELDS` and `OnOffTokenField` in step: a type test
  (e.g. `expectTypeOf`) that the list's element type equals the field
  union, so adding a field without listing it fails `tsc`.~~
  **Decided:** first built as a type test, then replaced by `/simplify`:
  `OnOffTokenField` is derived from `ON_OFF_TOKEN_FIELDS`, so they can't
  drift and no test is needed.
- ~~Schema number: if intent 14's build lands first and takes 11, this
  becomes 11 → 12, with `PersistedBattleStateV12` and
  `upgradeV11ToV12`.~~
  **Decided (2026-10-17):** intent 14 landed first (v0.14.0), so this is
  11 → 12. Data Model above is updated.
