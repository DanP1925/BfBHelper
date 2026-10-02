"use client";

import { HERO_STARTING_LEVEL } from "../../../lib/battle/constants";
import type { BattleState } from "../../../lib/battle/types";
import type { Hero, PlayerId } from "../../../lib/draft/types";
import { HeroCard } from "../../HeroCard/HeroCard";
import styles from "./WinScreen.module.css";

type WinScreenProps = {
  p1Heroes: Hero[];
  p2Heroes: Hero[];
  battleState: BattleState;
  winner: PlayerId | "draw";
  onNewDraft: () => void;
};

type Emphasis = "winner" | "loser" | "neutral";

type WinTeamPanelProps = {
  label: string;
  side: PlayerId;
  heroes: Hero[];
  battleState: BattleState;
  emphasis: Emphasis;
};

function WinTeamPanel({ label, side, heroes, battleState, emphasis }: WinTeamPanelProps) {
  const team = battleState[side];
  const panelClass =
    emphasis === "winner"
      ? `${styles.panel} ${styles.panelWinner}`
      : emphasis === "loser"
        ? `${styles.panel} ${styles.panelLoser}`
        : styles.panel;

  return (
    <div className={panelClass}>
      {emphasis === "winner" && <div className={styles.winnerRibbon}>Winner</div>}
      <div className={styles.header} style={{ borderBottomColor: `var(--color-${side})` }}>
        <div className={styles.headerLabel}>{label}</div>
      </div>
      <div className={styles.heroGrid}>
        {heroes.map((hero) => {
          // Same graceful-fallback rationale as BattleTeamPanel's
          // identical lookup — normally guaranteed present by
          // useBattle's heroIdSetsMatch.
          const heroState = team.heroes[hero.id] ?? {
            hp: hero.baseHp,
            level: HERO_STARTING_LEVEL,
          };
          return (
            <HeroCard key={hero.id} hero={hero} variant="battle" hp={heroState.hp} level={heroState.level} />
          );
        })}
      </div>
    </div>
  );
}

const WINNER_HEADING: Record<PlayerId, string> = {
  p1: "Player 1 Wins!",
  p2: "Player 2 Wins!",
};

/**
 * Reached only via a confirmed "End Battle" — read-only final state, no
 * path back to the Battle Board. No Structures section (intent/03): the
 * win condition is about heroes' final HP/level, not the structures that
 * triggered it.
 */
export function WinScreen({ p1Heroes, p2Heroes, battleState, winner, onNewDraft }: WinScreenProps) {
  const heading = winner === "draw" ? "Draw" : WINNER_HEADING[winner];

  const teams: Array<{ label: string; side: PlayerId; heroes: Hero[] }> = [
    { label: "Player 1", side: "p1", heroes: p1Heroes },
    { label: "Player 2", side: "p2", heroes: p2Heroes },
  ];

  function emphasisFor(side: PlayerId): Emphasis {
    if (winner === "draw") return "neutral";
    return side === winner ? "winner" : "loser";
  }

  return (
    <div className={styles.screen}>
      <div className={styles.scrollArea}>
        <div className={styles.titleBlock}>
          <div className={styles.eyebrow}>Battle for Biternia</div>
          <div className={styles.title}>{heading}</div>
        </div>

        <div className={styles.teams}>
          {teams.map((team) => (
            <WinTeamPanel
              key={team.side}
              label={team.label}
              side={team.side}
              heroes={team.heroes}
              battleState={battleState}
              emphasis={emphasisFor(team.side)}
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
