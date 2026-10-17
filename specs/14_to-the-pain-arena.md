# Spec 14: The Arena

> **DRAFT.** Architecture for intent 14's scope. Build-out has not started
> yet. See [../intent/14_to-the-pain-arena.md](../intent/14_to-the-pain-arena.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-13: React + TypeScript,
  Next.js, static build, no backend.
- **The Arena is a hero position, not a token.** Per intent's Affected
  Systems ("alongside each hero's position"), being in the Arena is one
  more value of the existing `heroPositions` entry, next to a map-space id
  and `null` (respawn area):
  ```ts
  export type HeroPosition = MapSpaceId | "arena" | null;
  ```
  This keeps one source of truth for where a hero is. A hero can't be on a
  space and in the Arena at once, dragging out of the Arena is the same
  `SET_HERO_POSITION` as any other move, and the existing 0-HP behaviour
  (`setHeroHp` → `spaceId: null`) pulls a defeated hero out of the Arena
  with no new code (intent's Scope: "Ending the duel").
- **One new component, `ArenaPanel`,** a drop target holding the heroes
  whose position is `"arena"`, modelled on `RespawnAreaStrip`. Only
  `BattleMapScreen` renders it (intent's Scope: "Map only").
- **One new rules module, `lib/battle/arena.ts`,** with pure functions
  over `BattleState`: who is in the Arena, whether the panel is shown,
  and whether a dragged hero may enter. The reducer stays rule-free, as
  it is for hero-specific tokens: only the UI decides who gets in.
- No new store or storage key. Widening `heroPositions` is a battle
  schema bump (10 → 11) with a version-only, in-place migration: no
  existing save holds `"arena"`, so every one starts with the Arena
  empty (intent's Constraints).
- **What doesn't change:** the Battle Board (`BattleBoardScreen`,
  `HeroCard`, `BattleTeamPanel`), `MapTeamStatusPanel`, `MapSpace`,
  `MapToken`, `RespawnAreaStrip`, `ResultsScreen`, `WinScreen`, every
  token, and the hero-specific token rules (`heroSpecificTokens.ts`).

## State Management
- **`useBattle` (`frontend/src/lib/useBattle.ts`):** `setHeroPosition`'s
  last parameter widens from `MapSpaceId | null` to `HeroPosition`. No new
  mutator: entering the Arena is `setHeroPosition(side, heroId, "arena")`,
  leaving it is the same call with a space id or `null`.
- **`setHeroHp`** doesn't change. Its HP-to-0 side effect already sets
  the position to `null`, so a hero defeated in the Arena goes to their
  respawn area, the same as from a board space (intent's Affected
  Systems: "Defeat handling").
- **Nothing moves the survivor** (intent's Scope). No mutator reacts to
  the other duellist's defeat, and nothing writes a Bit's space id.
- **Nothing else moves a hero in or out of the Arena.** A passed round
  (`passInitiative`), Felix's level changing (`setHeroLevel`), another
  hero's defeat or any token setter leaves every position alone
  (intent's Session Lifecycle).
- `useBattle`'s hydrate effect doesn't change. A fresh battle seeds every
  position to `null` (`seedHeroPositions`), and `clearDraft()` already
  removes the persisted `BattleState`, so a new draft empties the Arena.
- `page.tsx` doesn't change: it already passes `battle.setHeroPosition`
  to `BattleMapScreen`, and the widened type flows through.

## Data Model
- `frontend/src/lib/battle/types.ts`:
  ```ts
  /** Where a hero is (intents 04 and 14): a board space, the Arena
   * (intent/14, off the board's spaces), or `null` for its team's
   * respawn area (not yet deployed, or defeated and awaiting respawn). */
  export type HeroPosition = MapSpaceId | typeof ARENA_POSITION | null;

  export type BattleTeamState = {
    // gold, heroes, structures: unchanged
    heroPositions: Record<HeroId, HeroPosition>;
  };

  export type BattleState = {
    schemaVersion: 11;
    // p1, p2, goldPiles, initiative: unchanged
  };
  ```
  - `ARENA_POSITION = "arena"` is exported from `lib/map/constants.ts`,
    next to `GOLD_PILE_STARTING_COUNT`. `"arena"` can't clash with a map
    space: every `MAP_SPACES` id is `p1-…`, `p2-…`, a tower slot or a
    gold pile, and the type checker would flag an overlap through
    `MapSpaceId`.
  - `heroPositions`' doc comment points at `HeroPosition` instead of
    describing `null` inline.
- `createInitialBattleState` (`reducer.ts`) writes `schemaVersion: 11`.
  `seedHeroPositions` still seeds `null`; its casts change from
  `MapSpaceId | null` to `HeroPosition`.
- **`SET_HERO_POSITION`** keeps its shape, with `spaceId: HeroPosition`.
  Its branch doesn't change: same-value writes return the same state
  reference, and a hero not on that side is ignored. It doesn't check who
  may enter the Arena (Arena Logic).
- `frontend/src/lib/persistence/schema.ts`:
  - `CURRENT_BATTLE_SCHEMA_VERSION = 11`. The draft schema doesn't change.
  - **Legacy types pin the old positions.** `LegacyBattleTeamStateV9` is
    built from `BattleTeamState` today, so it would silently widen. A new
    `LegacyBattleTeamStateV10` fixes that:
    ```ts
    type LegacyHeroPositions = Record<HeroId, MapSpaceId | null>;
    export type LegacyBattleTeamStateV10 = Omit<BattleTeamState, "heroPositions"> & {
      heroPositions: LegacyHeroPositions;
    };
    ```
    `LegacyBattleTeamStateV9` is built from it instead of
    `BattleTeamState`, and `PersistedBattleStateV10.p1/p2` become
    `LegacyBattleTeamStateV10`. Its doc comment says it's now only the
    migration source for `battleMigrations[10]`.
  - New `PersistedBattleStateV11` = `PersistedBattleStateV10` with
    `p1`/`p2: BattleTeamState` and `schemaVersion: 11`. It's the shape
    `saveBattleState` writes and `isValidPersistedBattleState` narrows to.
- `storage.ts`:
  - The payload types move from `PersistedBattleStateV10` to `V11`, plus
    the `schemaVersion` literal (to 11).
  - **Validation:** `hasValidBattleTeamShape`'s position check accepts
    the Arena:
    ```ts
    if (position !== null && position !== ARENA_POSITION && !isMapSpaceIdLike(position)) {
      return false;
    }
    ```
    Its doc comment says "`null`, `"arena"` or a real map-space id". It
    checks shape, not game rules: a save with three heroes in the Arena,
    or Felix's ally there, still loads, as a token on the wrong team does.
  - **Migration:** a version-only step, since the shape only widened:
    ```ts
    /** Schema 10 → 11: `heroPositions` may now hold `"arena"` (intent/14).
     * No save holds it yet, so nothing changes but the version: every
     * battle upgrades in place with the Arena empty. */
    function upgradeV10ToV11(data: unknown): PersistedBattleStateV11 | null {
      if (typeof data !== "object" || data === null) return null;
      return {
        ...(data as PersistedBattleStateV10),
        schemaVersion: 11,
        updatedAt: new Date().toISOString(),
      };
    }
    ```
    `battleMigrations` gains `10: upgradeV10ToV11`. `loadPersisted` chains
    steps, so saves from schema 1-9 also land on 11.
- **Test fixtures.** `storage.test.ts` gains a schema-10 upgrade case and
  a validation case for `"arena"` (accepted) and an unknown string
  (rejected). Hand-written `BattleState` fixtures change only their
  `schemaVersion` literal.

## Arena Logic
All in `frontend/src/lib/battle/arena.ts`, pure functions over
`BattleState`, unit-tested in `arena.test.ts`:

```ts
/** The hero whose level-4 power card opens the Arena (intent/14). */
export const ARENA_OWNER: HeroId = "felix";
/** The power card's level. Equal to HERO_MAX_LEVEL today, but kept apart:
 * it's a card fact, not the level cap. */
export const ARENA_UNLOCK_LEVEL = 4;

/** The side Felix was drafted on, or `null` if he wasn't. */
export function arenaOwnerSide(state: BattleState): PlayerId | null;

/** Every hero whose position is "arena", with their side, P1 first. */
export function arenaOccupants(state: BattleState): Array<{ side: PlayerId; heroId: HeroId }>;

/** Whether the Map shows the Arena panel. */
export function isArenaShown(state: BattleState): boolean;

/** Whether dropping `hero` into the Arena should take effect. */
export function canEnterArena(state: BattleState, hero: HeroDragPayload): boolean;
```

- **Felix's side** is read from the battle state (`ARENA_OWNER in
  state.p1.heroes`), not the draft rosters. They agree, since the battle
  is built from the draft, and the functions then need nothing but
  `BattleState`.
- **`isArenaShown`** (intent's Scope, decided 2026-10-17) is true when
  either:
  - **the Arena is occupied:** `arenaOccupants(state).length > 0`,
    whatever Felix's level or state. A level lowered by hand or Felix
    losing the duel never hides a hero.
  - **Felix can open it:** he was drafted, his `level >=
    ARENA_UNLOCK_LEVEL`, his `hp > 0` and his position isn't `null`.

  Otherwise it's false, including when Felix wasn't drafted. A Felix at
  0 HP is always in his respawn area (`setHeroHp`), so the two "not
  defeated" checks only differ for a Felix who has HP but hasn't been
  dragged back out yet. The intent counts that as defeated too.
- **`canEnterArena`** (intent's Scope: "Only Felix and one enemy can go
  in") is true when Felix was drafted and either:
  - the hero is Felix, on his side; or
  - the hero is on the side opposite Felix, and no **other** hero from
    that side is in the Arena.

  Felix's allies are always refused, and so is a second enemy. A hero
  already in the Arena passes (it doesn't count against itself), and the
  reducer turns the repeated write into a no-op. It doesn't check HP,
  level, whether the panel is shown, or where the hero comes from: a hero
  can enter from a space or straight from their respawn area (intent's
  Scope: "in any order").
- **Leaving is never refused.** The Arena is a source like any space, so
  its tokens drag onto a `MapSpace` or the hero's own `RespawnAreaStrip`
  through their existing drop handlers. Nothing enforces "nobody leaves
  until one is defeated" (intent's Out of Scope).
- **No reducer check.** `SET_HERO_POSITION` with `"arena"` for any hero
  sets it, as `SET_HERO_COUNTED_TOKEN` sets a hero-specific token
  anywhere. The rules live in `arena.ts` and the drop handler.
- **Not a hero-specific token.** The Arena doesn't go in
  `HERO_SPECIFIC_TOKENS`: it isn't on a card, has an extra level gate, and
  follows occupancy. `arenaOwnerSide` stands alone, like
  `targetSideForRule` does for tokens.

## Layout
- **`ArenaPanel`** (new, `components/ArenaPanel/ArenaPanel.tsx` +
  `.module.css`):
  ```ts
  type ArenaPanelProps = {
    /** Heroes whose position is "arena", P1 first. At most 2 in play. */
    occupants: Array<{ hero: Hero; side: PlayerId }>;
    /** canEnterArena, bound to the current state. */
    canDrop: (payload: HeroDragPayload) => boolean;
    onDrop: (payload: HeroDragPayload) => void;
  };
  ```
  - A `<section aria-label="The Arena">` with a small "The Arena" label on top
    of a dashed box, the same drag-enter/leave depth counter and highlight as
    `RespawnAreaStrip`. Its drop handler parses the payload
    (`parseHeroDragPayload`) and calls `onDrop` only when `canDrop`
    passes. Any other drop is silently ignored, like a respawn area
    ignoring the other team (intent's Scope).
  - The drag-over highlight can't tell a valid drop from a refused one
    while hovering: native drag-and-drop hides the payload until `drop`,
    as `RespawnAreaStrip`'s comment explains. It means "a drop could land
    here", the same as the respawn areas.
  - Each occupant is a plain `MapToken` in its team's ring, so it's
    draggable back out with no new code. The Arena holds at most Felix
    and one enemy in play, so the box is sized for two tokens side by
    side. A third (only possible from a hand-edited save) still renders,
    and the box grows.
  - Empty, it shows only the box, like an empty respawn area.
- **`BattleMapScreen`:**
  - The `teams` loop sorts each hero into `bySpace`, `respawn` or a new
    `arena` list (`position === ARENA_POSITION`), so an Arena hero is never
    drawn on a space.
  - It renders `<ArenaPanel>` only when `isArenaShown(battleState)`, with
    `canDrop={(payload) => canEnterArena(battleState, payload)}` and
    `onDrop={({ side, heroId }) => setHeroPosition(side, heroId,
    ARENA_POSITION)}`.
  - `setHeroPosition`'s prop type widens to `HeroPosition`.
- **Placement** (canvas, UI Design Reference): the board column, in one
  row with `GoldPilesBar` under the board, the Arena to its right. The side
  columns are per team, and the Arena is shared. `boardColumn` gains a
  row wrapper holding both. That row has room at 1280x800: the board is
  `min(70vh, 700px)`, about 560px wide, and the gold bar takes about half
  of it.
- **Height at 1280x800.** The Arena appears and disappears mid-game, so
  it must not make the Map scroll when shown, and it shouldn't jolt the
  board when it toggles. If it's in the gold bar's row, the row grows to
  the token box's height (a 46px `MapToken` plus its out-of-flow name
  label, about 80px with padding) instead of the bar's ~44px. Whether
  that fits next to the side columns, and whether to reserve the row's
  height while it's hidden, is checked in the browser (Open Items).
- **Not shown** on the Battle Board, `ResultsScreen`, `WinScreen` or in
  `MapTeamStatusPanel`, which lists each team's heroes and tokens but
  never positions (intent's Scope and Out of Scope).
- No "start duel" or "end duel" control (intent's Out of Scope).

## Assets
None. Occupants reuse each hero's `battleToken` art through `MapToken`,
and the panel has no icon.

## UI Design Reference
One new artboard, "Battle Map — Arena", on the same canvas as intents
01-13 ("BfbHelper — App Flow", version 80):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

- **A separate artboard, because a duel is rare** (decided 2026-10-17).
  The existing "Battle Map" artboard stays the everyday Map with no Arena,
  which is also what the app shows while the Arena is hidden. "Battle Map
  — Arena" sits below it: a copy of the same screen with the Arena added.
  "Battle Board" doesn't change.
- **The roster:** on the Arena artboard only, Felix replaces Vladiator on
  Player 2, keeping Vladiator's Death Mark in the status panel. Felix's
  level isn't drawn, since the Map doesn't show levels.
- **Placement:** the Arena sits in the row under the board, to the right
  of the gold-pile bar. Both are centred together in that row, so the side
  columns and the board keep their size.
- **Named "The Arena"** (decided 2026-10-17), not "To the Pain Arena": the
  label and the panel's `aria-label` both read "The Arena".
- **Look** (decided 2026-10-17: the label stays small): a dashed box
  with a gold border, with a small "The Arena" label on top of it,
  left-aligned. The label is 9px gold uppercase in the heading font,
  with no icon, so it takes about 12px above the box and no width beside
  it. The box is `--color-panel-bg` and sized for two tokens, about 132px
  wide and 76px tall.
- **Occupants** are the ordinary Map tokens in their team rings, with
  names below: Felix (P2 teal) and Agatha Trunch (P1 red). Their old board
  spaces are empty, and their status-panel lines don't change.
- **An "Arena" tweak** switches the artboard between **Duel** (the two
  inside, the default) and **Empty** (Felix at level 4, nobody in, both
  back on their spaces, only the box shown).
- The Arena artboard is 920px tall, against "Battle Map"'s 870px, for the
  taller bottom row. The canvas board is a fixed 700px, not the app's
  `min(70vh, 700px)`, so this doesn't settle the 1280x800 fit (Open
  Items).

This is a prototype for visual direction only, the same caveat as earlier
intents' references. It settles the Arena's name, its place beside the
gold piles, its gold dashed box and its label. If a revised canvas
supersedes these choices, it wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- ~~Draw the Arena on the canvas's "Battle Map" artboard: where it sits,
  its heading ("To the Pain Arena", or shorter if it doesn't fit), its
  look empty and with two heroes inside. Then rewrite UI Design Reference
  above.~~
  **Decided:** done (App Flow version 80), on a new "Battle Map — Arena"
  artboard, with a small "The Arena" label on top of the box. See UI Design
  Reference.
- The Arena uses `--color-gold` for its label and dashed border, so it
  reads as neutral, belonging to neither team. Check in the browser that it
  doesn't look like a gold-pile control next to `GoldPilesBar`.
- Check the Map at 1280x800 with the Arena shown and two heroes inside:
  no scroll, and the side columns and board keep their size. Decide
  whether the Arena's row keeps its height while hidden, so the board
  doesn't move when Felix reaches level 4 or the Arena empties.
- Decide whether `ArenaPanel` shares a base with `RespawnAreaStrip` (the
  drag-depth counter and highlight), or copies the ~20 lines. Copy first;
  extract only if `/simplify` flags it.
