# Intent: BfbHelper (v10 — Draft Pick Animation)

## Problem
Picking a hero in the draft has no motion. Tapping a card in the pool
removes it from the grid instantly and it appears in a team slot at the
same moment, while the rest of the pool jumps to fill the gap. On a
shared screen, the players who didn't tap have to work out which hero
just went where. The end of the draft is just as flat: the 8th pick
switches straight to the Draft Results screen, with nothing to mark that the
two teams are now set and about to fight.

(v1 = Hero Draft Picker, intent 01. v2 = Battle Board, intent 02. v3 =
Battle Controls, intent 03. v4 = Battle Map, intent 04. v5 = Initiative
Indicator, intent 05. v6 = +1 Attack Tokens, intent 06. v7 = Confuse
Tokens, intent 07. v8 = Immobilize, intent 08. v9 = Death Mark and token
row, intent 09.)

## Scope for v10
This phase covers only two moments, both in the draft:
- **The pick, on the Draft Board.** When a hero is tapped in the pool:
  - **The picked card fades out of the pool** where it was. Nothing
    travels between the pool and the team panel (decided 2026-10-16,
    replacing an earlier pool-to-slot flight).
  - **The rest of the pool then slides** into the gap instead of
    jumping, including when the remaining cards change size as the pool
    shrinks.
  - **The hero reappears in its slot** in the current player's team
    panel, fading in with a brief flash in that team's color (Player 1
    teal, Player 2 red, since the 2026-10-28 color swap). The flash is what shows everyone which side got
    the hero.
- **The versus finale, on the Draft Results screen.** After the 8th
  hero appears in its slot, the Draft Results screen's entrance is the "teams about to
  fight" moment: each team sweeps in from its own side, a "VS" lands
  between them, and then "Start Battle" appears. There's no separate
  splash screen; the Draft Results screen itself animates in. (It was
  called the Results screen until 2026-10-15.)
  - **The "VS" stays.** It becomes a permanent part of the Draft
    Results screen, between the two teams, so the finished screen looks
    the same whether or not the entrance played (decided 2026-10-15).
  - **"Start Battle" is its only button.** The "← New Draft" button is
    removed (decided 2026-10-15), so the screen leads only into the
    fight. A new draft can still be started from the Battle Board's and
    Battle Map's menus.
  - **It plays only right after the final pick.** Reloading on the
    Draft Results screen shows the finished screen, "VS" included, with
    no animation.
  - **Tapping anywhere skips it**, jumping straight to the finished
    Draft Results screen with "Start Battle" shown.
- **Animations never block input.** The pick is saved the instant it's
  tapped, as it is today, and the animation is cosmetic. Players can tap
  the next hero right away. Fast taps may overlap animations or cut them
  short, and a reload mid-animation loses nothing.
- **Reduced motion is respected.** With the OS "reduce motion" setting
  on, neither moment animates: picks behave exactly as they do today,
  and the Draft Results screen appears already finished, "VS" included. This
  matches the token chip's existing behavior.
- The exact motion (path, speed, easing, styling) and the versus layout
  are settled in the spec/design.

## Proposed Outcome
A player taps a hero. It fades out of the pool, the pool closes up behind
it, and the hero flashes into that team's panel in the team's color.
After the last pick, the two
finished teams sweep in facing each other with a "VS" between them, and
"Start Battle" appears. The draft feels like it builds up to the fight,
without ever making anyone wait.

## Users
Same as intents 01-09: players of Battle for Biternia using the app
alongside the physical cards, sharing one screen during the draft.

## Affected Systems
- **Draft Board.** The `HeroPool` grid and the `TeamPanel` slots
  animate a pick. The draft state and its pick logic don't change.
- **Draft Results screen.** Gains a permanent "VS" between the teams
  and the versus entrance, played only when it's reached from the final
  pick. Loses its "← New Draft" button.

## Constraints
- React + TypeScript frontend, consistent with intents 01-09. No backend.
- Must work on the 13.3" laptop (1280x800 CSS px), where the Draft Board
  already fits the pool and both team panels to the viewport.
- No change to persisted draft or battle state. The animation is
  presentation only.

## Out of Scope (deferred to later phases)
- **A coin-flip animation** at draft start. Tracked in `BACKLOG.md`.
- **A turn-passing animation** (the banner and team panel highlight
  switching players). Tracked in `BACKLOG.md`.
- **A card travelling from the pool to its slot.** Tried on the canvas
  and dropped on 2026-10-16 in favor of fading out and reappearing.
- **Battle-screen animations** (Board, Map, Win Screen).
- **Replaying the versus entrance** on reload or on any later visit to
  the Draft Results screen.
- **3-4 player variant**, deferred along with intents 01-09.

## Session Lifecycle
- Animations hold no state. A pick is persisted the moment it's tapped,
  so a reload mid-animation resumes the draft with that pick made.
- The versus entrance plays once, right after the 8th pick. Reloading
  on the Draft Results screen shows it without animation.
