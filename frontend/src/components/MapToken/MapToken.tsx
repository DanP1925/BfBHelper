"use client";

import type { CSSProperties, DragEvent } from "react";
import type { Hero, PlayerId } from "../../lib/draft/types";
import { serializeHeroDragPayload } from "../../lib/map/dragPayload";
import styles from "./MapToken.module.css";

type MapTokenProps = {
  hero: Hero;
  side: PlayerId;
  /** Positioning is the caller's job (e.g. a `MapSpace`'s `left`/`top`/
   * `transform`, or nothing at all inside `RespawnAreaStrip`'s plain flex
   * column) — this component only renders its own art/ring/label. */
  style?: CSSProperties;
};

/**
 * A hero's on-board (or respawn-area) token: `battleToken` art inside a
 * colored p1/p2 ring, with a name label below. The label is its own
 * out-of-flow element (`position: absolute; top: 100%`) rather than a
 * normal-flow sibling — otherwise its height would shift `.token`'s own
 * box, throwing off whatever centering transform a caller (`MapSpace`)
 * applies to this component as a whole (the same technique used for
 * structure HP tags elsewhere in this app).
 *
 * `draggable` — dragging it puts `{ side, heroId }` in the native drag
 * payload for a `MapSpace` or `RespawnAreaStrip` drop target to read.
 */
export function MapToken({ hero, side, style }: MapTokenProps) {
  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    serializeHeroDragPayload(event, { side, heroId: hero.id });
  }

  return (
    <div className={styles.token} style={style} draggable onDragStart={handleDragStart}>
      <div className={styles.ring} style={{ borderColor: `var(--color-${side})` }}>
        {/* draggable={false}: images default to native-draggable, and this
            one sits inside the real drag handle (.token above) — without
            this, the browser can start its own default image-drag gesture
            on the art instead of our custom HTML5 DnD payload. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
        <img src={hero.battleToken} alt={hero.name} className={styles.art} draggable={false} />
      </div>
      <span className={styles.label}>{hero.name}</span>
    </div>
  );
}
