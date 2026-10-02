import type { Hero, HeroId, PlayerId } from "../../lib/draft/types";
import {
  BIT_STARTING_HP,
  HERO_STARTING_LEVEL,
  TOWER_SLOTS,
  TOWER_STARTING_HP,
} from "../../lib/battle/constants";
import type { BattleTeamState, StructuresState } from "../../lib/battle/types";
import { HeroCard } from "../HeroCard/HeroCard";
import { NumberStepper } from "../NumberStepper/NumberStepper";
import { StructureSlot } from "../StructureSlot/StructureSlot";
import styles from "./BattleTeamPanel.module.css";

/** Structure icon art comes in a red/blue pair per side — see specs/Battle Board/. */
const SIDE_ICON_SUFFIX: Record<PlayerId, string> = {
  p1: "red",
  p2: "blue",
};

function structureIcon(name: "tower" | "bit", side: PlayerId): string {
  return `/structures/${name}-${SIDE_ICON_SUFFIX[side]}.png`;
}

const TOWER_LABEL: Record<(typeof TOWER_SLOTS)[number], string> = {
  top: "Top",
  middle: "Middle",
  bottom: "Bottom",
};

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
  onStructureHpChange: (slot: keyof StructuresState, value: number) => void;
};

export function BattleTeamPanel({
  label,
  side,
  heroes,
  team,
  onGoldChange,
  onHeroHpChange,
  onHeroLevelChange,
  onStructureHpChange,
}: BattleTeamPanelProps) {
  return (
    <div className={styles.panel}>
      <div
        className={styles.header}
        style={{ borderBottomColor: `var(--color-${side})` }}
      >
        <div className={styles.headerLabel}>{label}</div>
        <div className={styles.goldBadge}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
          <img src="/structures/gold.png" alt="" className={styles.goldIcon} />
          <NumberStepper value={team.gold} min={0} onChange={onGoldChange} label={`${label} gold`} />
        </div>
      </div>

      <div className={styles.heroGrid}>
        {heroes.map((hero) => {
          // Falls back to a freshly-initialized stat block rather than
          // crashing if this hero's id is ever missing from `team.heroes`
          // — normally impossible (useBattle's heroIdSetsMatch enforces
          // it at hydrate time), but degrading gracefully beats a thrown
          // error if that invariant is ever violated post-hydration.
          const heroState = team.heroes[hero.id] ?? {
            hp: hero.baseHp,
            level: HERO_STARTING_LEVEL,
          };
          return (
            <HeroCard
              key={hero.id}
              hero={hero}
              variant="battle"
              hp={heroState.hp}
              level={heroState.level}
              onHpChange={(value) => onHeroHpChange(hero.id, value)}
              onLevelChange={(value) => onHeroLevelChange(hero.id, value)}
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
