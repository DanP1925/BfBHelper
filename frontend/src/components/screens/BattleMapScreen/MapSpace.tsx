"use client";

import type { DragEvent } from "react";
import type { PlayerId } from "../../../lib/draft/types";
import type { StructuresState } from "../../../lib/battle/types";
import type { Hero, HeroId } from "../../../lib/draft/types";
import type { MapSpaceDef } from "../../../data/mapSpaces";
import { parseHeroDragPayload } from "../../../lib/map/dragPayload";
import { MapToken } from "../../MapToken/MapToken";
import styles from "./BattleMapScreen.module.css";

const SIDE_ICON_SUFFIX: Record<PlayerId, string> = { p1: "red", p2: "blue" };

function structureIcon(kind: "tower" | "bit", side: PlayerId): string {
  return `/structures/${kind}-${SIDE_ICON_SUFFIX[side]}.png`;
}

function structureHp(structures: Record<PlayerId, StructuresState>, space: MapSpaceDef): number | null {
  if (space.kind === "bit") return structures[space.side].bit;
  if (space.kind === "tower") return structures[space.side][space.slot];
  return null;
}

type MapSpaceProps = {
  space: MapSpaceDef;
  heroesHere: Array<{ hero: Hero; side: PlayerId }>;
  structures: Record<PlayerId, StructuresState>;
  onDropHero: (side: PlayerId, heroId: HeroId) => void;
};

/** One `MAP_SPACES` node: the actual native-HTML5-drag-and-drop drop
 * target (drag events bubble, so dropping directly on a token still lands
 * here), rendering that space's structure icon (hidden once destroyed)
 * and any hero tokens currently standing on it. No fan-out offset yet for
 * multiple tokens sharing a space (tracer-bullet slice — see
 * plan/04_battle-map.md's widen phase) and no gold-pile marker yet either
 * (deferred the same way). */
export function MapSpace({ space, heroesHere, structures, onDropHero }: MapSpaceProps) {
  const hp = structureHp(structures, space);
  const isDestroyed = hp === 0;

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const payload = parseHeroDragPayload(event);
    if (payload === null) return;
    onDropHero(payload.side, payload.heroId);
  }

  return (
    <div
      className={styles.space}
      style={{ left: `${space.xPct}%`, top: `${space.yPct}%` }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {(space.kind === "tower" || space.kind === "bit") && !isDestroyed && (
        // eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts
        <img src={structureIcon(space.kind, space.side)} alt="" className={styles.structureIcon} />
      )}
      {heroesHere.map(({ hero, side }) => (
        <MapToken key={hero.id} hero={hero} side={side} style={{ position: "absolute" }} />
      ))}
    </div>
  );
}
