"use client";

import type { DragEvent } from "react";
import type { Hero, HeroId, PlayerId } from "../../lib/draft/types";
import { parseHeroDragPayload } from "../../lib/map/dragPayload";
import { MapToken } from "../MapToken/MapToken";
import styles from "./RespawnAreaStrip.module.css";

type RespawnAreaStripProps = {
  side: PlayerId;
  label: string;
  /** This side's heroes whose `heroPositions` entry is `null`. */
  heroes: Hero[];
  onDrop: (heroId: HeroId) => void;
};

/** One side's column of not-yet-deployed/defeated-and-awaiting-respawn
 * heroes, flanking the board. A native-HTML5-drag-and-drop target that
 * silently rejects a drop carrying the *other* side's payload — the
 * respawn area is never shared between teams. */
export function RespawnAreaStrip({ side, label, heroes, onDrop }: RespawnAreaStripProps) {
  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const payload = parseHeroDragPayload(event);
    if (payload === null || payload.side !== side) return;
    onDrop(payload.heroId);
  }

  return (
    <div className={styles.strip} onDragOver={handleDragOver} onDrop={handleDrop}>
      <div className={styles.label}>{label}</div>
      <div className={styles.tokens}>
        {heroes.map((hero) => (
          <MapToken key={hero.id} hero={hero} side={side} />
        ))}
      </div>
    </div>
  );
}
