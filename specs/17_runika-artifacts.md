# Spec 17: Runika's Artifacts

> **DRAFT.** Architecture for intent 17's scope. Build-out has not started
> yet. See [../intent/17_runika-artifacts.md](../intent/17_runika-artifacts.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-16: React + TypeScript,
  Next.js, static build, no backend.
- **Not a `BATTLE_TOKENS` row.** Every row there is held or not, and is
  added from the "+" picker. The Artifacts are always there and only flip
  (intent's Scope: "Not part of intent 09's token row or '+' picker"). So
  they get their own small table, `ARTIFACTS` (`components/artifacts.ts`),
  and their own control, `ArtifactToggle`. `HeroCard`'s token row, the
  picker and `BATTLE_TOKENS` don't change.
  - **Board:** a new artifact row on Runika's `HeroCard`, between the
    level row and the token row, with three `ArtifactToggle` pills.
  - **Map:** `MapTeamStatusPanel`'s token line gains an icon for each of
    Runika's face-up Artifacts, after her token icons.
- No new store or storage key. Per intent's Affected Systems, the
  Artifacts are three new fields on each hero's `HeroBattleState`, next to
  `favoredEnemy`. That makes this a battle schema bump (13 → 14) with an
  in-place migration, as intents 04-16 did.
- **Stored on every hero, shown only on Runika.** Spec 15 kept
  `HeroBattleState` one shape so validation and migrations stay uniform,
  and this follows it. Every hero gets the three flags, all face-up.
  Only Runika's card and Map line read them.
- **Visibility needs no `HERO_SPECIFIC_TOKENS` rule.** Those rules pick a
  *side* (enemies or allies of the owner). The Artifacts go on the owner
  herself, and her card only renders while she's drafted. So "only while
  Runika is in the battle" (intent's Scope) is one id check,
  `hero.id === ARTIFACT_OWNER`, in `BattleTeamPanel` and
  `MapTeamStatusPanel`. She counts at 0 HP and in the respawn area, since
  the card and the panel row are always rendered for a drafted hero.
- **One write path, like spec 15's on/off tokens:** one
  `SET_HERO_ARTIFACT` action, one `setHeroArtifact` mutator, keyed by the
  stored field. It's separate from `SET_HERO_ON_OFF_TOKEN`, so the
  Artifact fields stay out of `OnOffTokenField`, `BattleTokenField` and
  `HeroCardTokens`. Those types drive the token row and picker, which the
  Artifacts aren't part of.

## State Management
- **`useBattle` (`frontend/src/lib/useBattle.ts`)** gains:
  ```ts
  /** Flips one of Runika's Artifacts (intent/17), named by its stored
   * field. `faceUp: false` is face-down. */
  setHeroArtifact: (
    side: PlayerId,
    heroId: HeroId,
    field: ArtifactField,
    faceUp: boolean,
  ) => void;
  ```
  A plain `useCallback` dispatching `SET_HERO_ARTIFACT`, the same shape as
  `setHeroOnOffToken`. It takes a `heroId` rather than assuming Runika, so
  the reducer stays hero-agnostic. Only the UI limits it to her.
- **`page.tsx`** passes `setHeroArtifact={battle.setHeroArtifact}` to
  `BattleBoardScreen`, next to `setHeroToken`. `BattleBoardScreen` binds
  the side and hands `BattleTeamPanel` an
  `onHeroArtifactChange: (heroId, field, faceUp) => void`. The Map gets no
  setter (intent's Scope: display only).
- **What doesn't touch the Artifacts.** Per intent's Scope ("Manual
  only"), Out of Scope and Session Lifecycle:
  - `setHeroHp` keeps its HP-to-0 → respawn-area side effect and leaves
    them alone. Runika's defeat doesn't flip them, and neither does an
    enemy hit (an HP drop).
  - `setHeroPosition` doesn't touch them, so a respawn (a move out of the
    respawn area) doesn't flip them face-up.
  - The token setters, `setHeroLevel`, `passInitiative` and `setIceWall`
    don't touch them.
- The reducer doesn't check that the hero is Runika.
  `SET_HERO_ARTIFACT` on any hero sets that hero's flag. Only the UI
  decides who gets the controls.
- `useBattle`'s hydrate effect doesn't change. A fresh battle gets all
  three face-up from `createInitialHeroState`, and `clearDraft()` already
  removes the persisted `BattleState`, so a new draft resets them
  (intent's Session Lifecycle).

## Data Model
- `frontend/src/lib/battle/types.ts`:
  ```ts
  export type HeroBattleState = {
    // hp, level, attackTokens … favoredEnemy: unchanged
    /** Runika's Artifacts (intent/17): `true` is face-up, `false`
     * face-down. Every hero has them, all face-up, so the shape stays one;
     * only Runika's card and Map line read them (ARTIFACT_OWNER). Changed
     * only by hand: never flipped on a hit, Rest, respawn or defeat. */
    battleFistFaceUp: boolean;
    autoDeflectorFaceUp: boolean;
    shieldAmuletFaceUp: boolean;
  };

  /** One of Runika's Artifacts' stored fields (intent/17), read from
   * ARTIFACT_FIELDS. They share one reducer action (SET_HERO_ARTIFACT) and
   * one useBattle setter. */
  export type ArtifactField = (typeof ARTIFACT_FIELDS)[number];

  export type BattleState = {
    schemaVersion: 14;
    // p1, p2, goldPiles, initiative, iceWall: unchanged
  };
  ```
  - **Three plain fields, not a nested object**, matching spec 09's "one
    plain field per token". This means `addHeroFieldsStep` and the
    validation loop work unchanged, and a nested object would need its own
    copy and shape checks.
  - Named `…FaceUp` so `true` reads right. Calling them `battleFist`
    would leave it unclear which side `true` is.
- `constants.ts`, next to `ON_OFF_TOKEN_FIELDS`:
  ```ts
  /** The hero whose card and Map line show the Artifacts (intent/17). */
  export const ARTIFACT_OWNER: HeroId = "runika";

  /** Runika's Artifacts' stored fields (intent/17), in the card's order:
   * Battle Fist, Auto Deflector, Shield Amulet (the rulebook's, p. 3).
   * ArtifactField is read from this list, and storage validation and
   * createInitialHeroState loop over it. */
  export const ARTIFACT_FIELDS = [
    "battleFistFaceUp",
    "autoDeflectorFaceUp",
    "shieldAmuletFaceUp",
  ] as const satisfies readonly BooleanHeroField[];
  ```
- `createInitialHeroState(hero)` (`reducer.ts`) returns all three `true`,
  and its doc comment adds "Artifacts face-up". Per intent's Constraints,
  new battles, upgraded saves and the `?? createInitialHeroState(hero)`
  fallbacks all agree. `createInitialBattleState` writes
  `schemaVersion: 14`.
- `frontend/src/lib/persistence/schema.ts`:
  - `CURRENT_BATTLE_SCHEMA_VERSION = 14`. The draft schema doesn't change.
  - The legacy hero chain gains a link at the top. Schemas 12 and 13 have
    the same hero shape (intent 16 added only the top-level `iceWall`),
    so one type covers both:
    ```ts
    type LegacyHeroBattleStateV13 = Omit<HeroBattleState, ArtifactField>;
    type LegacyHeroBattleStateV11 = Omit<LegacyHeroBattleStateV13, "favoredEnemy">;
    ```
  - New `LegacyBattleTeamStateV13` = `BattleTeamState` with heroes of
    `LegacyHeroBattleStateV13`. `LegacyBattleTeamStateV11` already
    replaces `heroes` with its own type, so the older team types never
    pick up the Artifact fields.
  - `PersistedBattleStateV12.p1/p2` and (through it)
    `PersistedBattleStateV13`'s become `LegacyBattleTeamStateV13`.
    `V13`'s doc comment says it's now only the migration source for
    `battleMigrations[13]`.
  - New `PersistedBattleStateV14` = `PersistedBattleStateV13` with
    `p1`/`p2: BattleTeamState` and `schemaVersion: 14`. It's the shape
    `saveBattleState` writes and `isValidPersistedBattleState` narrows to.
- `storage.ts`:
  - The payload types move from `PersistedBattleStateV13` to `V14`, plus
    the `schemaVersion` literal (to 14). There's no field copying, since
    the flags ride inside `p1`/`p2`.
  - **Validation:** `hasValidBattleTeamShape` gains one loop next to the
    on/off one:
    ```ts
    for (const field of ARTIFACT_FIELDS) {
      if (typeof hv[field] !== "boolean") return false;
    }
    ```
    Its doc comment adds "each Artifact a boolean". A missing or
    non-boolean flag fails the whole payload. It doesn't check that only
    Runika's flags are ever face-down: validation checks shape, not game
    rules.
  - **Migration:**
    ```ts
    /** Schema 13 → 14: every hero gets Runika's three Artifacts face-up
     * (intent/17: "upgrades in place, with all three face-up"). */
    const upgradeV13ToV14 = addHeroFieldsStep<PersistedBattleStateV14>(14, {
      battleFistFaceUp: true,
      autoDeflectorFaceUp: true,
      shieldAmuletFaceUp: true,
    });
    ```
    `battleMigrations` gains `13: upgradeV13ToV14`. `loadPersisted` chains
    steps, so saves from schemas 1-12 also land on 14.
- **Test fixtures.** `src/test/heroState.ts`'s `NO_TOKENS` gains the
  three flags as `true`, so every fixture that spreads it gets a fresh
  hero's Artifacts. Its doc comment says the Artifacts are in there too,
  face-up. The type checker finds any hand-written `HeroBattleState`.
  `storage.test.ts`'s `withoutHeroFields` calls for older schemas also
  strip the three fields, and a new schema-13 case checks the upgrade. No
  e2e spec seeds a persisted battle, so `e2e/` needs no fixture edits.

## Artifacts Logic
- **One new `BattleAction` variant** in `battleReducer`:
  ```ts
  | {
      type: "SET_HERO_ARTIFACT";
      side: PlayerId;
      heroId: HeroId;
      field: ArtifactField;
      faceUp: boolean;
    }
  ```
  Its branch is one `setHeroField(state, side, heroId, field, faceUp)`
  call, which returns the same state reference if the hero isn't on that
  side or the value already matches. Its comment says it's manual only,
  with no flip on a hit, Rest, respawn or defeat.
- It changes nothing else: no HP, no token, no position. Per intent's
  Rules, the app shows which Artifacts are face-up and what each gives.
  Players apply the bonuses and the power cards' extra effects
  themselves. There's no running Attack or defense total (intent's Out
  of Scope).
- **Always editable.** Nothing gates the action or the pills on
  `hp === 0` or `heroPositions[heroId] === null` (intent's Scope). The
  card flips them face-up on respawn, so they have to work in the respawn
  area.
- **One tap per Artifact.** There's no "flip all" action or control
  (intent's Scope and Out of Scope).
- **Display table** (`components/artifacts.ts`, new):
  ```ts
  /** How one of Runika's Artifacts looks (intent/17), shared by her
   * Board card (ArtifactToggle) and the Map's token line. */
  export type ArtifactLook = {
    field: ArtifactField;
    /** The name everywhere: the pill's tooltip and accessible name, the
     * Map icon's. */
    name: string;
    /** The bonus a face-up Artifact gives Runika, printed on its token
     * (intent/17's Rules). Shown after the name, never applied. */
    bonus: string;
    Icon: ComponentType<{ size: number }>;
  };

  /** In ARTIFACT_FIELDS' order. One accent for all three:
   * --color-artifact. */
  export const ARTIFACTS: readonly ArtifactLook[] = [
    {
      field: "battleFistFaceUp",
      name: "Battle Fist",
      bonus: "+1 Attack",
      Icon: BattleFistIcon,
    },
    {
      field: "autoDeflectorFaceUp",
      name: "Auto Deflector",
      bonus: "+1 defense vs melee attacks",
      Icon: AutoDeflectorIcon,
    },
    {
      field: "shieldAmuletFaceUp",
      name: "Shield Amulet",
      bonus: "+1 defense vs magic attacks",
      Icon: ShieldAmuletIcon,
    },
  ];

  /** "Battle Fist: +1 Attack", the start of every tooltip and accessible
   * name for an Artifact. */
  export function artifactSummary({ name, bonus }: ArtifactLook): string {
    return `${name}: ${bonus}`;
  }
  ```
  - The bonuses are written in words ("defense", "melee", "magic"), not
    the token's printed icons, so they read in a tooltip and to a screen
    reader. They're the same text the intent's Rules quote.

## Layout
- **`ArtifactToggle`** (new, `components/ArtifactToggle/ArtifactToggle.tsx`
  + `.module.css`):
  ```ts
  type ArtifactToggleProps = {
    faceUp: boolean;
    onChange: (faceUp: boolean) => void;
    /** Decorative, `aria-hidden` (e.g. `<BattleFistIcon size={12} />`). */
    icon: ReactNode;
    /** The Artifact's name and bonus (artifactSummary), e.g.
     * "Battle Fist: +1 Attack". */
    summary: string;
    heroName: string;
  };
  ```
  - A `<button>` in the same 20px pill shape as `TokenToggle`.
    `aria-pressed={faceUp}` carries the state, so the label stays fixed,
    as in `TokenToggle`:
    `aria-label="Battle Fist: +1 Attack, on Runika"`. The tooltip adds the
    state and the action, e.g.
    `title="Battle Fist: +1 Attack (face-up, tap to flip)"` (intent's
    Scope: "Each Artifact's bonus is shown, not applied"). A tap calls
    `onChange(!faceUp)`.
  - **Face-up:** lit like `TokenToggle`, in `--color-artifact`: a solid
    accent border, a 16% accent fill and an accent icon.
  - **Face-down:** greyed out (intent's Scope): a dashed
    `--color-button-border` outline, no fill, a `--color-muted` icon and
    0.6 opacity, rising to 1 on hover. The dashed outline and the opacity
    both carry the state, so it doesn't rest on hue alone.
  - Not a reuse of `TokenToggle`: that one is only rendered lit, and its
    tooltip says "tap to remove". A flag for "always rendered, greys when
    off" would make it a second component in disguise.
- **Icons** (new, in `components/ArtifactToggle/`: `BattleFistIcon.tsx`,
  `AutoDeflectorIcon.tsx`, `ShieldAmuletIcon.tsx`, `size` prop,
  `aria-hidden`). Each follows the token icon style (simplified line-art
  of the rulebook token, 16px viewBox, 1.5 stroke, like the +1 Attack
  swords), drawn from each token's centre art (p. 3, Components) without
  the blue disk or the printed text:
  - **Battle Fist:** a clenched gauntlet seen from the front, with three
    knuckle bumps over a rounded fist and the thumb on the left.
  - **Auto Deflector:** the token's gem orb on its stand, with a circle
    on a trapezoid base and three short spark ticks above.
  - **Shield Amulet:** the token's winged medallion: a ring with a swept
    wing on each side and a chain line on top.

  The canvas draws all three (Open Items). They're 12px on the Board and
  13px on the Map, like the token icons.
- **Accent color.** A new `globals.css` token, `--color-artifact`, with a
  comment like `--color-favored-enemy`'s. The rulebook's Artifact tokens
  are a mid blue, so it's a periwinkle, `#7d9cf0`, picked on the canvas.
  It's bluer and more saturated than `--color-immobilize` `#8fb4e0`, and
  bluer and darker than `--color-chill` `#5ccfe6`. Both can sit on
  Runika's card, so check they read apart (Open Items).
- **`HeroCard`** (battle variant) gains one optional prop:
  ```ts
  /** Runika's Artifacts (intent/17), keyed by field. The artifact row
   * renders only when this is provided: the Board passes it on Runika's
   * card alone. */
  artifacts?: HeroCardArtifacts;

  export type HeroCardArtifacts = Record<
    ArtifactField,
    { faceUp: boolean; onChange: (faceUp: boolean) => void }
  >;
  ```
  - When it's there, a new `.artifactRow` renders between `.levelRow`
    and `.tokenRow`: a `role="group"` with
    `aria-label="Runika's Artifacts"` (built from `hero.name`) and one
    `ArtifactToggle` per `ARTIFACTS` entry, in order. It's a flex row
    with a 4px gap, like `.tokenRow`, and doesn't wrap: three pills are
    about 80px, inside the info column's about 133px at 1280x800.
  - It's not inside `.tokenRow`, so the Artifacts never mix with the
    token chips, never wrap with them and aren't counted in spec 09's
    8-token sizing (intent's Scope).
  - The Win Screen passes no `artifacts`, so its cards don't change.
- **`BattleTeamPanel`** gains `onHeroArtifactChange` and, for
  `hero.id === ARTIFACT_OWNER` only, builds `artifacts` from
  `heroState` (`faceUp: heroState[field]`,
  `onChange: (faceUp) => onHeroArtifactChange(hero.id, field, faceUp)`).
  Every other hero gets no prop, so no row (intent's Scope: "Runika's own
  card only").
- **Height at 1280x800.** Runika's card grows by one 20px line plus the
  column's 8px gap. Typically she holds 0-3 tokens on one line, so her
  card is as tall as a hero with two token lines today. The heaviest case
  is Runika holding all eight tokens as an ally of Cyrus and an enemy of
  Kunoichi, Sedusa, Dazeem and Boreas. That's spec 15's three token lines
  plus the artifact line. The case needs five specific heroes in one game
  (Open Items).
- **Map** (`MapTeamStatusPanel`): for `hero.id === ARTIFACT_OWNER`, the
  token line also maps over `ARTIFACTS`, keeping only face-up ones, and
  renders each after the `BATTLE_TOKENS` icons as a `.token` span. Each
  gets `--token-accent: var(--color-artifact)`, a 13px icon,
  `aria-label={artifactSummary(artifact)}` (e.g. "Shield Amulet: +1
  defense vs magic attacks") and the same text plus " (face-up)" as its
  `title`. The line renders
  when she holds a token **or** has a face-up Artifact, so it's there for
  her even with no tokens, and gone only when all three are face-down and
  she holds nothing (intent's Scope: "shown only while held"). It sits
  inside the row, so `.dimmed` covers it for a defeated Runika. Nothing
  is added to `MapToken`.
- **Not shown** on `ResultsScreen`, `WinScreen`, `MapToken`,
  `RespawnAreaStrip` or any other hero's card (intent's Scope and Out of
  Scope).

## UI Design Reference
Added to two existing artboards on the same canvas as intents 01-16
("BfbHelper — App Flow", version 88):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

- **The roster:** Runika replaces Agatha Trunch as Player 1's fourth
  hero, on both artboards, keeping her seeds (+1 Attack ×2, Shield ×3,
  Chill ×5). Agatha had no hero-specific feature, so nothing else moves.
  Runika's HP is 7 (base 8, level 1).
- **"Battle Board":**
  - **The artifact row** sits on Runika's card between the level row and
    the token row: three icon-only pills in Battle Fist, Auto Deflector,
    Shield Amulet order, in `--color-artifact` `#7d9cf0`.
  - **Seeds:** Battle Fist and Shield Amulet face-up (lit), Auto
    Deflector face-down (dashed, muted, 0.6 opacity), as after one enemy
    hit. Tapping any pill flips it.
  - **Tooltips** give each Artifact's name, bonus and state, e.g.
    "Auto Deflector: +1 defense vs melee attacks (face-down, tap to
    flip)".
  - No other card has the row, and Runika's "+" picker is unchanged.
- **"Battle Map":** in Player 1's status panel, Runika's token line ends
  with the Battle Fist and Shield Amulet icons (11px, like the other
  icons), after the Chill count. Their tooltips give the name and bonus.
  Auto Deflector, face-down, isn't shown. Her board token uses her own
  art.
- **Not drawn:** Runika's heaviest-token case, and a line with face-up
  Artifacts and no tokens. Both are build checks (Open Items).
- "Battle Map — Arena" isn't touched. Runika isn't in its roster.

This is a prototype for visual direction only, the same caveat as earlier
intents' references. It settles the periwinkle accent, the three icons,
the face-down look, the row's place on the card and the Map's face-up-only
icons. If a revised canvas supersedes these choices, it wins over what's
written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- `--color-artifact` is `#7d9cf0` on the canvas. Check at 1280x800 that a
  face-up pill reads apart from Immobilize's ice blue and Chill's cyan on
  the same card, and from P2's teal.
- The canvas draws the icons (16px viewBox, stroke 1.5):
  ```svg
  <!-- Battle Fist -->
  <path d="M4 7V5.5a1.25 1.25 0 0 1 2.5 0V7M6.5 6.5V4.25a1.25 1.25 0 0 1 2.5 0V6.5M9 6.5V4.75a1.25 1.25 0 0 1 2.5 0V7" />
  <path d="M11.5 7V6a1.25 1.25 0 0 1 2.5 0v3a4.5 4.5 0 0 1-4.5 4.5h-2A4 4 0 0 1 3.5 9.5V8a1.25 1.25 0 0 1 2.5 0v1" />
  <!-- Auto Deflector -->
  <circle cx="8" cy="6.25" r="3" />
  <path d="M5.75 10.5h4.5l1 3.25h-6.5z" />
  <path d="M8 9.25v1.25M2.5 3.5l1.25.75M13.5 3.5l-1.25.75" />
  <!-- Shield Amulet -->
  <circle cx="8" cy="9" r="2.5" />
  <path d="M5.5 9C4.25 7.25 2.75 6.5 1 6.5c.25 2.5 1.75 4.25 4.5 4.75M10.5 9c1.25-1.75 2.75-2.5 4.5-2.5-.25 2.5-1.75 4.25-4.5 4.75" />
  <path d="M8 2.5v4" />
  ```
  Check each reads at 12px on the Board and 13px on the Map, and that the
  three are told apart at a glance, face-down too. Simplify a path that
  muddies.
- Check the face-down look (dashed, muted, 0.6 opacity) at 1280x800: is
  it clearly "greyed out" yet still findable as a tap target?
- Check the Board at 1280x800 with Runika in the heaviest case (all eight
  tokens, plus the artifact row): her card is four lines below the level
  row at most, and the Board doesn't scroll, with any stepper open. Also
  check her Map token line with tokens plus three face-up Artifacts in
  the 170px panel.
- Schema number: this assumes intent 16's Ice Wall (schema 13, v0.16.0)
  stays the latest. If another schema bump lands first, this becomes the
  next number, with its `PersistedBattleStateV…` and `upgradeV…` renamed.
