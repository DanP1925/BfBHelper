"use client";

import type { Hero, PlayerId } from "../../../lib/draft/types";
import { TEAM_STARTING_GOLD } from "../../../lib/battle/constants";
import { BattleTeamPanel } from "../../BattleTeamPanel/BattleTeamPanel";
import styles from "./BattleBoardScreen.module.css";

type BattleBoardScreenProps = {
  p1Heroes: Hero[];
  p2Heroes: Hero[];
  onNewDraft: () => void;
};

export function BattleBoardScreen({ p1Heroes, p2Heroes, onNewDraft }: BattleBoardScreenProps) {
  const teams: Array<{ label: string; side: PlayerId; heroes: Hero[] }> = [
    { label: "Player 1", side: "p1", heroes: p1Heroes },
    { label: "Player 2", side: "p2", heroes: p2Heroes },
  ];

  return (
    <div className={styles.screen}>
      <div className={styles.scrollArea}>
        <div className={styles.teams}>
          {teams.map((team) => (
            <BattleTeamPanel
              key={team.side}
              label={team.label}
              side={team.side}
              heroes={team.heroes}
              gold={TEAM_STARTING_GOLD}
            />
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.newDraftLink} onClick={onNewDraft}>
          ← New Draft
        </button>
      </div>
    </div>
  );
}
