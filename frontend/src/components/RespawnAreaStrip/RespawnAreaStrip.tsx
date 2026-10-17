"use client";

import type { Hero, HeroId, PlayerId } from "../../lib/draft/types";
import { useHeroDropTarget } from "../../lib/map/useHeroDropTarget";
import { MapToken } from "../MapToken/MapToken";
import styles from "./RespawnAreaStrip.module.css";

type RespawnAreaStripProps = {
  side: PlayerId;
  /** The team's name — used only for the section's accessible name; the
   * visible heading is always "Respawning Area" (the status panel right
   * above it already names the team). */
  label: string;
  /** This side's heroes whose `heroPositions` entry is `null`. */
  heroes: Hero[];
  onDrop: (heroId: HeroId) => void;
};

/**
 * One side's box of not-yet-deployed/defeated-and-awaiting-respawn
 * heroes, below that side's status panel. A native-HTML5-drag-and-drop target that
 * silently rejects a drop carrying the *other* side's payload — the
 * respawn area is never shared between teams. Its highlight can't tell
 * the two cases apart while hovering (see `useHeroDropTarget`).
 */
export function RespawnAreaStrip({ side, label, heroes, onDrop }: RespawnAreaStripProps) {
  const { isDragOver, dropHandlers } = useHeroDropTarget(
    (payload) => onDrop(payload.heroId),
    (payload) => payload.side === side,
  );

  // The whole section (heading included) is the drop target, so a drop
  // that lands on the heading still counts; only the dashed box itself
  // highlights.
  return (
    <section className={styles.area} aria-label={`${label} respawning area`} {...dropHandlers}>
      <div className={`${styles.label} ${side === "p1" ? styles.labelP1 : styles.labelP2}`}>
        Respawning Area
      </div>
      <div className={isDragOver ? `${styles.strip} ${styles.stripDragOver}` : styles.strip}>
        {heroes.map((hero) => (
          <MapToken key={hero.id} hero={hero} side={side} />
        ))}
      </div>
    </section>
  );
}
