"use client";

import type { CSSProperties, DragEvent } from "react";
import { serializeIceWallDrag } from "../../lib/map/dragPayload";
import styles from "./IceWallMarker.module.css";

type IceWallMarkerProps = {
  /** Positioning is the caller's job: the board's absolute placement and
   * zoom counter-scale, or nothing inside `IceWallHolder`. */
  style?: CSSProperties;
};

/**
 * Dazeem's Ice Wall (intent/16): a frost-cyan tile with a line-art brick
 * wall, in a fixed orientation (it can't be rotated). `draggable`: it
 * carries the wall's own drag type, which only the board and
 * `IceWallHolder` take.
 */
export function IceWallMarker({ style }: IceWallMarkerProps) {
  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    serializeIceWallDrag(event);
  }

  return (
    <div
      className={styles.marker}
      style={style}
      draggable
      onDragStart={handleDragStart}
      role="img"
      aria-label="Ice Wall"
      title="Ice Wall"
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="22" height="10" rx="1.5" />
        <path d="M1 4.5h22M1 7.5h22M8 1v3.5M16 1v3.5M4 4.5v3M12 4.5v3M20 4.5v3M8 7.5v3.5M16 7.5v3.5" />
      </svg>
    </div>
  );
}
