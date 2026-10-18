# Plan 17: Runika's Artifacts

> **Living checklist.** This is the Build-phase plan for the feature scoped
> in [../intent/17_runika-artifacts.md](../intent/17_runika-artifacts.md)
> and [../specs/17_runika-artifacts.md](../specs/17_runika-artifacts.md).
> Check items off in the PR(s) that do the work, same convention as
> [16_ice-wall.md](16_ice-wall.md).

## Context

The intent and spec are merged (intent in PR #95, spec in PR #98, which
also made the pills icon-only and added each Artifact's bonus). The canvas
("BfbHelper — App Flow", version 88) has Runika in Player 1's fourth slot
on the "Battle Board" and "Battle Map" artboards:
- **Board:** three periwinkle `#7d9cf0` pills on her card between the
  level row and the token row, with Auto Deflector face-down (dashed,
  greyed).
- **Map:** the face-up Battle Fist and Shield Amulet icons at the end of
  her status line.
- **Tooltips:** each Artifact's name and bonus.

This plan turns them into a build checklist on top of the v0.16.1
codebase:
- `BattleState` schema 13;
- `battleReducer`'s `setHeroField`;
- `addHeroFieldsStep`;
- `ON_OFF_TOKEN_FIELDS`' `BooleanHeroField` check;
- `HeroCard`, `BattleTeamPanel`, `BattleBoardScreen` and
  `MapTeamStatusPanel`.

There's no new tooling and no new screen.

**No spec drift found.** Every path, type and function spec 17 names
exists as described on `main`. Schema 13 (intent 16's Ice Wall) is still
the latest, so 13 → 14 stands.

**Structure: one build PR**, like 15 and 16, after this plan ships as its
own `docs:` PR. It's one vertical slice: the three stored flags, one
action and one setter, Runika's artifact row and her Map icons, ending in
one minor bump (→ 0.17.0). Unlike 13 and 15, there's no refactor to land
first. The Artifacts get their own small path and leave the token types
alone.

**Parallel-safe split.** The data layer (M1-M9) touches `lib/` and must go
in order. The three icons, `ArtifactToggle` and `--color-artifact`
(M10-M12) import nothing from it, so they can be built side by side with
it. `components/artifacts.ts` and the wiring (M13-M17) need both.

## Architecture

```
frontend/src/
  app/globals.css               # += --color-artifact: #7d9cf0
  app/page.tsx                  # BattleBoardScreen += setHeroArtifact={battle.setHeroArtifact}
  lib/
    battle/types.ts             # HeroBattleState += battleFistFaceUp, autoDeflectorFaceUp,
                                #   shieldAmuletFaceUp; += ArtifactField; schemaVersion 14
    battle/constants.ts         # += ARTIFACT_OWNER = "runika", ARTIFACT_FIELDS
    battle/reducer.ts           # += SET_HERO_ARTIFACT; createInitialHeroState → all three true;
                                #   createInitialBattleState → schemaVersion 14
    persistence/schema.ts       # CURRENT_BATTLE_SCHEMA_VERSION = 14; += LegacyHeroBattleStateV13,
                                #   LegacyBattleTeamStateV13, PersistedBattleStateV14
    persistence/storage.ts      # += ARTIFACT_FIELDS validation loop; += upgradeV13ToV14
    useBattle.ts                # += setHeroArtifact(side, heroId, field, faceUp)
  components/
    artifacts.ts                # new: ArtifactLook, ARTIFACTS (name, bonus, Icon), artifactSummary
    ArtifactToggle/             # new: ArtifactToggle.tsx + .module.css (face-up lit,
                                #   face-down dashed + greyed), BattleFistIcon.tsx,
                                #   AutoDeflectorIcon.tsx, ShieldAmuletIcon.tsx
    HeroCard/                   # battle variant += artifacts?: HeroCardArtifacts →
                                #   .artifactRow between .levelRow and .tokenRow
    BattleTeamPanel/            # += onHeroArtifactChange; builds `artifacts` for ARTIFACT_OWNER only
    screens/BattleBoardScreen/  # += setHeroArtifact prop, bound per side
    MapTeamStatusPanel/         # Runika's token line += face-up Artifact icons after BATTLE_TOKENS
  test/heroState.ts             # NO_TOKENS += the three flags, true
frontend/e2e/
  runika-artifacts.spec.ts      # new
```

## Milestone Checklist

### Data & state layer

- [ ] M1. `lib/battle/types.ts`: `HeroBattleState` += `battleFistFaceUp`,
      `autoDeflectorFaceUp` and `shieldAmuletFaceUp: boolean` (one shared
      doc comment from the spec: `true` is face-up, every hero has them,
      only Runika's are read, never flipped on a hit, Rest, respawn or
      defeat). += `ArtifactField = (typeof ARTIFACT_FIELDS)[number]`.
      `BattleState.schemaVersion: 14`.
- [ ] M2. `lib/battle/constants.ts`: += `ARTIFACT_OWNER: HeroId =
      "runika"` and `ARTIFACT_FIELDS` (in Battle Fist, Auto Deflector,
      Shield Amulet order, `as const satisfies readonly
      BooleanHeroField[]`), next to `ON_OFF_TOKEN_FIELDS`, with the spec's
      doc comments.
- [ ] M3. `lib/battle/reducer.ts`: += `SET_HERO_ARTIFACT { side, heroId,
      field, faceUp }`, one `setHeroField(..., field, faceUp)` call, with
      a manual-only comment (no flip on a hit, Rest, respawn or defeat; no
      Runika check, since only the UI limits it).
      `createInitialHeroState` returns all three `true` (doc comment adds
      "Artifacts face-up"). `createInitialBattleState` writes
      `schemaVersion: 14`.
- [ ] M4. `lib/useBattle.ts`: += `setHeroArtifact(side, heroId, field,
      faceUp)`, a `useCallback` dispatching `SET_HERO_ARTIFACT`, in the
      `UseBattleResult` type with the spec's doc comment and in the returned
      object.
- [ ] M5. `lib/persistence/schema.ts`: `CURRENT_BATTLE_SCHEMA_VERSION =
      14`.
      - += `LegacyHeroBattleStateV13 = Omit<HeroBattleState,
        ArtifactField>`, and `LegacyHeroBattleStateV11` derives from it.
        The chain's comment says schemas 12 and 13 share a hero shape.
      - += `LegacyBattleTeamStateV13` (heroes: `LegacyHeroBattleStateV13`).
      - `PersistedBattleStateV12.p1/p2` use `LegacyBattleTeamStateV13`,
        which `V13` inherits. `V13`'s doc comment says it's only the
        source for `battleMigrations[13]`.
      - += `PersistedBattleStateV14`.
- [ ] M6. `lib/persistence/storage.ts`:
      - `hasValidBattleTeamShape` += a loop over `ARTIFACT_FIELDS`
        (boolean), and its doc comment adds "each Artifact a boolean".
      - += `upgradeV13ToV14 = addHeroFieldsStep<PersistedBattleStateV14>(14,
        { battleFistFaceUp: true, autoDeflectorFaceUp: true,
        shieldAmuletFaceUp: true })`, and `battleMigrations` += `13:
        upgradeV13ToV14`.
      - `saveBattleState`, `isValidPersistedBattleState` and the import
        use `PersistedBattleStateV14`.
- [ ] M7. `app/page.tsx`: `BattleBoardScreen` gets
      `setHeroArtifact={battle.setHeroArtifact}`.
      `screens/BattleBoardScreen`: += the `setHeroArtifact` prop, passed
      to each `BattleTeamPanel` as `onHeroArtifactChange={(heroId, field,
      faceUp) => setHeroArtifact(team.side, heroId, field, faceUp)}`. The
      Map gets no setter.
- [ ] M8. Fixtures:
      - `src/test/heroState.ts`'s `NO_TOKENS` gains the three flags as
        `true`, and its doc comment says the Artifacts are in there,
        face-up.
      - Every other hand-written `HeroBattleState` gets them too (`tsc`
        finds them).
      - `storage.test.ts`'s older-schema `withoutHeroFields` calls also
        strip the three fields.
- [ ] M9. Data-layer tests:
      - **reducer:** `SET_HERO_ARTIFACT` per field (face-down and back up,
        unknown-hero and same-value no-ops, works on a non-Runika hero);
        `SET_HERO_HP` to 0, `SET_HERO_POSITION` (out of the respawn area,
        into the Arena), the token actions, `PASS_INITIATIVE` and
        `SET_ICE_WALL` leave the flags alone; `createInitialHeroState` has
        all three `true`.
      - **storage:**
        - v14 round-trip;
        - v13→v14, v12→v14 … v1→v14 migrations (every hero all three
          `true`, everything else unchanged; on v13→v14, `iceWall`,
          Favored Enemy, the other tokens and an Arena position are
          kept);
        - rejects a missing or non-boolean Artifact flag;
        - accepts a face-down flag on a non-Runika hero (shape, not
          rules).
      - **`useBattle`:** `setHeroArtifact` updates and persists, and a
        reload keeps it.

### UI

- [ ] M10. `app/globals.css`: += `--color-artifact: #7d9cf0`, with a
      comment like `--color-favored-enemy`'s (the rulebook tokens' blue,
      as a periwinkle bluer and more saturated than `--color-immobilize`,
      bluer and darker than `--color-chill`).
- [ ] M11. `components/ArtifactToggle/BattleFistIcon.tsx`,
      `AutoDeflectorIcon.tsx`, `ShieldAmuletIcon.tsx` (new): the canvas's
      paths from spec 17's Open Items, a 16px viewBox with a 1.5
      `currentColor` stroke, `aria-hidden`, and a `size` prop (12px on
      the Board, 13px on the Map).
- [ ] M12. `components/ArtifactToggle/ArtifactToggle.tsx` + `.module.css`
      (new), with the spec's props (`faceUp`, `onChange`, `icon`,
      `summary`, `heroName`):
      - A `<button>` in `TokenToggle`'s 20px pill shape.
        `aria-pressed={faceUp}`,
        `aria-label={`${summary}, on ${heroName}`}`, and
        `title={`${summary} (face-up|face-down, tap to flip)`}`. A tap
        calls `onChange(!faceUp)`.
      - **Face-up:** a solid accent border, a 16% accent fill and an
        accent icon.
      - **Face-down:** a dashed `--color-button-border` outline, no fill,
        a `--color-muted` icon and 0.6 opacity, rising to 1 on hover.
      - The focus outline is in the accent. No transition under
        `prefers-reduced-motion`.
- [ ] M13. `components/artifacts.ts` (new): `ArtifactLook`, `ARTIFACTS`
      (field, name, bonus, Icon, in `ARTIFACT_FIELDS` order) and
      `artifactSummary`, with the spec's doc comments and bonus text
      ("+1 Attack", "+1 defense vs melee attacks", "+1 defense vs magic
      attacks").
- [ ] M14. `components/HeroCard/HeroCard.tsx` + `.module.css`:
      - The battle variant += `artifacts?: HeroCardArtifacts` (exported
        type, keyed by `ArtifactField`).
      - When it's passed, render `.artifactRow` between `.levelRow` and
        `.tokenRow`: a `role="group"` with
        `aria-label={`${hero.name}'s Artifacts`}`, holding one
        `ArtifactToggle` per `ARTIFACTS` entry with a 12px icon and
        `artifactSummary(artifact)`.
      - The row is flex, has a 4px gap and doesn't wrap.
      - The token row and picker are untouched.
- [ ] M15. `components/BattleTeamPanel/BattleTeamPanel.tsx`: +=
      `onHeroArtifactChange` prop. For `hero.id === ARTIFACT_OWNER` only,
      pass `artifacts` built from `heroState` (`faceUp:
      heroState[field]`, `onChange` → `onHeroArtifactChange(hero.id,
      field, faceUp)`). No HP or position gate.
- [ ] M16. `components/MapTeamStatusPanel/MapTeamStatusPanel.tsx`:
      - For `hero.id === ARTIFACT_OWNER`, the face-up `ARTIFACTS` render
        after the `BATTLE_TOKENS` icons, each as a `.token` span:
        - `--token-accent: var(--color-artifact)`;
        - a 13px icon;
        - `aria-label={artifactSummary(artifact)}`;
        - `title` = the same plus " (face-up)".
      - The token line renders when the hero holds a token **or** has a
        face-up Artifact. Update its comment to say so.
- [ ] M17. Check that `WinScreen`, `ResultsScreen`, `MapToken` and
      `RespawnAreaStrip` need no edit (the spec's claim), and note any
      that did.
- [ ] M18. Spec Open Item: does `--color-artifact` `#7d9cf0` read apart
      from Immobilize's ice blue and Chill's cyan on the same card, and
      from P2's teal, at 1280x800? Decide in the browser, and adjust it on
      the canvas and in the spec if not.
- [ ] M19. Spec Open Item: are the three icons legible at 12px on the
      Board and 13px on the Map, and told apart at a glance, face-down
      too? Simplify a path that muddies, and update the spec and canvas.
- [ ] M20. Spec Open Item: does the face-down look (dashed, muted, 0.6
      opacity) read as "greyed out" yet still findable as a tap target at
      1280x800? Decide in the browser, and update the spec.
- [ ] M21. Spec Open Item: the Board at 1280x800 with Runika in the
      heaviest case (an ally of Cyrus and an enemy of Kunoichi, Sedusa,
      Dazeem and Boreas):
      - She holds +1 Attack ×9, Confuse, Immobilize, Death Mark, Shield
        ×9, Stone ×3, Chill ×5 and Favored Enemy, plus the artifact row.
      - Her card stays at four lines below the level row at most, and the
        Board doesn't scroll, with any stepper open.
      - Her Map token line, with those tokens and three face-up
        Artifacts, fits the 170px panel.

      Decide in the browser, and update the spec.

### Tests & verification

- [ ] M22. Component and screen tests:
      - **`ArtifactToggle`:**
        - `aria-pressed` follows `faceUp`;
        - the label is fixed, with the name and bonus;
        - the tooltip says face-up or face-down;
        - a tap calls `onChange(!faceUp)`.
      - **`HeroCard`:**
        - no artifact row without `artifacts`;
        - with it, three pills in order inside the "Runika's Artifacts"
          group, outside the token row;
        - the picker never offers an Artifact.
      - **Board wiring (`page.test.tsx`):**
        - with Runika drafted on either team, only her card has the row;
        - without her, no card does;
        - tapping a pill flips it and persists;
        - it still works at 0 HP and in the respawn area.
      - **`BattleMapScreen`:**
        - an icon only for Runika's face-up Artifacts, after her tokens;
        - a face-down one isn't shown;
        - the token line is shown for a Runika with Artifacts and no
          tokens, and hidden when all three are face-down and she holds
          nothing;
        - no icons for a non-Runika hero even though their flags are
          `true`.
      - **`WinScreen`:** no artifact row on the cards.
- [ ] M23. `e2e/runika-artifacts.spec.ts` (new):
      - Draft Runika. Her card shows three face-up Artifacts, and no
        other card has any.
      - Flip Auto Deflector face-down. It's greyed and drops off her Map
        line after a Board⇄Map switch, and it's still face-down after a
        reload.
      - It stays face-down when her HP goes to 0 and when she's moved
        out of the respawn area.
      - Flip it back up, and it shows on the Map again.
- [ ] M24. `tsc --noEmit`, ESLint, and the full Vitest and Playwright
      suites are green.
- [ ] M25. Manual QA at 1280x800 (`/qa-screens`):
      - The artifact row is only on Runika's card, on either team, and the
        face-up and face-down looks read clearly (M18, M20). The focus
        outline is periwinkle.
      - The icons are readable at 12px and 13px (M19), and tooltips show
        the name, bonus and state.
      - Board and Map fit with Runika's heaviest card (M21).
      - The token row and "+" picker on her card behave as before, with
        no Artifact in the picker.
      - The Map's Artifact icons are dimmed for a defeated Runika.
      - Win Screen cards are unchanged.
      - An existing schema-13 battle upgrades in place with all three
        face-up, keeping its tokens, Arena positions and Ice Wall.
      - New Draft resets them.
- [ ] M26. Close out the intent:
      - `npm version minor --no-git-tag-version` (→ 0.17.0).
      - In `BACKLOG.md`, mark Artifacts done in Runika's entry and in the
        hero-specific table, linking intent 17 and v0.17.0, as intent 15
        did for Favored Enemy.
      - Note in the token-display review follow-up that it can start now.
      - Mark spec 17 **BUILT**.
