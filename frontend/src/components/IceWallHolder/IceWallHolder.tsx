"use client";

import { isIceWallDrag } from "../../lib/map/dragPayload";
import { useMarkerDropTarget } from "../../lib/map/useMarkerDropTarget";
import { IceWallMarker } from "../IceWallMarker/IceWallMarker";
import styles from "./IceWallHolder.module.css";

type IceWallHolderProps = {
  /** True while the wall is off the board (`iceWall === null`): the
   * marker is drawn inside. */
  holdsWall: boolean;
  /** The wall was dropped here: send it back to the holder. */
  onDrop: () => void;
};

/**
 * Where Dazeem's Ice Wall (intent/16) starts and returns to, under the
 * respawn area in his team's column. Styled like `RespawnAreaStrip`, with
 * a frost-cyan bar and dashed box. Only the wall drops here; hero drags
 * pass through (`useMarkerDropTarget`).
 */
export function IceWallHolder({ holdsWall, onDrop }: IceWallHolderProps) {
  const { isDragOver, dropHandlers } = useMarkerDropTarget(isIceWallDrag, onDrop);

  return (
    <section className={styles.holder} aria-label="Ice Wall" {...dropHandlers}>
      <div className={styles.label}>Ice Wall</div>
      <div className={isDragOver ? `${styles.box} ${styles.boxDragOver}` : styles.box}>
        {holdsWall && <IceWallMarker />}
      </div>
    </section>
  );
}
