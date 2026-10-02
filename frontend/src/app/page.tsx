"use client";

import { useEffect, useState } from "react";
import { getHeroById } from "../data/heroes";
import { BattleBoardScreen } from "../components/screens/BattleBoardScreen/BattleBoardScreen";
import { DraftBoardScreen } from "../components/screens/DraftBoardScreen/DraftBoardScreen";
import { ResultsScreen } from "../components/screens/ResultsScreen/ResultsScreen";
import { StartScreen } from "../components/screens/StartScreen/StartScreen";
import type { Hero } from "../lib/draft/types";
import { useDraft } from "../lib/useDraft";
import { loadBattleView, saveBattleView } from "../lib/persistence/storage";

type View = "results" | "battle";

export default function Home() {
  const draft = useDraft();
  // Which screen is showing once a draft is done — persisted separately from
  // DraftState (see lib/persistence/storage.ts's loadBattleView/
  // saveBattleView) so reloading while on the Battle Board stays there.
  // `null` means "not yet hydrated from localStorage" (avoids a hydration
  // mismatch, same reasoning as useDraft's post-mount read) and renders as
  // "results" below without persisting that default over a real stored
  // value.
  const [view, setView] = useState<View | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(loadBattleView() ? "battle" : "results");
  }, []);

  useEffect(() => {
    if (view !== null) saveBattleView(view);
  }, [view]);

  if (draft.phase === "idle") {
    return (
      <StartScreen
        onStartDraft={() => {
          setView("results");
          draft.startNewDraft();
        }}
      />
    );
  }

  const p1Slots = draft.teamSlots.p1.map((id) => (id ? getHeroById(id) : null));
  const p2Slots = draft.teamSlots.p2.map((id) => (id ? getHeroById(id) : null));

  if (draft.phase === "done") {
    const p1Picks = p1Slots.filter((hero): hero is Hero => hero !== null);
    const p2Picks = p2Slots.filter((hero): hero is Hero => hero !== null);

    if ((view ?? "results") === "battle") {
      return (
        <BattleBoardScreen
          p1Heroes={p1Picks}
          p2Heroes={p2Picks}
          onNewDraft={() => {
            setView("results");
            draft.returnToStart();
          }}
        />
      );
    }

    return (
      <ResultsScreen
        p1Picks={p1Picks}
        p2Picks={p2Picks}
        onNewDraft={draft.returnToStart}
        onStartBattle={() => setView("battle")}
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
