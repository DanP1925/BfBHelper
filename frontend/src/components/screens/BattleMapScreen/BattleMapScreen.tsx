"use client";

import { useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from "react";
import type { Hero, HeroId, PlayerId } from "../../../lib/draft/types";
import type { BattleState } from "../../../lib/battle/types";
import type { GoldPileSpaceId, MapSpaceId } from "../../../data/mapSpaces";
import { MAP_SPACES } from "../../../data/mapSpaces";
import { ConfirmDialog } from "../../ConfirmDialog/ConfirmDialog";
import { GoldPilesBar } from "../../GoldPilesBar/GoldPilesBar";
import { MapTeamStatusPanel } from "../../MapTeamStatusPanel/MapTeamStatusPanel";
import { OverflowMenu } from "../../OverflowMenu/OverflowMenu";
import { RespawnAreaStrip } from "../../RespawnAreaStrip/RespawnAreaStrip";
import { ViewToggle, type BattleView } from "../../ViewToggle/ViewToggle";
import { MapSpace } from "./MapSpace";
import styles from "./BattleMapScreen.module.css";

type BattleMapScreenProps = {
  p1Heroes: Hero[];
  p2Heroes: Hero[];
  /** Caller guarantees this is non-null — `useBattle` is only active once a draft is done. */
  battleState: BattleState;
  winner: PlayerId | "draw" | null;
  setHeroPosition: (side: PlayerId, heroId: HeroId, spaceId: MapSpaceId | null) => void;
  setGoldPile: (pileId: GoldPileSpaceId, value: number) => void;
  onNewDraft: () => void;
  /** Called only once "End Battle" is confirmed in the dialog below. */
  onEndBattle: () => void;
  onSwitchView: (target: BattleView) => void;
};

type HeroOnBoard = { hero: Hero; side: PlayerId };

/** Fixed zoom steps — no numeric readout, since it doesn't convey anything
 * the +/- buttons don't already. */
const ZOOM_LEVELS = [1, 1.5, 2, 2.5];

/** The entry point for the full spec (plan/04_battle-map.md's PR D,
 * widening PR C's thin end-to-end slice): every real board node, native
 * drag-and-drop between a space and either side's respawn area, a
 * read-only team status panel, the gold-pile stepper bar, zoom/pan, and
 * fan-out for multiple heroes sharing one space.
 */
export function BattleMapScreen({
  p1Heroes,
  p2Heroes,
  battleState,
  winner,
  setHeroPosition,
  setGoldPile,
  onNewDraft,
  onEndBattle,
  onSwitchView,
}: BattleMapScreenProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Zoom/pan is entirely local UI state (not a BattleState field) — a
  // reload always starts back at 100%, un-panned, same as switching away
  // from the Map and back.
  const [zoomIndex, setZoomIndex] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPan: { x: number; y: number } } | null>(null);
  const zoom = ZOOM_LEVELS[zoomIndex];

  function clampPan(nextPan: { x: number; y: number }, atZoom: number) {
    const viewportSize = viewportRef.current?.clientWidth ?? 0;
    const maxOffset = (viewportSize * (atZoom - 1)) / 2;
    return {
      x: Math.min(maxOffset, Math.max(-maxOffset, nextPan.x)),
      y: Math.min(maxOffset, Math.max(-maxOffset, nextPan.y)),
    };
  }

  function setZoomIndexClamped(nextIndex: number) {
    const clampedIndex = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, nextIndex));
    setZoomIndex(clampedIndex);
    setPan((prev) => clampPan(prev, ZOOM_LEVELS[clampedIndex]));
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setZoomIndexClamped(zoomIndex + (event.deltaY < 0 ? 1 : -1));
  }

  function handleMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    dragRef.current = { startX: event.clientX, startY: event.clientY, startPan: pan };
  }

  function handleMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (dragRef.current === null) return;
    const { startX, startY, startPan } = dragRef.current;
    setPan(
      clampPan(
        { x: startPan.x + (event.clientX - startX), y: startPan.y + (event.clientY - startY) },
        zoom,
      ),
    );
  }

  function endDrag() {
    dragRef.current = null;
  }

  function resetZoomPan() {
    setZoomIndex(0);
    setPan({ x: 0, y: 0 });
  }

  const teams: Array<{ side: PlayerId; label: string; heroes: Hero[] }> = [
    { side: "p1", label: "Player 1", heroes: p1Heroes },
    { side: "p2", label: "Player 2", heroes: p2Heroes },
  ];

  const bySpace = new Map<MapSpaceId, HeroOnBoard[]>();
  const respawn: Record<PlayerId, Hero[]> = { p1: [], p2: [] };
  for (const team of teams) {
    for (const hero of team.heroes) {
      const spaceId = battleState[team.side].heroPositions[hero.id];
      if (spaceId === null) {
        respawn[team.side].push(hero);
      } else {
        const existing = bySpace.get(spaceId) ?? [];
        existing.push({ hero, side: team.side });
        bySpace.set(spaceId, existing);
      }
    }
  }

  // Same menu/dialog logic as BattleBoardScreen — the battle itself
  // doesn't care which screen is showing.
  const menuItems = [
    { label: "New Draft", onSelect: onNewDraft },
    ...(winner !== null ? [{ label: "End Battle", onSelect: () => setDialogOpen(true) }] : []),
  ];

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <ViewToggle active="map" onSwitchView={onSwitchView} />
        <OverflowMenu items={menuItems} />
      </div>

      <div className={styles.scrollArea}>
        <div className={styles.content}>
          <div className={styles.row}>
            <div className={styles.sideGroup}>
              <RespawnAreaStrip
                side="p1"
                label="Player 1"
                heroes={respawn.p1}
                onDrop={(heroId) => setHeroPosition("p1", heroId, null)}
              />
              <MapTeamStatusPanel label="Player 1" side="p1" heroes={p1Heroes} team={battleState.p1} />
            </div>

            <div
              ref={viewportRef}
              className={styles.board}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
            >
              <div
                className={styles.boardTransform}
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
                <img src="/map/board.jpg" alt="" className={styles.boardArt} draggable={false} />
                {MAP_SPACES.map((space) => (
                  <MapSpace
                    key={space.id}
                    space={space}
                    heroesHere={bySpace.get(space.id) ?? []}
                    structures={{ p1: battleState.p1.structures, p2: battleState.p2.structures }}
                    goldPiles={battleState.goldPiles}
                    onDropHero={(side, heroId) => setHeroPosition(side, heroId, space.id)}
                  />
                ))}
              </div>

              <div className={styles.zoomControls}>
                <button
                  type="button"
                  className={styles.zoomButton}
                  aria-label="Zoom out"
                  disabled={zoomIndex === 0}
                  onClick={() => setZoomIndexClamped(zoomIndex - 1)}
                >
                  −
                </button>
                <button
                  type="button"
                  className={styles.zoomButton}
                  aria-label="Reset zoom and pan"
                  onClick={resetZoomPan}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.zoomButton}
                  aria-label="Zoom in"
                  disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                  onClick={() => setZoomIndexClamped(zoomIndex + 1)}
                >
                  +
                </button>
              </div>
            </div>

            <div className={styles.sideGroup}>
              <MapTeamStatusPanel label="Player 2" side="p2" heroes={p2Heroes} team={battleState.p2} />
              <RespawnAreaStrip
                side="p2"
                label="Player 2"
                heroes={respawn.p2}
                onDrop={(heroId) => setHeroPosition("p2", heroId, null)}
              />
            </div>
          </div>

          <GoldPilesBar
            goldPiles={battleState.goldPiles}
            onChange={(pileId, value) => setGoldPile(pileId, value)}
          />
        </div>
      </div>

      {dialogOpen && (
        <ConfirmDialog
          title="End Battle"
          body="This moves to the Win Screen — there's no way back to the Battle Board once confirmed."
          confirmLabel="End Battle"
          onConfirm={() => {
            setDialogOpen(false);
            onEndBattle();
          }}
          onCancel={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
