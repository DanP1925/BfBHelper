"use client";

import type { PlayerId } from "../../../lib/draft/types";
import type { StructuresState } from "../../../lib/battle/types";
import type { Hero, HeroId } from "../../../lib/draft/types";
import type { GoldPileSpaceId, MapSpaceDef } from "../../../data/mapSpaces";
import { useHeroDropTarget } from "../../../lib/map/useHeroDropTarget";
import { useMarkerDropTarget } from "../../../lib/map/useMarkerDropTarget";
import { mergeDropHandlers } from "../../../lib/map/mergeDropHandlers";
import { isBearTrapDrag } from "../../../lib/map/dragPayload";
import { fanOffset } from "../../../lib/map/fanOut";
import { structureIcon } from "../../../lib/battle/structureDisplay";
import { BearTrapMarker } from "../../BearTrapMarker/BearTrapMarker";
import { MapToken } from "../../MapToken/MapToken";
import styles from "./BattleMapScreen.module.css";

function structureHp(
  structures: Record<PlayerId, StructuresState>,
  space: MapSpaceDef,
): number | null {
  if (space.kind === "bit") return structures[space.side].bit;
  if (space.kind === "tower") return structures[space.side][space.slot];
  return null;
}

type MapSpaceProps = {
  space: MapSpaceDef;
  heroesHere: Array<{ hero: Hero; side: PlayerId }>;
  structures: Record<PlayerId, StructuresState>;
  goldPiles: Record<GoldPileSpaceId, number>;
  /** The board's current zoom level.
   * - The gold-pile marker counter-scales by the full `1 / zoom`,
   *   staying a constant on-screen size as the board art grows.
   * - The structure icon applies no counter-scale at all — it inherits
   *   the ambient zoom from `.boardTransform` 1:1, same as the dial it's
   *   drawn on, so it stays docked inside that dial rather than
   *   shrinking to a fixed size floating inside it.
   * - A hero token counter-scales by `1 / sqrt(zoom)` — a *partial*
   *   counter-scale, not the gold marker's full one: it still grows
   *   with zoom (so it doesn't look disproportionately tiny against the
   *   now-magnified terrain), just slower than the board art itself.
   *   This is deliberate, not an approximation — the fan-out spacing
   *   between stacked tokens (`fanOffset`) grows with the *full* zoom
   *   (unscaled), so a token's own size falls increasingly behind that
   *   gap as zoom increases, resolving overlap in a crowded stack at
   *   higher zoom even though the same stack is allowed to overlap at
   *   1x (where the gap and the sqrt-scaled size are closest). */
  zoom: number;
  onDropHero: (side: PlayerId, heroId: HeroId) => void;
  /** Boreas's Bear Trap (intent/18) is on this space: draw it beside the
   * heroes here. */
  hasBearTrap: boolean;
  /** The trap was dropped on this space. */
  onDropBearTrap: () => void;
};

/**
 * One `MAP_SPACES` node: the actual native-HTML5-drag-and-drop drop
 * target (drag events bubble, so dropping directly on a token still lands
 * here). For a Tower/Bit, this renders as *two* independently-positioned
 * elements — the structure icon at its dial (`xPct`/`yPct`, purely
 * decorative, no drag handlers) and the drop target itself at the
 * separate hero-standing tile (`heroXPct`/`heroYPct`) — since the board
 * art draws those at different spots. Within the drop target, z-order
 * bottom-to-top: fanned-out hero tokens -> the Bear Trap (intent/18), set
 * off to one side so the heroes stay readable -> the gold-pile marker,
 * always topmost so a token landing nearby can never visually bury it. The
 * marker is deliberately read-only (icon + count, no stepper) — this same
 * node is also where heroes stand, and a `NumberStepper` has nowhere to go
 * without overlapping a token; the real controls live in `GoldPilesBar`.
 *
 * Highlights itself while a hero is being dragged over it — every space
 * is a valid drop target (no reachability validation, per intent's Out
 * of Scope), so this is purely "you can drop here," not "this move is
 * legal." Every space takes the Bear Trap too, and highlights for it the
 * same way. The drag handling is `useHeroDropTarget`'s and
 * `useMarkerDropTarget`'s, merged.
 */
export function MapSpace({
  space,
  heroesHere,
  structures,
  goldPiles,
  zoom,
  onDropHero,
  hasBearTrap,
  onDropBearTrap,
}: MapSpaceProps) {
  const hp = structureHp(structures, space);
  const isDestroyed = hp === 0;
  const goldCount = space.kind === "gold" ? goldPiles[space.id as GoldPileSpaceId] : null;

  const hero = useHeroDropTarget((payload) => onDropHero(payload.side, payload.heroId));
  const trap = useMarkerDropTarget(isBearTrapDrag, onDropBearTrap);
  const isDragOver = hero.isDragOver || trap.isDragOver;
  const dropHandlers = mergeDropHandlers(hero.dropHandlers, trap.dropHandlers);

  const isStructure = space.kind === "tower" || space.kind === "bit";
  const heroXPct = isStructure ? space.heroXPct : space.xPct;
  const heroYPct = isStructure ? space.heroYPct : space.yPct;

  return (
    <>
      {isStructure && !isDestroyed && (
        // The icon sits on its own dial, independent of the hero-standing
        // tile below — a separate absolutely-positioned element rather
        // than a child of `.space`, since the two have different centers.
        <div
          className={styles.structureIconWrap}
          style={{ left: `${space.xPct}%`, top: `${space.yPct}%` }}
        >
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
        {...dropHandlers}
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
                transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${1 / Math.sqrt(zoom)})`,
                zIndex: 1,
              }}
            />
          );
        })}
        {/* Beside the heroes, not over them: offset right of the centre
            token and above its name label. A hero dropped on it bubbles
            to this space, which is the right target, so unlike the Ice
            Wall it needs no pointer-events toggle. */}
        {hasBearTrap && (
          <BearTrapMarker
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) translate(30px, 14px) scale(${1 / Math.sqrt(zoom)})`,
              zIndex: 1,
            }}
          />
        )}
        {goldCount !== null && goldCount > 0 && (
          <div
            className={styles.goldMarker}
            style={{ transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
            <img
              src="/structures/gold.png"
              alt=""
              className={styles.goldMarkerIcon}
              draggable={false}
            />
            <span>{goldCount}</span>
          </div>
        )}
      </div>
    </>
  );
}
