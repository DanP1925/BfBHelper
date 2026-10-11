"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import type { Hero, HeroId, PlayerId } from "../../lib/draft/types";
import { parseHeroDragPayload } from "../../lib/map/dragPayload";
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
 * respawn area is never shared between teams.
 *
 * Highlights itself while anything is being dragged over it, same as a
 * `MapSpace` — browsers don't expose a drag payload's actual data (only
 * its MIME type list) until the `drop` event fires, so this can't tell
 * the correct-side case apart from the one it's about to reject just by
 * hovering; the highlight means "a drop could land here," not "this
 * specific drop is valid."
 */
export function RespawnAreaStrip({ side, label, heroes, onDrop }: RespawnAreaStripProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDragLeave() {
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragOver(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    const payload = parseHeroDragPayload(event);
    if (payload === null || payload.side !== side) return;
    onDrop(payload.heroId);
  }

  // The whole section (heading included) is the drop target, so a drop
  // that lands on the heading still counts; only the dashed box itself
  // highlights.
  return (
    <section
      className={styles.area}
      aria-label={`${label} respawning area`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
