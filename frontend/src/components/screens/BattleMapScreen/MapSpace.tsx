"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import type { PlayerId } from "../../../lib/draft/types";
import type { StructuresState } from "../../../lib/battle/types";
import type { Hero, HeroId } from "../../../lib/draft/types";
import type { GoldPileSpaceId, MapSpaceDef } from "../../../data/mapSpaces";
import { parseHeroDragPayload } from "../../../lib/map/dragPayload";
import { fanOffset } from "../../../lib/map/fanOut";
import { structureIcon } from "../../../lib/battle/structureDisplay";
import { MapToken } from "../../MapToken/MapToken";
import styles from "./BattleMapScreen.module.css";

function structureHp(structures: Record<PlayerId, StructuresState>, space: MapSpaceDef): number | null {
  if (space.kind === "bit") return structures[space.side].bit;
  if (space.kind === "tower") return structures[space.side][space.slot];
  return null;
}

type MapSpaceProps = {
  space: MapSpaceDef;
  heroesHere: Array<{ hero: Hero; side: PlayerId }>;
  structures: Record<PlayerId, StructuresState>;
  goldPiles: Record<GoldPileSpaceId, number>;
  /** The board's current zoom level. Hero tokens and the gold marker
   * counter-scale themselves by `1 / zoom` so they stay a constant
   * on-screen size as the board art grows — but the structure icon
   * deliberately does *not*: each Tower/Bit icon sits on a circular dial
   * drawn into the board art itself, so it needs to keep growing in step
   * with that dial (via the ambient zoom it inherits from
   * `.boardTransform`, same as the dial) to stay visually docked inside
   * it, rather than shrinking to a fixed size floating inside a dial
   * that's grown past it. */
  zoom: number;
  onDropHero: (side: PlayerId, heroId: HeroId) => void;
};

/**
 * One `MAP_SPACES` node: the actual native-HTML5-drag-and-drop drop
 * target (drag events bubble, so dropping directly on a token still lands
 * here). For a Tower/Bit, this renders as *two* independently-positioned
 * elements — the structure icon at its dial (`xPct`/`yPct`, purely
 * decorative, no drag handlers) and the drop target itself at the
 * separate hero-standing tile (`heroXPct`/`heroYPct`) — since the board
 * art draws those at different spots. Within the drop target, z-order
 * bottom-to-top: fanned-out hero tokens -> the gold-pile marker, always
 * topmost so a token landing nearby can never visually bury it. The
 * marker is deliberately read-only (icon + count, no stepper) — this same
 * node is also where heroes stand, and a `NumberStepper` has nowhere to go
 * without overlapping a token; the real controls live in `GoldPilesBar`.
 *
 * Highlights itself while a hero is being dragged over it — every space
 * is a valid drop target (no reachability validation, per intent's Out
 * of Scope), so this is purely "you can drop here," not "this move is
 * legal." Tracked via an enter/leave counter rather than a plain
 * boolean: `dragenter`/`dragleave` fire on this element again every time
 * the pointer crosses into/out of a child (a hero token) within it, which
 * a boolean would misread as leaving the space entirely and cause the
 * highlight to flicker off mid-hover.
 */
export function MapSpace({ space, heroesHere, structures, goldPiles, zoom, onDropHero }: MapSpaceProps) {
  const hp = structureHp(structures, space);
  const isDestroyed = hp === 0;
  const goldCount = space.kind === "gold" ? goldPiles[space.id as GoldPileSpaceId] : null;

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
    if (payload === null) return;
    onDropHero(payload.side, payload.heroId);
  }

  const isStructure = space.kind === "tower" || space.kind === "bit";
  const heroXPct = isStructure ? space.heroXPct : space.xPct;
  const heroYPct = isStructure ? space.heroYPct : space.yPct;

  return (
    <>
      {isStructure && !isDestroyed && (
        // The icon sits on its own dial, independent of the hero-standing
        // tile below — a separate absolutely-positioned element rather
        // than a child of `.space`, since the two have different centers.
        <div className={styles.structureIconWrap} style={{ left: `${space.xPct}%`, top: `${space.yPct}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
          <img
            src={structureIcon(space.kind, space.side)}
            alt=""
            className={styles.structureIcon}
            draggable={false}
          />
        </div>
      )}
      <div
        className={isDragOver ? `${styles.space} ${styles.spaceDragOver}` : styles.space}
        style={{ left: `${heroXPct}%`, top: `${heroYPct}%` }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {heroesHere.map(({ hero, side }, index) => {
          const { dx, dy } = fanOffset(index, heroesHere.length);
          return (
            <MapToken
              key={hero.id}
              hero={hero}
              side={side}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${1 / zoom})`,
                zIndex: 1,
              }}
            />
          );
        })}
        {goldCount !== null && goldCount > 0 && (
          <div className={styles.goldMarker} style={{ transform: `translate(-50%, -50%) scale(${1 / zoom})` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
            <img src="/structures/gold.png" alt="" className={styles.goldMarkerIcon} draggable={false} />
            <span>{goldCount}</span>
          </div>
        )}
      </div>
    </>
  );
}
