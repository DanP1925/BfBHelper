"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import type { Hero, PlayerId } from "../../lib/draft/types";
import { parseHeroDragPayload, type HeroDragPayload } from "../../lib/map/dragPayload";
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
 * native-HTML5-drag-and-drop target like `RespawnAreaStrip`, which
 * silently ignores a drop `canDrop` refuses (Felix's allies, a second
 * enemy). Its tokens drag back out onto any space or respawn area through
 * those targets' own handlers.
 *
 * The highlight means "a drop could land here," not "this drop is valid":
 * browsers hide a drag's payload until `drop` (see `RespawnAreaStrip`).
 */
export function ArenaPanel({ occupants, canDrop, onDrop }: ArenaPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);

  function handleDragEnter(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
  }

  function handleDragLeave() {
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragOver(false);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    const payload = parseHeroDragPayload(event);
    if (payload === null || !canDrop(payload)) return;
    onDrop(payload);
  }

  return (
    <section
      className={styles.arena}
      aria-label="The Arena"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.label}>The Arena</div>
      <div className={isDragOver ? `${styles.box} ${styles.boxDragOver}` : styles.box}>
        {occupants.map(({ hero, side }) => (
          <MapToken key={hero.id} hero={hero} side={side} />
        ))}
      </div>
    </section>
  );
}
