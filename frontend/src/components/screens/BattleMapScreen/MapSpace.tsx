"use client";

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
  onDropHero: (side: PlayerId, heroId: HeroId) => void;
};

/**
 * One `MAP_SPACES` node: the actual native-HTML5-drag-and-drop drop
 * target (drag events bubble, so dropping directly on a token still lands
 * here). Z-order bottom-to-top: structure icon (hidden once destroyed) ->
 * fanned-out hero tokens -> the gold-pile marker, always topmost so a
 * token or icon landing nearby can never visually bury it. The marker is
 * deliberately read-only (icon + count, no stepper) — this same node is
 * also where heroes stand, and a `NumberStepper` has nowhere to go
 * without overlapping a token; the real controls live in `GoldPilesBar`.
 */
export function MapSpace({ space, heroesHere, structures, goldPiles, onDropHero }: MapSpaceProps) {
  const hp = structureHp(structures, space);
  const isDestroyed = hp === 0;
  // `MapSpaceDef`'s `id` is plain `string` (shared across all 4 kinds);
  // `kind === "gold"` is what actually guarantees it's one of the 3 known
  // gold ids, which the type system can't see through this narrowing.
  const goldCount = space.kind === "gold" ? goldPiles[space.id as GoldPileSpaceId] : null;

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
        <img
          src={structureIcon(space.kind, space.side)}
          alt=""
          className={styles.structureIcon}
          draggable={false}
        />
      )}
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
              transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)`,
              zIndex: 1,
            }}
          />
        );
      })}
      {goldCount !== null && goldCount > 0 && (
        <div className={styles.goldMarker}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
          <img src="/structures/gold.png" alt="" className={styles.goldMarkerIcon} draggable={false} />
          <span>{goldCount}</span>
        </div>
      )}
    </div>
  );
}
