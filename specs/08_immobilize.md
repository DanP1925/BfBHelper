# Spec: BfbHelper v8 — Immobilize

> **DRAFT.** Architecture for intent 08's scope. Build-out has not started
> yet. See [../intent/08_immobilize.md](../intent/08_immobilize.md) for the
> product-level problem, scope, and behavior this spec exists to satisfy.

## Architecture Overview
- Same frontend-only architecture as v1-v7: React + TypeScript, Next.js,
  static build, no backend.
- No new screen and no new control type. Immobilize reuses intent 07's
  `TokenToggle` in the Battle Board hero card's token row, after the
  Confuse toggle. The Map gets a read-only icon in `MapTeamStatusPanel`'s
  token line, after the Confuse icon (see Layout).
- No new store or storage key. Per intent's Affected Systems, the flag is
  one new field on each hero's `HeroBattleState`, next to `hp`, `level`,
  `attackTokens` and `confused`. That makes this a battle schema bump
  (5 → 6) with an in-place migration, the same approach as intents 04-07.
- **Plain field, not a keyed `toggles` map** (decided 2026-10-12). After
  intent 07, `/simplify` suggested storing on/off tokens as one keyed map
  with a single generic setter. That's not done here:
  - Only three tokens in the backlog are on/off on every hero: Confuse,
    Immobilize and Kunoichi's Death Mark. The counted ones (+1 Attack,
    Shield, Chill, Stone) outnumber them, and Favored Enemy, Bear Trap,
    Ice Wall, the Arena and Runika's Artifacts aren't per-hero flags at
    all. A toggles-only map would generalize the smaller half.
  - If a generic shape pays off, it's one token registry covering counts
    and toggles plus the hero-specific visibility rule. That's best
    designed with the first hero-specific token intent, or with
    `BACKLOG.md`'s "Revisit every token's display" follow-up.
  - Moving plain fields into such a map later is still one migration
    step, so waiting costs about the same as doing it now.

## State Management
- One new mutator on `UseBattleResult` (`frontend/src/lib/useBattle.ts`):
  `setHeroImmobilized: (side: PlayerId, heroId: HeroId, value: boolean) => void`.
  A plain `useCallback` dispatching `SET_HERO_IMMOBILIZED`, the same shape
  as `setHeroConfused`. It takes the new value, not a "toggle" command,
  and the toggle computes `!immobilized`.
- **What doesn't touch the flag.** Per intent's Scope ("Moving is never
  blocked") and Out of Scope ("Automatic clearing"):
  - `setHeroPosition` / `SET_HERO_POSITION` leaves `immobilized` alone. A
    drag of an immobilized hero on the Map goes through as usual. This
    is the case that matters most here, since moving is exactly what the
    rule is about.
  - `setHeroHp` keeps its HP-to-0 → respawn-area side effect and leaves
    the flag alone, so defeat doesn't clear it (intent's Rules: decided
    2026-10-12, even though the physical standee leaves the board).
  - `setHeroAttackTokens`, `setHeroConfused` and `passInitiative` don't
    touch it either.
- `useBattle`'s hydrate effect and its parameters don't change. A fresh
  battle gets `immobilized: false` from `createInitialHeroState`, and a
  loaded one keeps its stored flags.
- `clearDraft()` already removes the persisted `BattleState`, so a new
  draft resets every flag (intent's Session Lifecycle). No change needed.
- No UI state. Like the Confuse toggle, there's nothing to expand, so
  `BattleBoardScreen`'s `openTokenKey` doesn't change.

## Data Model
- `frontend/src/lib/battle/types.ts`:
  ```ts
  export type HeroBattleState = {
    hp: number;
    level: number;
    attackTokens: number;
    confused: boolean;
    /** Immobilized (intent/08): the standee lying on its side. On/off.
     * The app shows it only, never blocks a move, and never clears it:
     * not on a move, defeat, respawn or a new round. */
    immobilized: boolean;
  };

  export type BattleState = {
    schemaVersion: 6;
    // p1, p2, goldPiles, initiative: unchanged
  };
  ```
  Per-hero, because the state belongs to the hero. Per intent's Out of
  Scope, who applied it isn't stored.
- No constant or clamp. A boolean has no bounds, so `constants.ts` and
  `bounds.ts` don't change.
- `createInitialHeroState(hero)` (`reducer.ts`) returns
  `immobilized: false`, and its doc comment says every hero starts
  standing. Per intent's Constraints, new battles, upgraded saves and the
  `?? createInitialHeroState(hero)` fallbacks in `BattleTeamPanel`,
  `WinScreen` and `MapTeamStatusPanel` all agree on off.
  `createInitialBattleState` writes `schemaVersion: 6`.
- `frontend/src/lib/persistence/schema.ts`:
  - `CURRENT_BATTLE_SCHEMA_VERSION = 6`. `CURRENT_DRAFT_SCHEMA_VERSION`
    doesn't change.
  - `PersistedBattleStateV5` is typed with `BattleTeamState`, which now
    carries `immobilized`. Add a legacy team type for it, as spec 07 did
    with `LegacyBattleTeamStateV4`:
    ```ts
    /** One side's battle-team state in schema 5: per-hero confused,
     * but no immobilized flag yet (intent/08). */
    export type LegacyBattleTeamStateV5 = Omit<BattleTeamState, "heroes"> & {
      heroes: Record<HeroId, Omit<HeroBattleState, "immobilized">>;
    };
    ```
    `PersistedBattleStateV5.p1/p2` become `LegacyBattleTeamStateV5`, and
    its doc comment says it's now only the migration source for
    `battleMigrations[5]`.
  - `LegacyBattleTeamStateV4` is `Omit<HeroBattleState, "confused">`, which
    would now still include `immobilized`. Change it to omit both fields,
    so the schema-4 type stays what schema 4 actually stored.
  - New `PersistedBattleStateV6` = `PersistedBattleStateV5` with
    `p1`/`p2: BattleTeamState` and `schemaVersion: 6`. It's the shape
    `saveBattleState` writes and `isValidPersistedBattleState` narrows to.
- `saveBattleState` / `loadBattleState` (`storage.ts`) need no field
  copying. `immobilized` rides inside `p1`/`p2`. Only the payload type and
  the `schemaVersion` literal in `loadBattleState`'s return change (to 6).
- **Validation:** `hasValidBattleTeamShape` additionally requires every
  `heroes` entry to have `typeof immobilized === "boolean"`, next to the
  `confused` check. A missing or non-boolean value fails the whole
  payload (the same clear-on-failure convention as other hero fields).
  Its doc comment lists the new field.
- **Migration:** one line, with spec 07's `addHeroFieldsStep` helper:
  ```ts
  /** Schema 5 → 6: every hero gets `immobilized: false` (intent/08:
   * "upgrades in place", every hero not immobilized). */
  const upgradeV5ToV6 = addHeroFieldsStep<PersistedBattleStateV6>(6, { immobilized: false });
  ```
  - `battleMigrations` gains `5: upgradeV5ToV6`. `loadPersisted` already
    chains steps, so saves from schema 1 to 4 also land on 6.
  - Default for upgraded saves: **off for every hero** (intent's
    Constraints). A standee already on its side mid-game is re-entered by
    hand, one tap.

## Immobilize Logic
- New `BattleAction` variant in `battleReducer`:
  `{ type: "SET_HERO_IMMOBILIZED"; side: PlayerId; heroId: HeroId; value: boolean }`.
  It's one `setHeroField(state, side, heroId, "immobilized", value)` call,
  reusing the generic helper spec 07 introduced. It returns the same
  state reference if the hero isn't on that side or the value already
  matches. A short comment marks it manual-only, like the Confuse branch.
- It changes nothing else: no HP, no tokens, no position. Per intent's
  Rules, the app only shows the state. Players apply "stand up instead
  of moving" themselves.
- **No drag guard.** `BattleMapScreen`'s drag-and-drop handlers and
  `MapToken` don't read `immobilized` (intent's Scope and Out of Scope:
  no blocking, no warning).
- **Always editable.** Nothing gates the action on `hp === 0` or
  `heroPositions[heroId] === null` (intent's Scope, and intent 03's "the
  app never blocks a value from changing").
- No "clear all" and no automatic clearing (intent's Out of Scope).

## Layout
- **`TokenToggle` label.** It currently builds its aria-label as
  `` `${label} token on ${heroName}` `` and its title as `` `${label} token` ``.
  That reads wrong for Immobilize, which isn't a token in the box
  (intent's Rules: "There's no Immobilize token"). So `label` becomes the
  full name, used verbatim:
  - aria-label `` `${label} on ${heroName}` ``, title `label`.
  - Confuse passes `label="Confuse token"`, so its accessible text doesn't
    change ("Confuse token on Agatha Trunch").
  - Immobilize passes `label="Immobilized"`: "Immobilized on Boreas",
    tooltip "Immobilized". With `aria-pressed` it reads as "Immobilized
    on Boreas, toggle button, pressed".
  - The prop's doc comment and `TokenToggle.test.tsx`'s label test change
    to match. Nothing else about the toggle changes: same off/on looks,
    same `accent` prop.
- **`ImmobilizeIcon`** (new, `components/TokenToggle/ImmobilizeIcon.tsx`,
  `size` prop, `aria-hidden`), next to `ConfuseTokenIcon`. There's no
  rulebook token to draw from, so it uses the common "held in place"
  sign, as in the mockup: a horizontal three-link chain, two face-on
  oval links joined by a flat, edge-on middle link. It's a 16px-viewBox stroke SVG in
  `currentColor`, like the swords and the "?", 12px on the Board and
  13px on the Map.
- **Accent color.** A new `globals.css` token, `--color-immobilize`,
  `#8fb4e0` (ice blue, from the mockup), passed as the toggle's `accent`
  and used for the Map entry's color. It reads apart from gold (+1
  Attack), `--color-confuse` purple, `--color-hp` red, and the team
  colors, especially `--color-p2` teal `#4f9aa0`, in lightness as well
  as hue.
- **`HeroCard` battle variant** gains one optional prop,
  `immobilized?: HeroCardToggleProps`, next to `confused`:
  - `.tokenRow` renders when any of the three token props is provided.
    Immobilize goes after the Confuse toggle, per intent's Scope ("next to
    the +1 Attack and Confuse controls").
  - The Battle Board (`BattleTeamPanel`) passes it. `WinScreen` doesn't
    (intent's Out of Scope).
- **Width at 1280x800.** Spec 07 measured the token row at ~105px of
  144px with a ×9 chip expanded and a lit Confuse toggle. A third toggle
  adds a 4px gap and ~24px when lit, about **133px**. That still fits on
  one line, so **no card gets taller** and the Board's height doesn't
  change. The margin is only ~11px, though. The row's `flex-wrap: wrap`
  stays as the fallback, and a wrap would add a row to every card, so
  this needs a browser check (Open Items).
- **Wiring:**
  - `BattleTeamPanel` gains `onHeroImmobilizedChange: (heroId, value: boolean) => void`
    and passes `heroState.immobilized` and the handler to each `HeroCard`.
  - `BattleBoardScreen` gains `setHeroImmobilized` (same signature as
    `UseBattleResult`'s) and forwards it per side, like `setHeroConfused`.
  - `page.tsx` passes `battle.setHeroImmobilized`.
- **Map: a read-only icon in `MapTeamStatusPanel`.** Per intent's Scope,
  it goes on the hero's token line under its name, after the Confuse icon,
  only while immobilized. Never on `MapToken` (intent's Out of Scope).
  - `.tokenLine` renders when `attackTokens > 0 || confused || immobilized`.
    The new span is the 13px `ImmobilizeIcon` alone, with
    `aria-label="Immobilized"` and `title="Immobilized"`. Its new
    `.immobilized` class sets `color: var(--color-immobilize)`, like
    `.confused`.
  - **No new height.** Spec 06 already budgets one token line per hero.
    Immobilize only adds ~19px of width on that line (6px gap + 13px icon),
    or shows the line for a hero with no other token, which is the same
    height. The 170px panel has room for all three entries. Check in the
    browser (Open Items).
  - Display only. `MapTeamStatusPanel` already gets `team`, so
    `BattleMapScreen` and `page.tsx` need no new props there.
  - It's inside the row element, so `.dimmed` covers it for a defeated
    hero.
- **Not shown** on `ResultsScreen`, `WinScreen`, `MapToken` or
  `RespawnAreaStrip`.

## UI Design Reference
No new artboard. The Immobilize toggle and its Map entry were added to two
existing artboards in the same Claude design artifact as intents 01-07
("BfbHelper — App Flow", versions 58-60):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK
- **"Battle Board"**: every hero card's token row has an Immobilize
  toggle after the Confuse toggle.
  - Off, it's a muted icon with no border, which turns ice blue on hover.
    On, it's an ice-blue pill (the Confuse toggle's lit shape,
    `--color-immobilize` `#8fb4e0`) with the icon alone.
  - One click toggles it. It has `aria-pressed`, a fixed label
    ("Immobilized on Kunoichi") and the tooltip "Immobilized".
  - The icon is a horizontal three-link chain: two face-on oval links
    joined by a flat, edge-on middle link, a 16px-viewBox stroke SVG like
    the swords and the "?". It replaced a lying standee (version 58) and
    two same-angle links that read as a paperclip (version 59).
  - Seeded with Boreas immobilized (at 0 HP, also holding a +1 Attack
    token and Confuse, so all three tokens sit on one row and it stays on
    defeat) and Kunoichi immobilized (no other tokens).
- **"Battle Map"**: in Player 1's status panel, Boreas's token line shows
  the ice-blue Immobilize icon after the swords count and the Confuse
  icon. Kunoichi, who had no token line, now gets one holding the
  Immobilize icon alone. Boreas's dimmed row dims it too. It's static and
  matches the Board's seeds.

This is a prototype for visual direction only, the same caveat as earlier
intents' references. It settles the ice-blue accent and the chain-link
icon. If a revised mockup supersedes these choices, it wins over what's
written here.

## Deployment
No change from v1-v7: same static Vercel deployment, no new infra.

## Open Items for Implementation
- ~~Add the Immobilize toggle to the "Battle Board" artboard and its icon
  to the "Battle Map" artboard's status panels (after Confuse in both),
  then rewrite UI Design Reference above to describe what's there.~~
  **Decided:** done (App Flow version 58). See UI Design Reference.
- ~~Pick `--color-immobilize`: an icy pale blue is the candidate, but it
  must read apart from `--color-p2` teal and the Confuse purple. Settle
  it in the mockup.~~
  **Decided:** ice blue `#8fb4e0` (App Flow version 58). It's lighter
  and bluer than `--color-p2` `#4f9aa0`. The BACKLOG's "Revisit every
  token's display" item reviews it again with the other tokens.
- ~~`ImmobilizeIcon` drawing: a standee lying on its side, or another
  sign.~~
  **Decided:** a three-link chain (App Flow version 60). Check it reads at
  12px on the Board and 13px on the Map.
- Check the Board at 1280x800 with a ×9 chip expanded next to lit Confuse
  and Immobilize toggles on every hero: the token row should stay one
  line (~133px of 144px on paper).
- Check the Map at 1280x800 with all eight heroes holding +1 Attack
  tokens, Confuse and Immobilize: every token line should stay one line
  in the 170px panel, and the page shouldn't scroll.
