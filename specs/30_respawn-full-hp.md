# Spec 30: Respawn Full HP

> **BUILT.** Architecture for intent 30's scope, all built in one PR. See [../intent/30_respawn-full-hp.md](../intent/30_respawn-full-hp.md)
> for the product-level problem, scope, and behavior this spec exists to
> satisfy.

## Architecture Overview
- Same frontend-only architecture as intents 01-29: React + TypeScript,
  Next.js, static build, no backend.
- **The HP is composed into `useBattle`'s `setHeroPosition`,** the same
  way `setHeroHp` composes the defeat move and `setHeroLevel` composes the
  HP bump (specs 04, 19, 24). A move out of the respawn area of a hero at
  0 HP also dispatches `SET_HERO_HP` with their max HP, and
  `SET_HERO_RESPAWN_WINDOW` with `null`. `battleReducer` keeps one field
  per action.
- **One new pure helper in `lib/battle/levelUp.ts`,** `heroMaxHp`, next
  to `hpAfterLevelChange`, so "max HP is Base HP plus level" lives in one
  place. `createInitialHeroState` reuses it.
- **No new state, no schema change** (intent's Constraints). The HP set on
  respawn is ordinary hero HP.
- **What doesn't change:** the reducer's `SET_HERO_POSITION` (it still
  moves only the position), `setHeroHp` and its defeat move, the respawn
  window's estimate (spec 24), `setHeroLevel`, the Board's HP field, the
  Map's drag-and-drop targets, and every screen's layout. Dropping a hero
  back into the respawn area doesn't touch HP (intent's Out of Scope: no
  undo). Drop targets aren't limited to friendly Tower or Bit spaces
  (intent's Out of Scope).

## State Management
- **`setHeroPosition` (`frontend/src/lib/useBattle.ts`)** becomes:
  ```ts
  // Moving a hero at 0 HP out of the respawn area is a respawn
  // (intent/30): it also sets their HP to their max HP, which clears the
  // respawn window (intent/24), in the same update. A hero above 0 HP,
  // as at battle start, only moves.
  const setHeroPosition = useCallback((side: PlayerId, heroId: HeroId, spaceId: HeroPosition) => {
    setState((prev) => {
      if (prev === null) return prev;
      const afterMove = battleReducer(prev, { type: "SET_HERO_POSITION", side, heroId, spaceId });
      if (afterMove === prev) return prev;
      const hero = prev[side].heroes[heroId];
      const isRespawn = /* see below */;
      const drafted = heroesRef.current.find((candidate) => candidate.id === heroId);
      if (!isRespawn || drafted === undefined) return afterMove;
      const afterHp = battleReducer(afterMove, {
        type: "SET_HERO_HP",
        side,
        heroId,
        value: heroMaxHp(drafted, hero.level),
      });
      return battleReducer(afterHp, {
        type: "SET_HERO_RESPAWN_WINDOW",
        side,
        heroId,
        window: null,
      });
    });
  }, []);
  ```
  - **`isRespawn`** is a small local check: the hero's position in `prev`
    is `null` (the respawn area), the new `spaceId` is a Map space (not
    `null` and not `ARENA_POSITION`), and the hero's HP is 0. Per intent's
    Scope ("Only from 0 HP"), a hero above 0 keeps their HP: every hero at
    battle start, or one raised by hand.
  - **It dispatches the reducer's `SET_HERO_HP`, not `setHeroHp`,** like
    `setHeroLevel`. The new HP is always above 0, so `setHeroHp`'s defeat
    branch could never run anyway. The window is cleared here directly,
    the same way `setHeroHp` clears it when HP goes above 0.
  - **The Arena is never a respawn** (intent's Scope, decided
    2026-11-02). A 0-HP hero dropped from the respawn area into the Arena
    only moves, keeping 0 HP and their window. Felix or an enemy moving
    between the Arena and a Map space isn't a respawn either, since they
    aren't coming from the respawn area.
  - **A no-op move** (the same position) returns `prev` before the HP
    check, as today.
  - **The HP ceiling** comes from `SET_HERO_HP`'s existing `clampHeroHp`.
- **`UseBattleResult.setHeroPosition`'s doc comment** gains the respawn:
  "Moving a hero at 0 HP out of the respawn area also sets their HP to
  Base HP + level and clears their respawn window (intent/30)."
- **No wiring changes** in `page.tsx` or the screens:
  `BattleMapScreen` already calls `setHeroPosition` on every drop, and the
  new HP arrives with the `battleState` the Board and Map already get.

## Data Model
- **`frontend/src/lib/battle/levelUp.ts`:**
  ```ts
  /** A hero's maximum HP: their Base HP plus their current level
   * (rulebook p. 6, intent/30). Nothing else changes it. The flat
   * HERO_HP_CEILING is applied by the reducer's SET_HERO_HP. */
  export function heroMaxHp(hero: Hero, level: number): number {
    return hero.baseHp + level;
  }
  ```
- **`createInitialHeroState` (`lib/battle/reducer.ts`)** uses it:
  `hp: clampHeroHp(heroMaxHp(hero, HERO_STARTING_LEVEL))`. Same value as
  today's `hero.baseHp + HERO_STARTING_LEVEL`.
- **`useBattle`** reads the hero's `baseHp` from the heroes it was given
  (`p1Heroes`, `p2Heroes`), not from `data/heroes.ts`'s `getHeroById`, so
  a battle's own hero data wins and an unknown id is a no-op, not a throw.
  They're kept in a `heroesRef` updated by an effect, so `setHeroPosition`
  stays stable while callers pass fresh arrays every render.
  `HeroBattleState` doesn't carry `baseHp`, and doesn't need to.
- **No change** to `BattleState`, `HeroBattleState`, the reducer's
  actions or `persistence/schema.ts`. `CURRENT_BATTLE_SCHEMA_VERSION`
  stays as it is, so saved battles load unchanged (intent's Constraints).
- **The reducer's doc comment** that lists composed cases (next to the
  HP-from-level bump and the respawn window) gains intent 30: "So is the
  respawn HP (intent/30): useBattle.setHeroPosition sets it with
  SET_HERO_HP when a 0-HP hero leaves the respawn area."

## Respawn HP Logic
| HP before | From | To | Result |
|---|---|---|---|
| 0 | respawn area | Map space | moves; HP = Base HP + level; window cleared |
| 0 | respawn area | Arena | moves only (never a respawn) |
| above 0 | respawn area | Map space | moves only (battle start, HP raised by hand) |
| any | Map space or Arena | Map space or Arena | moves only |
| any | Map space or Arena | respawn area | moves only (no undo) |
| any | same position | same position | no-op |

Example from the intent's Proposed Outcome: Ceralin, Base HP 10, level 2,
at 0 HP in the respawn area, dragged onto the top Tower's space: HP 12,
window gone.

## Layout
- **No layout change.** The Map's drag and drop works as today. The
  Board's HP field and the Map's team panel already re-render from
  `battleState`, so both show the new HP, and the respawn window
  disappears from both (spec 24).
- **The Board's defeat animation** (spec 27) handles the change from 0 to
  above 0 as it already does: the gray look clears and the portrait is in
  color at once.
- **No cue** beyond the HP number changing.

## UI Design Reference
On the same canvas as intents 01-29 ("BfbHelper — App Flow"):
https://claude.ai/artifact/3ReGvV7g9bML75BULfWhsK

No artboard changes: nothing new is drawn. On "Battle Map", the respawn
area and the board spaces look the same. On "Battle Board", only the
hero's HP number changes, as it already does when typed in.

This is a prototype for visual direction only, the same caveat as earlier
intents' references. If a revised canvas supersedes these choices, it
wins over what's written here.

## Deployment
No change from earlier intents: same static Vercel deployment, no new
infra.

## Open Items for Implementation
- ~~Check existing tests that move a 0-HP hero out of the respawn area, in
  `useBattle.test.tsx` (the `setHeroPosition` cases near the respawn
  window block) and the e2e specs (`respawn-window.spec.ts`,
  `battle-map.spec.ts`, `arena.spec.ts`), for HP or window assertions
  the new HP breaks.~~ **Decided:** none did. They only move heroes above
  0 HP, and the full Vitest and Playwright runs stayed green.
- Tests:
  - `levelUp.test.ts`: `heroMaxHp` for a level-1 and a level-4 hero.
  - `useBattle.test.tsx`: a `setHeroPosition respawn (intent/30)` block:
    - a 0-HP hero moved from the respawn area to a Map space gets Base HP
      + level, loses their window, and it persists;
    - a 0-HP hero moved from the respawn area into the Arena keeps 0 HP
      and their window;
    - Felix moved from the Arena back onto a Map space keeps his HP;
    - a hero above 0 HP moved out of the respawn area keeps their HP;
    - a hero moved back into the respawn area keeps their HP;
    - a level-2 hero respawns with Base HP + 2 (the HP follows the level).
  - New `e2e/respawn-full-hp.spec.ts` (built; it also checks a reload):
    defeat a hero, drag them from the respawn area onto the board, and see
    their HP at Base HP + level on the Map and the Board, with no window.
