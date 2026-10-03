"use client";

import { useState } from "react";
import type { Hero, HeroId, PlayerId } from "../../../lib/draft/types";
import type { BattleState } from "../../../lib/battle/types";
import type { MapSpaceId } from "../../../data/mapSpaces";
import { MAP_SPACES } from "../../../data/mapSpaces";
import { ConfirmDialog } from "../../ConfirmDialog/ConfirmDialog";
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
  onNewDraft: () => void;
  /** Called only once "End Battle" is confirmed in the dialog below. */
  onEndBattle: () => void;
  onSwitchView: (target: BattleView) => void;
};

type HeroOnBoard = { hero: Hero; side: PlayerId };

/**
 * The thin end-to-end tracer-bullet slice (plan/04_battle-map.md's PR C):
 * every real board node, native drag-and-drop between a space and either
 * side's respawn area, all wired through the same `battleState` Battle
 * Board already reads/writes. Deliberately missing (added in the widen
 * phase, PR D): the read-only team status panel, the GoldPilesBar's real
 * steppers, zoom/pan, and fan-out for multiple heroes sharing one space.
 */
export function BattleMapScreen({
  p1Heroes,
  p2Heroes,
  battleState,
  winner,
  setHeroPosition,
  onNewDraft,
  onEndBattle,
  onSwitchView,
}: BattleMapScreenProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const teams: Array<{ side: PlayerId; heroes: Hero[] }> = [
    { side: "p1", heroes: p1Heroes },
    { side: "p2", heroes: p2Heroes },
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
        <div className={styles.row}>
          <RespawnAreaStrip
            side="p1"
            label="Player 1"
            heroes={respawn.p1}
            onDrop={(heroId) => setHeroPosition("p1", heroId, null)}
          />

          <div className={styles.board}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
            <img src="/map/board.jpg" alt="" className={styles.boardArt} />
            {MAP_SPACES.map((space) => (
              <MapSpace
                key={space.id}
                space={space}
                heroesHere={bySpace.get(space.id) ?? []}
                structures={{ p1: battleState.p1.structures, p2: battleState.p2.structures }}
                onDropHero={(side, heroId) => setHeroPosition(side, heroId, space.id)}
              />
            ))}
          </div>

          <RespawnAreaStrip
            side="p2"
            label="Player 2"
            heroes={respawn.p2}
            onDrop={(heroId) => setHeroPosition("p2", heroId, null)}
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
