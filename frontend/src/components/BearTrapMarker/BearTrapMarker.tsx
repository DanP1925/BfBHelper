"use client";

import type { CSSProperties } from "react";
import { serializeBearTrapDrag } from "../../lib/map/dragPayload";
import styles from "./BearTrapMarker.module.css";

type BearTrapMarkerProps = {
  /** Positioning is the caller's job: the offset and zoom counter-scale
   * inside a `MapSpace`, or nothing inside `BearTrapHolder`. */
  style?: CSSProperties;
};

/**
 * Boreas's Bear Trap (intent/18): an emerald tile with a line-art trap.
 * `draggable`: it carries the trap's own drag type, which only the board's
 * spaces and `BearTrapHolder` take.
 */
export function BearTrapMarker({ style }: BearTrapMarkerProps) {
  return (
    <div
      className={styles.marker}
      style={style}
      draggable
      onDragStart={serializeBearTrapDrag}
      role="img"
      aria-label="Bear Trap"
      title="Bear Trap"
    >
      <svg
        className={styles.icon}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M8 12.5C5 12.5 2.5 10 2.5 5.5M8 12.5c3 0 5.5-2.5 5.5-7" />
        <path d="M2.7 7.6h1.6M3.7 10.1l1.2-.9M13.3 7.6h-1.6M12.3 10.1l-1.2-.9" />
        <path d="M8 12.5v1.75M4.5 14.25h7" />
      </svg>
    </div>
  );
}
