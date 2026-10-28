"use client";

import { useState } from "react";
import type { Hero, HeroId, PlayerId } from "../../../lib/draft/types";
import { heroSpecificTokenSide } from "../../../lib/battle/heroSpecificTokens";
import type {
  ArtifactField,
  BattleState,
  CountedTokenField,
  OnOffTokenField,
  StructuresState,
} from "../../../lib/battle/types";
import { BATTLE_TOKENS } from "../../battleTokens";
import { BattleTeamPanel, type TeamTokenSetters } from "../../BattleTeamPanel/BattleTeamPanel";
import { ConfirmDialog } from "../../ConfirmDialog/ConfirmDialog";
import { InitiativeBadge } from "../../InitiativeBadge/InitiativeBadge";
import { OverflowMenu } from "../../OverflowMenu/OverflowMenu";
import { PhaseControl } from "../../PhaseControl/PhaseControl";
import { ViewToggle, type BattleView } from "../../ViewToggle/ViewToggle";
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
  /** useBattle's setter for every token, keyed by stored field. */
  setHeroToken: BoardTokenSetters;
  /** useBattle's setter for Runika's Artifacts (intent/17). */
  setHeroArtifact: (side: PlayerId, heroId: HeroId, field: ArtifactField, faceUp: boolean) => void;
  setStructureHp: (side: PlayerId, slot: keyof StructuresState, value: number) => void;
  onNewDraft: () => void;
  /** Called only once "End Battle" is confirmed in the dialog below. */
  onEndBattle: () => void;
  onSwitchView: (target: BattleView) => void;
  onPassInitiative: () => void;
  /** One phase forward or back (intent/21); a round change also passes
   * initiative, in useBattle. */
  onAdvancePhase: () => void;
  onStepPhaseBack: () => void;
};

/** useBattle's one setter for every counted token and one for every on/off
 * token, each named by its field. */
export type BoardTokenSetters = {
  counted: (side: PlayerId, heroId: HeroId, field: CountedTokenField, value: number) => void;
  onOff: (side: PlayerId, heroId: HeroId, field: OnOffTokenField, value: boolean) => void;
};

/** The token setters one side's panel gets: every token, minus each
 * hero-specific one whose rule puts it on the other side or whose owner
 * wasn't drafted (intents 09, 11). Rosters don't change mid-battle, so
 * this is fixed for the battle. */
function teamTokenSetters(
  side: PlayerId,
  rosters: Record<PlayerId, readonly Hero[]>,
  setters: BoardTokenSetters,
): TeamTokenSetters {
  const team: TeamTokenSetters = {};
  for (const token of BATTLE_TOKENS) {
    if (token.heroSpecific && heroSpecificTokenSide(token.heroSpecific, rosters) !== side) {
      continue;
    }
    if (token.kind === "counted") {
      const { field } = token;
      team[field] = (heroId, value) => setters.counted(side, heroId, field, value);
    } else {
      const { field } = token;
      team[field] = (heroId, value) => setters.onOff(side, heroId, field, value);
    }
  }
  return team;
}

export function BattleBoardScreen({
  p1Heroes,
  p2Heroes,
  battleState,
  winner,
  setGold,
  setHeroHp,
  setHeroLevel,
  setHeroToken,
  setHeroArtifact,
  setStructureHp,
  onNewDraft,
  onEndBattle,
  onSwitchView,
  onPassInitiative,
  onAdvancePhase,
  onStepPhaseBack,
}: BattleBoardScreenProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  // At most one token chip open across both panels (intent/06). UI state
  // only: not persisted, so a reload or a Map round-trip starts all closed.
  const [openTokenKey, setOpenTokenKey] = useState<string | null>(null);

  const teams: Array<{ label: string; side: PlayerId; heroes: Hero[] }> = [
    { label: "Player 1", side: "p1", heroes: p1Heroes },
    { label: "Player 2", side: "p2", heroes: p2Heroes },
  ];
  const rosters = { p1: p1Heroes, p2: p2Heroes };

  // "New Draft" and "End Battle" are both exceptional, rarely-tapped
  // actions next to the continuous HP/level/gold adjustments on this
  // screen (intent/03) — neither sits inline any more. "End Battle" only
  // appears once some side's Bit is at 0 HP.
  const menuItems = [
    { label: "New Draft", onSelect: onNewDraft },
    ...(winner !== null ? [{ label: "End Battle", onSelect: () => setDialogOpen(true) }] : []),
  ];

  return (
    // The JRPG theme (intent/28): its tokens and every component's
    // overrides key on this attribute, pop-ups included (none use a portal).
    <div className={styles.screen} data-theme="jrpg">
      <div className={styles.topBar}>
        <ViewToggle active="battle" onSwitchView={onSwitchView} />
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
              onHeroTokenChange={teamTokenSetters(team.side, rosters, setHeroToken)}
              onHeroArtifactChange={(heroId, field, faceUp) =>
                setHeroArtifact(team.side, heroId, field, faceUp)
              }
              onStructureHpChange={(slot, value) => setStructureHp(team.side, slot, value)}
              openTokenKey={openTokenKey}
              onOpenTokenKeyChange={setOpenTokenKey}
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
