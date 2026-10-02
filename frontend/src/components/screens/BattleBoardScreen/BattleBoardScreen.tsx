"use client";

import { useState } from "react";
import type { Hero, HeroId, PlayerId } from "../../../lib/draft/types";
import type { BattleState, StructuresState } from "../../../lib/battle/types";
import { BattleTeamPanel } from "../../BattleTeamPanel/BattleTeamPanel";
import { ConfirmDialog } from "../../ConfirmDialog/ConfirmDialog";
import { OverflowMenu } from "../../OverflowMenu/OverflowMenu";
import styles from "./BattleBoardScreen.module.css";

type BattleBoardScreenProps = {
  p1Heroes: Hero[];
  p2Heroes: Hero[];
  /** Caller guarantees this is non-null — `useBattle` is only active once a draft is done. */
  battleState: BattleState;
  winner: PlayerId | "draw" | null;
  setGold: (side: PlayerId, value: number) => void;
  setHeroHp: (side: PlayerId, heroId: HeroId, value: number) => void;
  setHeroLevel: (side: PlayerId, heroId: HeroId, value: number) => void;
  setStructureHp: (side: PlayerId, slot: keyof StructuresState, value: number) => void;
  onNewDraft: () => void;
  /** Called only once "End Battle" is confirmed in the dialog below. */
  onEndBattle: () => void;
};

export function BattleBoardScreen({
  p1Heroes,
  p2Heroes,
  battleState,
  winner,
  setGold,
  setHeroHp,
  setHeroLevel,
  setStructureHp,
  onNewDraft,
  onEndBattle,
}: BattleBoardScreenProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const teams: Array<{ label: string; side: PlayerId; heroes: Hero[] }> = [
    { label: "Player 1", side: "p1", heroes: p1Heroes },
    { label: "Player 2", side: "p2", heroes: p2Heroes },
  ];

  // "New Draft" and "End Battle" are both exceptional, rarely-tapped
  // actions next to the continuous HP/level/gold adjustments on this
  // screen (intent/03) — neither sits inline any more. "End Battle" only
  // appears once some side's Bit is at 0 HP.
  const menuItems = [
    { label: "New Draft", onSelect: onNewDraft },
    ...(winner !== null ? [{ label: "End Battle", onSelect: () => setDialogOpen(true) }] : []),
  ];

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <OverflowMenu items={menuItems} />
      </div>

      <div className={styles.scrollArea}>
        <div className={styles.teams}>
          {teams.map((team) => (
            <BattleTeamPanel
              key={team.side}
              label={team.label}
              side={team.side}
              heroes={team.heroes}
              team={battleState[team.side]}
              onGoldChange={(value) => setGold(team.side, value)}
              onHeroHpChange={(heroId, value) => setHeroHp(team.side, heroId, value)}
              onHeroLevelChange={(heroId, value) => setHeroLevel(team.side, heroId, value)}
              onStructureHpChange={(slot, value) => setStructureHp(team.side, slot, value)}
            />
          ))}
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
