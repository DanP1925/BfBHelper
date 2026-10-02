"use client";

import type { Hero } from "../../../lib/draft/types";
import { TEAM_STARTING_GOLD } from "../../../lib/battle/constants";
import { BattleTeamPanel } from "../../BattleTeamPanel/BattleTeamPanel";
import styles from "./BattleBoardScreen.module.css";

type BattleBoardScreenProps = {
  p1Heroes: Hero[];
  p2Heroes: Hero[];
  onNewDraft: () => void;
};

export function BattleBoardScreen({ p1Heroes, p2Heroes, onNewDraft }: BattleBoardScreenProps) {
  return (
    <div className={styles.screen}>
      <div className={styles.scrollArea}>
        <div className={styles.teams}>
          <BattleTeamPanel
            label="Player 1"
            side="p1"
            heroes={p1Heroes}
            gold={TEAM_STARTING_GOLD}
          />
          <BattleTeamPanel
            label="Player 2"
            side="p2"
            heroes={p2Heroes}
            gold={TEAM_STARTING_GOLD}
          />
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
