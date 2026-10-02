import type { Hero, PlayerId } from "../../lib/draft/types";
import {
  BIT_STARTING_HP,
  HERO_STARTING_LEVEL,
  TOWER_SLOTS,
  TOWER_STARTING_HP,
} from "../../lib/battle/constants";
import { HeroCard } from "../HeroCard/HeroCard";
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
  heroes: Hero[];
  gold: number;
};

export function BattleTeamPanel({ label, side, heroes, gold }: BattleTeamPanelProps) {
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
          <span className={styles.goldText}>{gold} Gold</span>
        </div>
      </div>

      <div className={styles.heroGrid}>
        {heroes.map((hero) => (
          <HeroCard key={hero.id} hero={hero} variant="battle" level={HERO_STARTING_LEVEL} />
        ))}
      </div>

      <div className={styles.structuresSection}>
        <div className={styles.sectionLabel}>Structures</div>
        <div className={styles.structuresGrid}>
          {TOWER_SLOTS.map((slot) => (
            <StructureSlot
              key={slot}
              label={TOWER_LABEL[slot]}
              hp={TOWER_STARTING_HP}
              icon={structureIcon("tower", side)}
            />
          ))}
          <StructureSlot
            label="Bit"
            hp={BIT_STARTING_HP}
            icon={structureIcon("bit", side)}
            accent={`var(--color-${side})`}
          />
        </div>
      </div>
    </div>
  );
}
