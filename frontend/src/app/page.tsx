"use client";

import { getHeroById } from "../data/heroes";
import { DraftBoardScreen } from "../components/screens/DraftBoardScreen/DraftBoardScreen";
import { ResultsScreen } from "../components/screens/ResultsScreen/ResultsScreen";
import { StartScreen } from "../components/screens/StartScreen/StartScreen";
import type { Hero } from "../lib/draft/types";
import { useDraft } from "../lib/useDraft";

export default function Home() {
  const draft = useDraft();

  if (draft.phase === "idle") {
    return <StartScreen onStartDraft={draft.startNewDraft} />;
  }

  const p1Slots = draft.teamSlots.p1.map((id) => (id ? getHeroById(id) : null));
  const p2Slots = draft.teamSlots.p2.map((id) => (id ? getHeroById(id) : null));

  if (draft.phase === "done") {
    return (
      <ResultsScreen
        p1Picks={p1Slots.filter((hero): hero is Hero => hero !== null)}
        p2Picks={p2Slots.filter((hero): hero is Hero => hero !== null)}
        onNewDraft={draft.returnToStart}
      />
    );
  }

  return (
    <DraftBoardScreen
      initiative={draft.initiative!}
      stepNumber={draft.currentStep!}
      currentTurnPlayer={draft.currentTurnPlayer}
      picksRemainingThisStep={draft.picksRemainingThisStep!}
      pool={draft.remainingPool.map(getHeroById)}
      p1Slots={p1Slots}
      p2Slots={p2Slots}
      onPick={(heroId) => draft.pickHero(draft.currentTurnPlayer!, heroId)}
      onNewDraft={draft.startNewDraft}
    />
  );
}
