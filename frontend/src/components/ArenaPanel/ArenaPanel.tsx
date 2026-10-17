"use client";

import type { Hero, PlayerId } from "../../lib/draft/types";
import type { HeroDragPayload } from "../../lib/map/dragPayload";
import { useHeroDropTarget } from "../../lib/map/useHeroDropTarget";
import { MapToken } from "../MapToken/MapToken";
import styles from "./ArenaPanel.module.css";

type ArenaPanelProps = {
  /** Heroes whose position is the Arena, P1 first. At most 2 in play. */
  occupants: Array<{ hero: Hero; side: PlayerId }>;
  /** `canEnterArena`, bound to the current state. */
  canDrop: (payload: HeroDragPayload) => boolean;
  onDrop: (payload: HeroDragPayload) => void;
};

/**
 * The Arena (intent/14): Felix and one enemy, off the board's spaces. A
 * hero drop target like `RespawnAreaStrip`, which silently ignores a drop
 * `canDrop` refuses (Felix's allies, a second enemy). Its tokens drag back
 * out onto any space or respawn area through those targets' own handlers.
 */
export function ArenaPanel({ occupants, canDrop, onDrop }: ArenaPanelProps) {
  const { isDragOver, dropHandlers } = useHeroDropTarget(onDrop, canDrop);

  return (
    <section className={styles.arena} aria-label="The Arena" {...dropHandlers}>
      <div className={styles.label}>The Arena</div>
      <div className={isDragOver ? `${styles.box} ${styles.boxDragOver}` : styles.box}>
        {occupants.map(({ hero, side }) => (
          <MapToken key={hero.id} hero={hero} side={side} />
        ))}
      </div>
    </section>
  );
}
