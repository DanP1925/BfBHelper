import type { Hero, HeroId, PlayerId } from "../../lib/draft/types";
import { BIT_STARTING_HP, TOWER_SLOTS, TOWER_STARTING_HP } from "../../lib/battle/constants";
import { createInitialHeroState } from "../../lib/battle/reducer";
import { structureIcon, TOWER_LABEL } from "../../lib/battle/structureDisplay";
import type { BattleTeamState, StructuresState } from "../../lib/battle/types";
import { HeroCard } from "../HeroCard/HeroCard";
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
  onHeroAttackTokensChange: (heroId: HeroId, value: number) => void;
  onHeroConfusedChange: (heroId: HeroId, value: boolean) => void;
  onHeroImmobilizedChange: (heroId: HeroId, value: boolean) => void;
  onStructureHpChange: (slot: keyof StructuresState, value: number) => void;
  /** Which token chip or "+" picker on the Board is open, owned by
   * `BattleBoardScreen` so opening one in this panel closes any open in the
   * other (intent/06, intent/09). */
  openTokenKey: string | null;
  onOpenTokenKeyChange: (key: string | null) => void;
};

export function BattleTeamPanel({
  label,
  side,
  heroes,
  team,
  onGoldChange,
  onHeroHpChange,
  onHeroLevelChange,
  onHeroAttackTokensChange,
  onHeroConfusedChange,
  onHeroImmobilizedChange,
  onStructureHpChange,
  openTokenKey,
  onOpenTokenKeyChange,
}: BattleTeamPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header} style={{ borderBottomColor: `var(--color-${side})` }}>
        <div className={styles.headerLabel}>{label}</div>
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

      <div className={styles.heroGrid}>
        {heroes.map((hero) => {
          // Falls back to a freshly-initialized stat block rather than
          // crashing if this hero's id is ever missing from `team.heroes`
          // — normally impossible (useBattle's heroIdSetsMatch enforces
          // it at hydrate time), but degrading gracefully beats a thrown
          // error if that invariant is ever violated post-hydration.
          const heroState = team.heroes[hero.id] ?? createInitialHeroState(hero);
          // Per token type, so later tokens on the same hero get their own key.
          const attackTokenKey = `${side}:${hero.id}:attack`;
          // The "+" picker shares the same one-open rule (intent/09).
          const pickerKey = `${side}:${hero.id}:picker`;
          return (
            <HeroCard
              key={hero.id}
              hero={hero}
              variant="battle"
              hp={heroState.hp}
              level={heroState.level}
              onHpChange={(value) => onHeroHpChange(hero.id, value)}
              onLevelChange={(value) => onHeroLevelChange(hero.id, value)}
              tokenPicker={{
                expanded: openTokenKey === pickerKey,
                onExpandedChange: (open) => onOpenTokenKeyChange(open ? pickerKey : null),
              }}
              attackTokens={{
                count: heroState.attackTokens,
                onChange: (value) => onHeroAttackTokensChange(hero.id, value),
                expanded: openTokenKey === attackTokenKey,
                onExpandedChange: (open) => onOpenTokenKeyChange(open ? attackTokenKey : null),
              }}
              confused={{
                on: heroState.confused,
                onChange: (value) => onHeroConfusedChange(hero.id, value),
              }}
              immobilized={{
                on: heroState.immobilized,
                onChange: (value) => onHeroImmobilizedChange(hero.id, value),
              }}
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
