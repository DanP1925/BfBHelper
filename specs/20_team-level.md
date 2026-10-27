# Spec 20: Team Level

> **DRAFT.** Architecture for intent 20's scope. Build-out has not started
> yet. See [../intent/20_team-level.md](../intent/20_team-level.md) for the
> product-level problem, scope, and behavior this spec exists to satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-19: React + TypeScript,
  Next.js, static build, no backend.
- **A derived number, not stored state** (intent's Scope: "Read-only,
  worked out from hero levels"). One pure selector adds up a team's
  level-ups from `BattleTeamState.heroes`. Nothing is written, so there's
  no reducer action, no `useBattle` mutator and no schema bump (intent's
  Constraints).
- **Each panel works it out itself.** `BattleTeamPanel` (Board) and
  `MapTeamStatusPanel` (Map) already receive their side's
  `team: BattleTeamState`, so each calls the selector on it. No new
  props, and no change to `page.tsx`, `BattleBoardScreen` or
  `BattleMapScreen`.
- **The Map's team header swaps gold for the team level** (intent's
  Scope: "On the Map, it replaces team gold"). `MapTeamStatusPanel` drops
  its read-only gold badge. It still receives `team`, which the hero and
  structure rows use.
- **What doesn't change:** `BattleState` and every persisted shape,
  `reducer.ts`, `useBattle`, `HeroCard` and its level stepper,
  `bounds.ts`, the Board's gold stepper, the Map's neutral gold piles
  (`GoldPilesBar` and the pile markers), `WinScreen`, `ResultsScreen`
  (intent's Out of Scope: "The Win screen"), the Map's hero rows
  (intent's Out of Scope: "Each hero's level on the Map") and the Draft
  screens.

## State Management
- **No new state.** The team level is recomputed on every render from
  the hero levels already in `BattleState`, so it can't drift from them.
- **Every level change updates it** (intent's Scope), whatever wrote the
  level: `setHeroLevel` from the Board's stepper, and the level-down undo
  from intent 19 once that's built. Nothing else needs to know about it.
- **Kept on reload, reset by a new draft** (intent's Session Lifecycle):
  it comes along with the hero levels it's computed from, so
  `useBattle`'s hydrate and `clearDraft()` need no change.

## Data Model
- No type changes. `HeroBattleState.level` (`types.ts`) is the input,
  already clamped to `HERO_STARTING_LEVEL` (1) through `HERO_MAX_LEVEL`
  (4) by `clampHeroLevel` (`bounds.ts`).
- **No schema change.** `CURRENT_BATTLE_SCHEMA_VERSION` stays as it is,
  and no migration or validation is added (intent's Constraints). Team
  gold is still stored and still edited on the Board: the Map only stops
  displaying it.

## Team Level Logic
In `frontend/src/lib/battle/selectors.ts`, pure and unit-tested in
`selectors.test.ts`, next to `heroSide` and `getBattleWinner`:

```ts
/** A team's level (intent/20): the level-ups its heroes have taken, 0 to
 * 12 (4 heroes, each from level 1 to 4). Defeated heroes count, since a
 * hero keeps their level. */
export function teamLevel(team: BattleTeamState): number {
  return Object.values(team.heroes).reduce(
    (sum, hero) => sum + (hero.level - HERO_STARTING_LEVEL),
    0,
  );
}
```

- **Level-ups, not the sum of levels** (intent's Scope). A fresh team is
  0, not 4.
- **No max constant.** The 12 is never shown (intent's Scope: "The
  maximum (12) isn't shown either"), so nothing in the app needs it. The
  test for a fully leveled team asserts 12 directly.
- **No HP or position check** (intent's Scope: "Defeated heroes still
  count"). A hero at 0 HP, in the respawn area or in the Arena adds their
  level-ups like any other.
- **Reads `team.heroes` as stored.** The panels fall back to
  `createInitialHeroState` for a missing hero, which is level 1 and adds
  0, so summing the stored entries gives the same answer.
- **No clamping.** Each `level` is already clamped, so the sum stays in
  0 to 12.
- **No comparison helper** (intent's Scope: "Just the two numbers").
  Nothing works out which team is ahead or by how much.
- `getBattleWinner`'s doc comment calls it "the one place battle state is
  read for a derived conclusion". Reword it to fit a second selector,
  without changing its behavior.
- **Tests:** a fresh team is 0, one hero at level 2 is 1, a team with a
  hero at level 3 and one at 4 is 5, every hero at level 4 is 12, and a
  hero at 0 HP still counts.

## Layout
Both badges sit in the team header, which is a single flex row on both
screens, so neither adds height. The Board panels and the Map's board
area stay exactly as tall as today at 1280x800.

- **Visible text is "Lv" and the number** (intent's Scope): no "Team",
  no "/12". Each badge's `aria-label` is
  `` `${label} team level ${value}` `` (e.g. "Player 1 team level 3"), so
  a screen reader still hears whose level it is and that it's the team's,
  which the header's position conveys visually.
- **Board, `BattleTeamPanel`:** a read-only pill to the left of the gold
  stepper. The header's right side becomes a small flex group (level,
  then gold, 8px gap), so `space-between` still pushes both right. The
  pill is styled like the gold pill (`--color-bg` fill, 1px
  `--color-border` border, fully rounded) with a small uppercase muted
  "Lv" label and the number in bold `--color-text`. New
  `.levelBadge`/`.levelLabel`/`.levelValue` classes in
  `BattleTeamPanel.module.css`.
- **Map, `MapTeamStatusPanel`:** the gold badge (`.goldBadge`,
  `.goldIcon` and the `gold.png` image) is removed, and the level takes
  its place on the right of the header: the same "Lv" label and bold
  number, unboxed, to match the panel's plain text. Those classes are
  swapped in `MapTeamStatusPanel.module.css`. The component's doc comment
  ("a quick HP/gold check") becomes an HP/level check.
- **One component or two small blocks?** The Board's version is a pill
  and the Map's is plain text, so they share only the label and the
  `aria-label`. Writing the markup inline in each panel is simpler than a
  shared component with a variant prop. Decide at build time (Open
  Items).
- **Not shown** on `WinScreen`, `ResultsScreen` or any Draft screen
  (intent's Out of Scope).

## UI Design Reference
On the same canvas as intents 01-19 ("BfbHelper — App Flow", version
97): https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

- **"Battle Board" artboard.** Each team header holds a pill to the left
  of the gold stepper: a muted 10px uppercase "LV" label beside the team
  level in 14px bold, on the `--color-bg` fill with a 1px
  `--color-border` border and a fully rounded edge, matching the gold
  pill's height. It's live there: changing any hero's level updates it.
  Player 1 shows 1 (Kunoichi is level 2) and Player 2 shows 0.
- **"Battle Map" and "Battle Map — Arena" artboards.** Each team status
  panel's header reads "Player 1" on the left and "LV 1" on the right: a
  muted 9px uppercase "LV" beside the number in 12px bold
  `--color-text`, no box. The gold coin and count are gone from that
  header (decided by the user 2026-10-28). The gold piles on the board
  and the gold bar below it are unchanged.
- **No maximum and no "Team"** in either place (decided by the user
  2026-10-28): the header already says whose it is.

This is a prototype for visual direction only, the same caveat as earlier
intents' references. If a revised canvas supersedes these choices, it
wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- ~~Draw the team level on the canvas's "Battle Board" and "Battle Map"
  artboards, then rewrite UI Design Reference.~~
  **Decided:** done (App Flow versions 95-97). "Lv" and the number, no
  maximum, and the Map's gold replaced. See UI Design Reference.
- ~~Check the Map header at 1280x800 stays on one line with label, level
  and gold.~~
  **Decided:** moot. The Map's gold is gone, so its header holds only
  the label and the level.
- Check the Board header at 1280x800 with "Player 2", a team level of
  12 and a three-digit gold total (gold has no ceiling): label, level
  pill and gold stepper should stay on one line.
- Shared `TeamLevel` component or inline markup in each panel (Layout).
