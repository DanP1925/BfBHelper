import type { Hero, PlayerId } from "../../lib/draft/types";
import { TOWER_LABEL } from "../../lib/battle/structureDisplay";
import type { BattleTeamState } from "../../lib/battle/types";
import styles from "./MapTeamStatusPanel.module.css";

type MapTeamStatusPanelProps = {
  label: string;
  side: PlayerId;
  heroes: Hero[];
  team: BattleTeamState;
};

/**
 * Read-only glance-level summary sitting above a side's `RespawnAreaStrip`
 * — so a quick HP/gold check doesn't always need a trip to the Battle
 * Board. No props beyond what `BattleMapScreen` already receives; purely
 * a rendering addition, no new data plumbing. Both Heroes and Structures
 * get the same small bespoke row (name/label + HP, dimmed at 0) — per
 * the mockup, a structure's row is just text, no icon (unlike the Battle
 * Board's `StructureSlot`, which this panel deliberately doesn't reuse).
 */
export function MapTeamStatusPanel({ label, side, heroes, team }: MapTeamStatusPanelProps) {
  const structureRows = [
    { label: TOWER_LABEL.top, hp: team.structures.top },
    { label: TOWER_LABEL.middle, hp: team.structures.middle },
    { label: TOWER_LABEL.bottom, hp: team.structures.bottom },
    { label: "Bit", hp: team.structures.bit },
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.header} style={{ borderBottomColor: `var(--color-${side})` }}>
        <div className={styles.headerLabel}>{label}</div>
        <div className={styles.goldBadge}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
          <img src="/structures/gold.png" alt="" className={styles.goldIcon} draggable={false} />
          <span>{team.gold}</span>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Heroes</div>
        {heroes.map((hero) => {
          const hp = team.heroes[hero.id]?.hp ?? hero.baseHp;
          const isDefeated = hp === 0;
          return (
            <div
              key={hero.id}
              className={isDefeated ? `${styles.heroRow} ${styles.dimmed}` : styles.heroRow}
            >
              <span className={styles.heroName}>{hero.name}</span>
              <span className={styles.heroHp}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--color-hp)" aria-hidden="true">
                  <path d="M12 21s-6.716-4.35-9.428-8.106C.414 9.967 1.5 6 5.1 6c2.1 0 3.6 1.2 4.5 2.7C10.5 7.2 12 6 14.1 6c3.6 0 4.686 3.967 2.528 6.894C18.716 16.65 12 21 12 21z" />
                </svg>
                {hp}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Structures</div>
        {structureRows.map((structure) => {
          const isDestroyed = structure.hp === 0;
          return (
            <div
              key={structure.label}
              className={isDestroyed ? `${styles.structRow} ${styles.dimmed}` : styles.structRow}
            >
              <span className={styles.structLabel}>{structure.label}</span>
              <span className={styles.structHp}>{structure.hp} HP</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
