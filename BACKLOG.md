# Backlog

Untriaged ideas and feedback not yet scoped into an `intent/` doc. When an item
is picked up, link the intent/PR that covers it and check it off.

Completing everything in this backlog = **v1.0.0**.

## From playtest 2026-10-10

First full physical game played alongside the app, at `79d851b` (intent 04 —
Battle Map merged). Paused mid-game; everything not listed below worked smoothly.

Teams: Caligar, Vladiator, Sterling, Ceralin vs Cynthia, Motley, Agatha Trunch,
Ken Obi.

- [ ] **Keep Map zoom/pan when switching tabs.** Switching Board → Map resets
  zoom to 100% and un-pans, because zoom/pan is local state in
  `BattleMapScreen` and the screen unmounts on a view toggle. Lift that state
  into `page.tsx`. Resetting on page reload is fine — no persistence needed.
  *Size: small polish PR, no new intent.*
- [ ] **Initiative indicator + passing it each round.** Neither the Battle
  Board nor the Battle Map shows who has initiative; it's only shown on the
  Draft Board (`draft.initiative`, decided by the pre-draft coin flip).
  Initiative flips every round — the player without it gets it — so both
  screens need a display plus a "next round" control to pass it. Possibly a
  round counter too. *Size: small intent (05).*
- [ ] **Bug: heroes start 1 HP short.** `lib/battle/reducer.ts` starts each
  hero at `baseHp`, but the rulebook ("Prepare the Hero Mats", step 3) sets
  starting HP to base HP + level (1), e.g. Vladiator starts at 11, not 10.
  Fix only the starting HP. Keep the flat 15 HP ceiling and the manual HP
  bump on level-up as they are (decided 2026-10-10). *Size: small fix PR.*
- [ ] **+1 Attack tokens.** Not tracked anywhere; needed even by the heroes
  played in this game (e.g. Caligar's power card gives two). Per the rulebook,
  each token adds 1 to all of that hero's attacks; they're removed at the end
  of the hero's next activation or when it's stunned, and stay if the hero who
  placed them is defeated. Needs per-hero counts (2+), on allies too.
- [ ] **Confuse tokens.** Not tracked anywhere; needed even by the heroes
  played in this game. Per the rulebook, in the next round's Orders Phase a
  confused hero is assigned the top action-deck card instead of one from the
  hand, then the token is removed. It doesn't affect activation in the round
  it's applied, and stays if the hero who placed it is defeated.
- [ ] **Immobilize status.** General (not hero-specific). Per the rulebook,
  an immobilized hero's standee is laid on its side; the next time it would
  move, it stands back up instead of moving. In the app: an on/off toggle per
  hero, shown on the Board and the Map (e.g. token tilted or greyed), cleared
  by hand.

## Hero playability review

What each hero needs for a game played with only the cards. Token rules are
in the +1 Attack and Confuse items above. Other heroes need further
hero-specific features, listed per hero below.

**Visibility rule (decided 2026-10-10):** hero-specific tokens and statuses
(e.g. Boreas's Favored Enemy and Bear Trap) are only shown and interactive
when the hero who uses them is in the battle, on either team.

- **Caligar (Cleric):** *Healing Word* is manual HP edits, so nothing new is
  needed. One power card gives a target hero in Caligar's space two +1 Attack
  tokens, so tokens need per-hero counts (2+) and can go on allies.
- **Vladiator (Barbarian):** *Rage* (+1 melee Attack per 4 HP below max) is
  worked out by the player, with no app display. Needs nothing beyond the
  starting-HP fix above.
- **Sterling (Archer):** *Deadly Aim* (melee attacks on Basic cards gain Ranged
  if Sterling didn't move this round) is remembered at the table, with no app
  tracking. No power cards place tokens. Needs nothing.
- **Ceralin (Fighter):** *Heavy Armor* (+1 defense vs melee attacks) is a
  static passive applied at the table. No power cards place tokens. Needs
  nothing.
- **Cynthia (Fire Mage):** *Fan the Flames* gives Cynthia three +1 Attack
  tokens on Rest. One tap per token is fine for adding them (decided
  2026-10-10). Power cards only use +1 Attack tokens. Needs +1 Attack tokens.
- **Motley (Monk):** *Lightning Reflexes* (Parry cards gain Interrupt) is
  resolved with the physical cards. No power cards place tokens. Needs nothing.
- **Agatha Trunch (Minotaur):** *Momentum* (+1 melee Attack per move until the
  end of the round) is tracked in the player's head. It isn't modeled as +1
  Attack tokens, which expire differently and apply to all attacks. One power
  card confuses. Needs Confuse tokens.
- **Ken Obi (Apprentice):** *Become the Master* (level-up costs 1 less gold;
  +1 Attack at level 4) is handled by the player, since the app doesn't charge
  gold for leveling and already shows the level. No power cards place tokens.
  Needs nothing.
- **Baldwin (Bard):** *Spoony Bard* gives each other friendly hero in Baldwin's
  space a +1 Attack token after a Bard power, which is one tap per hero (no
  group shortcut). Power cards also use Confuse. Needs +1 Attack and Confuse
  tokens.
- **Boreas (Hunter):** *Favored Enemy* is a simple marker: pick one enemy hero
  once, and it shows a Favored Enemy badge on the Board and the Map for the
  rest of the game. It's never removed, even on defeat (rulebook exception).
  No battle-start prompt. Power cards also use Immobilize (general, see above)
  and the Bear Trap token: a single token placed on a map space; when an enemy
  hero triggers it, that hero is immobilized and the trap is discarded (also
  discarded if Boreas is defeated, per the rulebook). In the app: a Bear Trap
  marker that can be placed on a map space and removed. Needs a Favored Enemy
  marker and a Bear Trap (hero-specific), plus Immobilize.
- **Cyrus (Paladin):** *Holy Aura* gives Shield 1 to another friendly hero in
  Cyrus's space after a Paladin power; power cards give more Shield. Shield
  tokens are hero-specific (only shown when Cyrus is in the battle), counted
  per hero, one tap per token. Per the rulebook, each shield absorbs 1 damage
  after defense and stays if the hero who placed it is defeated. Shields are
  removed by hand when damage comes in, with no automatic damage handling.
  Needs Shield tokens (hero-specific).
- **Dazeem (Ice Mage):** *Winter's Chill* gives an enemy hit by Dazeem a -1
  Attack Chill token. All Chill tokens are removed at the end of that hero's
  action. Chill tokens are hero-specific, counted per hero, added and removed
  one tap per token (no "clear all"). Power cards give more Chill, use
  Immobilize (general), and place the Ice Wall token on a map space, handled
  like Boreas's Bear Trap (a marker placed on a space and removed). Needs Chill
  tokens and an Ice Wall marker (hero-specific), plus Immobilize.
- **Dolgolae (Yomp):** *Square Meal* (+2 Attack vs enemies at full HP) is
  checked at the table: current HP and level are in the app, base HP is on the
  card. No "full HP" indicator for now. Power cards confuse and gain +1 Attack
  tokens. Needs +1 Attack and Confuse tokens.
- **Felix (Duelist):** *En Garde* (+1 Attack while no other friendly hero is in
  Felix's space) is visible from the Map's grouping, so nothing is needed. One
  power card sends Felix and one **enemy** hero to the "To the Pain" Arena: a
  single isolated space, off the main board graph, where only those two can
  interact. It ends when one of them is defeated: the defeated hero goes
  through the normal defeat/respawn flow, and the survivor returns to their
  own Bit. In the app: a hero-specific Arena panel beside the board (like the
  respawn areas) holding at most Felix + one enemy, with heroes dragged in and
  out by hand. No tokens on Felix's cards. Needs the Arena space
  (hero-specific).
- **Kerrick (Wizard):** *Spellbook* (swap the assigned action card with a
  Wizard power card from hand before revealing it) is handled with the
  physical cards. One power card confuses. Needs Confuse tokens.
- **Kunoichi (Assassin):** *Know Your Enemy* gives each unmarked enemy in
  Kunoichi's space a Death Mark at the end of each Action Phase; Kunoichi gets
  +2 Attack against marked enemies. Death Mark is hero-specific and on/off per
  hero (at most one), applied and cleared by hand, including when the marked
  hero is defeated (rulebook discards it on defeat). No other tokens on
  Kunoichi's cards. Needs Death Mark (hero-specific).
- **Longshanks (Pirate):** *Pirate Booty* (pay 1 gold for +1 Attack this
  action) uses the existing team gold stepper. Power cards stun, immobilize,
  and confuse. Stun (discard the hero's assigned action cards) is resolved
  with the physical cards, so nothing is tracked. Per the rulebook it also
  removes that hero's +1 Attack tokens, which the player does by hand. Needs
  Immobilize and Confuse.
- **Runika (Artificer):** *Master Armiger* gives Runika three Artifacts
  (Battle Fist, Auto Deflector, Shield Amulet), starting face-up. When an enemy
  hits Runika, one is flipped face-down. All three flip face-up when Runika
  Rests or respawns. Face-up Artifacts make Runika's attacks stronger. In the
  app: three named on/off toggles on Runika's Board card (face-down greyed
  out), flipped by hand. Text or simple icons for now, since there's no
  Artifact art in the repo. No tokens on Runika's cards. Needs Artifact
  toggles (hero-specific).
- **Sedusa (Gorgon):** *Stony Glare* gives a target enemy in Sedusa's space a
  Stone token at the end of each Action Phase; a hero with 3+ Stone is
  immediately defeated. Stone is hero-specific, counted per hero, one tap per
  token. Defeat at 3 Stone is applied by hand (no warning, no auto-defeat), and
  Stone is cleared by hand on defeat. Power cards place more Stone and
  immobilize. Needs Stone tokens (hero-specific) and Immobilize.

### Summary

General (always available):

| Feature | Kind | Used by |
|---|---|---|
| +1 Attack | count per hero | Caligar, Cynthia, Baldwin, Dolgolae |
| Confuse | per hero | Agatha Trunch, Baldwin, Dolgolae, Kerrick, Longshanks |
| Immobilize | on/off per hero | Boreas, Dazeem, Longshanks, Sedusa |

Hero-specific (only when that hero is in the battle):

| Feature | Kind | Hero |
|---|---|---|
| Favored Enemy | one permanent marker on an enemy | Boreas |
| Bear Trap | single marker on a map space | Boreas |
| Shield | count per hero | Cyrus |
| Chill | count per hero | Dazeem |
| Ice Wall | single marker on a map space | Dazeem |
| "To the Pain" Arena | isolated space for Felix + one enemy | Felix |
| Death Mark | on/off per hero | Kunoichi |
| Artifacts (x3) | named on/off toggles on Runika | Runika |
| Stone | count per hero | Sedusa |

Need nothing beyond the starting-HP fix: Vladiator, Sterling, Ceralin, Motley,
Ken Obi.

All tokens are added and removed one tap at a time, by hand. The app doesn't
apply any rule automatically (expiry, defeat, damage absorption).
