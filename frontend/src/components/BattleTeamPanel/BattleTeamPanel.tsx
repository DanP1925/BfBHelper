import type { Hero, HeroId, PlayerId } from "../../lib/draft/types";
import {
  ARTIFACT_OWNER,
  BIT_STARTING_HP,
  TOWER_SLOTS,
  TOWER_STARTING_HP,
} from "../../lib/battle/constants";
import { canAffordLevelUp } from "../../lib/battle/levelUp";
import { createInitialHeroState } from "../../lib/battle/reducer";
import { teamLevel } from "../../lib/battle/selectors";
import { structureIcon, TOWER_LABEL } from "../../lib/battle/structureDisplay";
import type {
  ArtifactField,
  BattleTeamState,
  HeroBattleState,
  StructuresState,
} from "../../lib/battle/types";
import { BATTLE_TOKENS, type BattleTokenField } from "../battleTokens";
import { HeroCard, type HeroCardTokens } from "../HeroCard/HeroCard";
import { NumberStepper } from "../NumberStepper/NumberStepper";
import { StructureSlot } from "../StructureSlot/StructureSlot";
import styles from "./BattleTeamPanel.module.css";

type BattleTeamPanelProps = {
  label: string;
  side: PlayerId;
  /** Static roster data (name, class, token art) — not live battle values. */
  heroes: Hero[];
  /** Live gold/HP/level/structure values for this side. */
  team: BattleTeamState;
  onGoldChange: (value: number) => void;
  onHeroHpChange: (heroId: HeroId, value: number) => void;
  onHeroLevelChange: (heroId: HeroId, value: number) => void;
  /** A setter per token this side's heroes can take. The Board leaves out a
   * hero-specific token's field on the side its rule excludes (e.g. Death
   * Mark on Kunoichi's own team), which is what hides its control. */
  onHeroTokenChange: TeamTokenSetters;
  /** Flips one of Runika's Artifacts (intent/17). Only her card gets the
   * controls (ARTIFACT_OWNER). */
  onHeroArtifactChange: (heroId: HeroId, field: ArtifactField, faceUp: boolean) => void;
  onStructureHpChange: (slot: keyof StructuresState, value: number) => void;
  /** Which token chip or "+" picker on the Board is open, owned by
   * `BattleBoardScreen` so opening one in this panel closes any open in the
   * other (intent/06, intent/09). */
  openTokenKey: string | null;
  onOpenTokenKeyChange: (key: string | null) => void;
};

/** One setter per token field, given that field's stored value type. */
export type TeamTokenSetters = {
  [F in BattleTokenField]?: (heroId: HeroId, value: HeroBattleState[F]) => void;
};

/** A hero's token controls, built by one loop over BATTLE_TOKENS. A counted
 * chip's open key is `${side}:${heroId}:${field}`, so each chip on a hero
 * opens on its own (intents 06, 11). A `oneHolder` token (intent/15) gets
 * no control on a hero who doesn't hold it while a teammate does, so no
 * picker offers it until the holder taps it off. Checking this side is
 * enough: the Board only gives one side a hero-specific token's setter. */
function heroTokens(
  side: PlayerId,
  hero: Hero,
  heroState: HeroBattleState,
  teamHeroes: BattleTeamState["heroes"],
  setters: TeamTokenSetters,
  openTokenKey: string | null,
  onOpenTokenKeyChange: (key: string | null) => void,
): HeroCardTokens {
  const tokens: HeroCardTokens = {};
  for (const token of BATTLE_TOKENS) {
    if (token.kind === "counted") {
      const set = setters[token.field];
      if (!set) continue;
      const key = `${side}:${hero.id}:${token.field}`;
      tokens[token.field] = {
        count: heroState[token.field],
        onChange: (value) => set(hero.id, value),
        expanded: openTokenKey === key,
        onExpandedChange: (open) => onOpenTokenKeyChange(open ? key : null),
      };
    } else {
      const { field } = token;
      const set = setters[field];
      if (!set) continue;
      const on = heroState[field];
      if (token.oneHolder && !on && Object.values(teamHeroes).some((other) => other[field])) {
        continue;
      }
      tokens[field] = { on, onChange: (value) => set(hero.id, value) };
    }
  }
  return tokens;
}

export function BattleTeamPanel({
  label,
  side,
  heroes,
  team,
  onGoldChange,
  onHeroHpChange,
  onHeroLevelChange,
  onHeroTokenChange,
  onHeroArtifactChange,
  onStructureHpChange,
  openTokenKey,
  onOpenTokenKeyChange,
}: BattleTeamPanelProps) {
  const level = teamLevel(team);
  return (
    <div className={styles.panel}>
      <div className={styles.header} style={{ borderBottomColor: `var(--color-${side})` }}>
        <div className={styles.headerLabel}>{label}</div>
        <div className={styles.headerRight}>
          {/* Team level (intent/20): read-only, worked out from the hero
              levels below. Just "Lv": the header says whose it is. */}
          <div className={styles.levelBadge} role="img" aria-label={`${label} team level ${level}`}>
            <span className={styles.levelLabel}>Lv</span>
            <span className={styles.levelValue}>{level}</span>
          </div>
          <div className={styles.goldBadge}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
            <img src="/structures/gold.png" alt="" className={styles.goldIcon} />
            <NumberStepper
              value={team.gold}
              min={0}
              onChange={onGoldChange}
              label={`${label} gold`}
            />
          </div>
        </div>
      </div>

      <div className={styles.heroGrid}>
        {heroes.map((hero) => {
          // Falls back to a freshly-initialized stat block rather than
          // crashing if this hero's id is ever missing from `team.heroes`
          // — normally impossible (useBattle's heroIdSetsMatch enforces
          // it at hydrate time), but degrading gracefully beats a thrown
          // error if that invariant is ever violated post-hydration.
          const heroState = team.heroes[hero.id] ?? createInitialHeroState(hero);
          // The "+" picker shares the same one-open rule (intent/09).
          const pickerKey = `${side}:${hero.id}:picker`;
          return (
            <HeroCard
              key={hero.id}
              hero={hero}
              variant="battle"
              hp={heroState.hp}
              level={heroState.level}
              side={side}
              onHpChange={(value) => onHeroHpChange(hero.id, value)}
              onLevelChange={(value) => onHeroLevelChange(hero.id, value)}
              canAffordLevelUp={canAffordLevelUp(hero.id, team.gold, heroState.level)}
              respawnWindow={heroState.respawnWindow}
              tokenPicker={{
                expanded: openTokenKey === pickerKey,
                onExpandedChange: (open) => onOpenTokenKeyChange(open ? pickerKey : null),
              }}
              tokens={heroTokens(
                side,
                hero,
                heroState,
                team.heroes,
                onHeroTokenChange,
                openTokenKey,
                onOpenTokenKeyChange,
              )}
              // Runika's Artifacts (intent/17): her card is only rendered
              // while she's drafted, so the id check is the whole visibility
              // rule. No HP or position gate: they flip face-up on respawn.
              artifacts={
                hero.id === ARTIFACT_OWNER
                  ? {
                      faces: heroState,
                      onChange: (field, faceUp) => onHeroArtifactChange(hero.id, field, faceUp),
                    }
                  : undefined
              }
            />
          );
        })}
      </div>

      <div className={styles.structuresSection}>
        <div className={styles.sectionLabel}>Structures</div>
        <div className={styles.structuresGrid}>
          {TOWER_SLOTS.map((slot) => (
            <StructureSlot
              key={slot}
              label={TOWER_LABEL[slot]}
              teamLabel={label}
              hp={team.structures[slot]}
              icon={structureIcon("tower", side)}
              onHpChange={(value) => onStructureHpChange(slot, value)}
              max={TOWER_STARTING_HP}
              reactiveStyling
            />
          ))}
          <StructureSlot
            label="Bit"
            teamLabel={label}
            hp={team.structures.bit}
            icon={structureIcon("bit", side)}
            accent={`var(--color-${side})`}
            onHpChange={(value) => onStructureHpChange("bit", value)}
            max={BIT_STARTING_HP}
          />
        </div>
      </div>
    </div>
  );
}
