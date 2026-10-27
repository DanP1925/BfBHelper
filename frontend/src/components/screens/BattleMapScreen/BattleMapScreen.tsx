"use client";

import { useRef, useState } from "react";
import type {
  Dispatch,
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  SetStateAction,
  WheelEvent as ReactWheelEvent,
} from "react";
import type { Hero, HeroId, PlayerId } from "../../../lib/draft/types";
import { clamp } from "../../../lib/battle/bounds";
import { arenaOwnerSide, canEnterArena, isArenaShown } from "../../../lib/battle/arena";
import { bearTrapOwnerSide } from "../../../lib/battle/bearTrap";
import { iceWallOwnerSide } from "../../../lib/battle/iceWall";
import type { BattleState, HeroPosition, IceWallPosition } from "../../../lib/battle/types";
import { ARENA_POSITION } from "../../../lib/map/constants";
import { isBearTrapDrag, isHeroDrag, isIceWallDrag } from "../../../lib/map/dragPayload";
import { useMarkerDropTarget } from "../../../lib/map/useMarkerDropTarget";
import type { GoldPileSpaceId, MapSpaceId } from "../../../data/mapSpaces";
import { MAP_SPACES } from "../../../data/mapSpaces";
import { ArenaPanel } from "../../ArenaPanel/ArenaPanel";
import { BearTrapHolder } from "../../BearTrapHolder/BearTrapHolder";
import { ConfirmDialog } from "../../ConfirmDialog/ConfirmDialog";
import { GoldPilesBar } from "../../GoldPilesBar/GoldPilesBar";
import { IceWallHolder } from "../../IceWallHolder/IceWallHolder";
import { IceWallMarker } from "../../IceWallMarker/IceWallMarker";
import { MapTeamStatusPanel } from "../../MapTeamStatusPanel/MapTeamStatusPanel";
import { InitiativeBadge } from "../../InitiativeBadge/InitiativeBadge";
import { OverflowMenu } from "../../OverflowMenu/OverflowMenu";
import { PhaseControl } from "../../PhaseControl/PhaseControl";
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
  setHeroPosition: (side: PlayerId, heroId: HeroId, spaceId: HeroPosition) => void;
  setGoldPile: (pileId: GoldPileSpaceId, value: number) => void;
  /** Places, moves or (with `null`) removes Dazeem's Ice Wall (intent/16). */
  setIceWall: (position: IceWallPosition | null) => void;
  /** Places, moves or (with `null`) removes Boreas's Bear Trap (intent/18). */
  setBearTrap: (spaceId: MapSpaceId | null) => void;
  onNewDraft: () => void;
  /** Called only once "End Battle" is confirmed in the dialog below. */
  onEndBattle: () => void;
  onSwitchView: (target: BattleView) => void;
  onPassInitiative: () => void;
  /** One phase forward or back (intent/21); a round change also passes
   * initiative, in useBattle. */
  onAdvancePhase: () => void;
  onStepPhaseBack: () => void;
  /** Owned by the caller so it survives this screen unmounting on a
   * Board ⇄ Map view toggle. */
  camera: MapCamera;
  onCameraChange: Dispatch<SetStateAction<MapCamera>>;
};

type HeroOnBoard = { hero: Hero; side: PlayerId };

/** Fixed zoom steps — no numeric readout, since it doesn't convey anything
 * the +/- buttons don't already. */
const ZOOM_LEVELS = [1, 1.5, 2, 2.5];

/** The Map's zoom/pan — UI state only (not a BattleState field), so a
 * reload always starts back at 100%, un-panned. */
export type MapCamera = { zoomIndex: number; pan: { x: number; y: number } };

export const INITIAL_MAP_CAMERA: MapCamera = { zoomIndex: 0, pan: { x: 0, y: 0 } };

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
  setIceWall,
  setBearTrap,
  onNewDraft,
  onEndBattle,
  onSwitchView,
  onPassInitiative,
  onAdvancePhase,
  onStepPhaseBack,
  camera,
  onCameraChange,
}: BattleMapScreenProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { zoomIndex, pan } = camera;
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardTransformRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPan: { x: number; y: number };
  } | null>(null);
  const zoom = ZOOM_LEVELS[zoomIndex];

  function clampPan(nextPan: { x: number; y: number }, atZoom: number) {
    const viewportSize = viewportRef.current?.clientWidth ?? 0;
    const maxOffset = (viewportSize * (atZoom - 1)) / 2;
    return {
      x: clamp(nextPan.x, -maxOffset, maxOffset),
      y: clamp(nextPan.y, -maxOffset, maxOffset),
    };
  }

  function setZoomIndexClamped(nextIndex: number) {
    const clampedIndex = clamp(nextIndex, 0, ZOOM_LEVELS.length - 1);
    onCameraChange((prev) => ({
      zoomIndex: clampedIndex,
      pan: clampPan(prev.pan, ZOOM_LEVELS[clampedIndex]),
    }));
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setZoomIndexClamped(zoomIndex + (event.deltaY < 0 ? 1 : -1));
  }

  function handleMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    // Don't start a pan when the mousedown is actually the start of a
    // native drag (a `MapToken`'s or the `IceWallMarker`'s own `draggable`
    // div) — this event bubbles up from it before the browser's own drag
    // gesture takes over, and without this check, panning would start
    // alongside it and visibly fight the drag. `Element`, not
    // `HTMLElement`: pressing the Ice Wall lands on its SVG icon.
    if (event.target instanceof Element && event.target.closest('[draggable="true"]')) return;
    dragRef.current = { startX: event.clientX, startY: event.clientY, startPan: pan };
  }

  function handleMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (dragRef.current === null) return;
    const { startX, startY, startPan } = dragRef.current;
    onCameraChange((prev) => {
      const nextPan = clampPan(
        { x: startPan.x + (event.clientX - startX), y: startPan.y + (event.clientY - startY) },
        ZOOM_LEVELS[prev.zoomIndex],
      );
      // Returning `prev` unchanged lets React skip the re-render — e.g. every
      // mousemove at 100% zoom, where the pan is clamped to 0.
      if (nextPan.x === prev.pan.x && nextPan.y === prev.pan.y) return prev;
      return { ...prev, pan: nextPan };
    });
  }

  function endDrag() {
    dragRef.current = null;
  }

  function resetZoomPan() {
    onCameraChange(INITIAL_MAP_CAMERA);
  }

  // The Ice Wall (intent/16) is free-placed: the cursor's point becomes a
  // percentage of the board art's on-screen box, which already includes
  // the zoom and pan transform, so the wall stays on that spot of the art
  // at any zoom or pan. A wall dropped over a space lands here too: the
  // space's own drop handler ignores it and doesn't stop propagation.
  const { isDragOver: isWallOverBoard, dropHandlers: boardWallDropHandlers } = useMarkerDropTarget(
    isIceWallDrag,
    (event: ReactDragEvent<HTMLElement>) => {
      const rect = boardTransformRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      setIceWall({
        xPct: ((event.clientX - rect.left) / rect.width) * 100,
        yPct: ((event.clientY - rect.top) / rect.height) * 100,
      });
    },
  );

  const iceWallSide = iceWallOwnerSide(battleState);
  const wallOnBoard = iceWallSide !== null && battleState.iceWall !== null;

  // Whether something that lands on a space (a hero token, or the Bear Trap)
  // is being dragged, so the Ice Wall can let drops through to the space
  // under it. Only tracked while a wall is on the board, so other drags
  // don't re-render the screen. Set from the drag's own start (which
  // carries its drag type) and cleared on any drop or drag end on this
  // screen: a token or trap that moved has remounted elsewhere, so its own
  // `dragend` may not reach here, but the drop does.
  const [isSpaceDragging, setIsSpaceDragging] = useState(false);
  const spaceDragTracking = {
    onDragStart: (event: ReactDragEvent<HTMLElement>) => {
      if (wallOnBoard && (isHeroDrag(event) || isBearTrapDrag(event))) setIsSpaceDragging(true);
    },
    onDropCapture: () => setIsSpaceDragging(false),
    onDragEnd: () => setIsSpaceDragging(false),
  };

  const iceWallHolder = (
    <IceWallHolder holdsWall={battleState.iceWall === null} onDrop={() => setIceWall(null)} />
  );

  const bearTrapSide = bearTrapOwnerSide(battleState);
  const bearTrapHolder = (
    <BearTrapHolder holdsTrap={battleState.bearTrap === null} onDrop={() => setBearTrap(null)} />
  );

  const arenaSide = isArenaShown(battleState) ? arenaOwnerSide(battleState) : null;

  const teams: Array<{ side: PlayerId; label: string; heroes: Hero[] }> = [
    { side: "p1", label: "Player 1", heroes: p1Heroes },
    { side: "p2", label: "Player 2", heroes: p2Heroes },
  ];

  const bySpace = new Map<MapSpaceId, HeroOnBoard[]>();
  const respawn: Record<PlayerId, Hero[]> = { p1: [], p2: [] };
  // P1 first, matching arenaOccupants.
  const arena: HeroOnBoard[] = [];
  for (const team of teams) {
    for (const hero of team.heroes) {
      const spaceId = battleState[team.side].heroPositions[hero.id];
      if (spaceId === null) {
        respawn[team.side].push(hero);
      } else if (spaceId === ARENA_POSITION) {
        arena.push({ hero, side: team.side });
      } else {
        const existing = bySpace.get(spaceId) ?? [];
        existing.push({ hero, side: team.side });
        bySpace.set(spaceId, existing);
      }
    }
  }

  const arenaPanel = (
    <ArenaPanel
      occupants={arena}
      canDrop={(payload) => canEnterArena(battleState, payload)}
      onDrop={({ side, heroId }) => setHeroPosition(side, heroId, ARENA_POSITION)}
    />
  );

  // The hero-specific drop zones go in the empty margin outside their
  // owner's team column: Felix's Arena, then Dazeem's Ice Wall holder, then
  // Boreas's Bear Trap holder.
  const outerZones = (side: PlayerId) =>
    (arenaSide === side || iceWallSide === side || bearTrapSide === side) && (
      <div
        className={`${styles.outerZones} ${side === "p1" ? styles.outerZonesP1 : styles.outerZonesP2}`}
      >
        {arenaSide === side && arenaPanel}
        {iceWallSide === side && iceWallHolder}
        {bearTrapSide === side && bearTrapHolder}
      </div>
    );

  // Same menu/dialog logic as BattleBoardScreen — the battle itself
  // doesn't care which screen is showing.
  const menuItems = [
    { label: "New Draft", onSelect: onNewDraft },
    ...(winner !== null ? [{ label: "End Battle", onSelect: () => setDialogOpen(true) }] : []),
  ];

  return (
    <div className={styles.screen} {...spaceDragTracking}>
      <div className={styles.topBar}>
        <ViewToggle active="map" onSwitchView={onSwitchView} />
        <PhaseControl
          round={battleState.round}
          phase={battleState.phase}
          onAdvance={onAdvancePhase}
          onStepBack={onStepPhaseBack}
        />
        <div className={styles.topBarActions}>
          <InitiativeBadge holder={battleState.initiative} onPass={onPassInitiative} />
          <OverflowMenu items={menuItems} />
        </div>
      </div>

      <div className={styles.scrollArea}>
        <div className={styles.content}>
          <div className={styles.row}>
            <div className={styles.sideGroup}>
              <MapTeamStatusPanel
                label="Player 1"
                side="p1"
                heroes={p1Heroes}
                team={battleState.p1}
              />
              <RespawnAreaStrip
                side="p1"
                label="Player 1"
                heroes={respawn.p1}
                onDrop={(heroId) => setHeroPosition("p1", heroId, null)}
              />
              {outerZones("p1")}
            </div>

            {/* The gold piles sit right under the board, not under the whole
                row, so they don't drop below the taller side columns and
                leave a gap. */}
            <div className={styles.boardColumn}>
              <div
                ref={viewportRef}
                className={
                  isWallOverBoard ? `${styles.board} ${styles.boardWallDragOver}` : styles.board
                }
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                {...boardWallDropHandlers}
              >
                <div
                  ref={boardTransformRef}
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
                      zoom={zoom}
                      onDropHero={(side, heroId) => setHeroPosition(side, heroId, space.id)}
                      hasBearTrap={bearTrapSide !== null && battleState.bearTrap === space.id}
                      onDropBearTrap={() => setBearTrap(space.id)}
                    />
                  ))}
                  {/* After the spaces, so it's always grabbable, even near a
                      space whose invisible drop circle would otherwise sit
                      on top of it. While a hero or the Bear Trap is dragged
                      it lets the pointer through, so it never takes a drop
                      meant for the space under it. It counter-scales by 1/sqrt(zoom)
                      like a hero token: still growing with the paths it
                      covers, just slower than the art. */}
                  {iceWallSide !== null && battleState.iceWall !== null && (
                    <IceWallMarker
                      style={{
                        position: "absolute",
                        left: `${battleState.iceWall.xPct}%`,
                        top: `${battleState.iceWall.yPct}%`,
                        transform: `translate(-50%, -50%) scale(${1 / Math.sqrt(zoom)})`,
                        zIndex: 3,
                        pointerEvents: isSpaceDragging ? "none" : undefined,
                      }}
                    />
                  )}
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
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
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

              <GoldPilesBar
                goldPiles={battleState.goldPiles}
                onChange={(pileId, value) => setGoldPile(pileId, value)}
              />
            </div>

            <div className={styles.sideGroup}>
              <MapTeamStatusPanel
                label="Player 2"
                side="p2"
                heroes={p2Heroes}
                team={battleState.p2}
              />
              <RespawnAreaStrip
                side="p2"
                label="Player 2"
                heroes={respawn.p2}
                onDrop={(heroId) => setHeroPosition("p2", heroId, null)}
              />
              {outerZones("p2")}
            </div>
          </div>
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
