"use client";

import { isBearTrapDrag } from "../../lib/map/dragPayload";
import { useMarkerDropTarget } from "../../lib/map/useMarkerDropTarget";
import { BearTrapMarker } from "../BearTrapMarker/BearTrapMarker";
import styles from "./BearTrapHolder.module.css";

type BearTrapHolderProps = {
  /** True while the trap is off the board (`bearTrap === null`): the
   * marker is drawn inside. */
  holdsTrap: boolean;
  /** The trap was dropped here: send it back to the holder. */
  onDrop: () => void;
};

/**
 * Where Boreas's Bear Trap (intent/18) starts and returns to, in the
 * margin outside his team's column. Styled like `RespawnAreaStrip`, with an
 * emerald bar and dashed box. Only the trap drops here; hero and Ice Wall
 * drags pass through (`useMarkerDropTarget`).
 */
export function BearTrapHolder({ holdsTrap, onDrop }: BearTrapHolderProps) {
  const { isDragOver, dropHandlers } = useMarkerDropTarget(isBearTrapDrag, onDrop);

  return (
    <section className={styles.holder} aria-label="Bear Trap" {...dropHandlers}>
      <div className={styles.label}>Bear Trap</div>
      <div className={isDragOver ? `${styles.box} ${styles.boxDragOver}` : styles.box}>
        {holdsTrap && <BearTrapMarker />}
      </div>
    </section>
  );
}
