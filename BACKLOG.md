# Backlog

Ideas, feedback and bugs, tracked from triage until they ship. Each item
stays short (at most 3 sentences): the detail, open questions and research go
in its intent once it's scoped.

Each item carries a stage label, for the step it has reached:

- `Triage`: the item has been created. Every item starts here.
- `Intent`: its `intent/NN_*.md` exists, the what and the why.
- `Spec`: its `specs/NN_*.md` exists, the how.
- `Implement`: the PR with the code changes is open.
- `Verify`: the change needs manual verification before it counts as done.
- `Done`: the code is merged.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Triage
    Triage --> Intent
    Triage --> Spec: what and why known
    Triage --> Implement: how known too
    Intent --> Spec
    Spec --> Implement
    Implement --> Verify: risky change
    Implement --> Done
    Verify --> Done
    Done --> [*]: v2.0.0 released
```

A simple item can skip ahead: from `Triage` to `Spec` when the what and why are
already clear, or straight to `Implement` when the how is too. `Verify` is only
for changes risky enough to need it. `Done` items stay until v2.0.0 is
released, then they're removed: their docs and the git history keep the
record.

**v1.0.0** (reached 2026-10-18 with intent 18): a game can be played with only
the physical cards, every hero's needs met. The polish left over from it is
now part of Toward 2.0.

**v2.0.0 goal** (set 2026-10-26): players can play without needing the
rulebook beside them. v1 kept every rule manual (nothing expires, clears or
triggers on its own). v2 looks for the right balance between manual and
automatic: quality-of-life changes and automation where they cut down on human
error, manual control where it keeps the table in charge.

## Bugs

- `Done` **The wrong team's Tower disappeared on the Map.** Player 2's Tower
  was brought to 0 HP, but a Player 1 Tower seemed to disappear from the Map. The
  app had Player 1 on the red base, while the table plays Player 1 as blue.
- `Done` **Swap Player 1's and Player 2's colors.** Player 1 is now blue
  (top-left, forest) and Player 2 red (bottom-right, desert), on the Draft, Board,
  Map and structure icons. Fixed together with the Tower bug above (v1.0.1).

## Toward 2.0

- `Triage` **Show the current round number.** Show which round the game is in on the
  Board and the Map.
- `Triage` **Show the round each hero was defeated.** Mark a defeated hero with the
  round it fell, to get an idea of when it will respawn. Builds on the round
  number.
- `Triage` **Show the current phase.** Show the phase (Orders, Movement, Action,
  Cleanup) on the Board and the Map. One control steps through the phases,
  keeping round, phase and initiative in step.
- `Triage` **Add the HP bump on level-up automatically.** Per the rulebook, leveling
  up also raises the hero's HP by one. Today players add it by hand.
- `Triage` **Show token and Artifact rules in the app, not in a tooltip.** Runika's
  Artifact bonuses only show on hover, which is easy to miss. Show them, and
  what every token does, somewhere visible so nobody needs the rulebook.
- `Triage` **Merge the Battle Board and the Battle Map into one screen.** Players keep
  switching between them, since each shows half the game. At least keep the
  Map visible at all times.
- `Triage` **Review every token's display together.** Every token now exists, but
  each was designed on its own. Review the Board's token row and picker, colors
  and icons, the Map's status panel and Runika's Artifacts for one consistent
  look.
- `Triage` **A board-game, high-fantasy look.** The app doesn't feel like a board
  game or like Biternia's medieval world. Give every screen a theme that does.
- `Triage` **Hide an empty respawn area on the Map.** It takes room even when no
  hero is defeated. It still has to show at battle start and as a drop target
  while dragging.
- `Triage` **Move the gold-pile controls off the Map.** The gold-pile steppers take
  space under the board. Move them somewhere else so the board can grow.
- `Triage` **Auto-focus the Map's camera.** Have the camera move on its own to where
  the action is, instead of only by hand.
- `Triage` **Team level.** Show each team's level-ups taken (0 to 12) on the Board
  and the Map, to compare both teams at a glance.
- `Triage` **Defeat and destruction animations.** Animate a hero's defeat and a
  Tower's or Bit's destruction.
- `Triage` **Hero roles in the draft.** Give each hero a role, as in Dota or Heroes
  of the Storm, to sort the picker and plan a balanced team. The rulebook's
  hero "Type" (e.g. Mobile Tank) is one possible source.
- `Triage` **Coin-flip animation at draft start.** Show the initiative coin flip
  instead of just stating the result.
- `Triage` **Turn-passing animation in the draft.** Animate the turn banner and team
  highlight when the pick passes to the other player.
