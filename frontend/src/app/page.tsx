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
  // Which screen is showing once a draft is done — persisted separately
  // from DraftState (lib/persistence/storage.ts's loadBattleView/
  // saveBattleView, cleared together with the draft by clearDraft) so
  // reloading while on the Battle Board stays there. `null` means "not
  // yet determined for the current done-draft" and renders as nothing
  // (not a default screen) to avoid flashing Results before Battle Board
  // on a reload — same reasoning as useDraft's post-mount hydration.
  //
  // Re-derived from storage every time `draft.phase` transitions *into*
  // "done" (not just once on mount), and reset to `null` whenever it
  // leaves "done" — so every path back to "drafting"/"idle" (not just the
  // ones that happen to remember to reset `view`) correctly forgets which
  // screen was showing, instead of that being each call site's job.
  const [view, setView] = useState<View | null>(null);

  useEffect(() => {
    if (draft.phase === "done") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView(loadBattleView() ? "battle" : "results");
    } else {
      setView(null);
    }
  }, [draft.phase]);

  if (draft.phase === "idle") {
    return <StartScreen onStartDraft={draft.startNewDraft} />;
  }

  const p1Slots = draft.teamSlots.p1.map((id) => (id ? getHeroById(id) : null));
  const p2Slots = draft.teamSlots.p2.map((id) => (id ? getHeroById(id) : null));

  if (draft.phase === "done") {
    if (view === null) {
      // Not yet hydrated from storage — render nothing for this one
      // instant rather than guessing (and possibly flashing) a screen.
      return null;
    }

    const p1Picks = p1Slots.filter((hero): hero is Hero => hero !== null);
    const p2Picks = p2Slots.filter((hero): hero is Hero => hero !== null);

    if (view === "battle") {
      return (
        <BattleBoardScreen
          p1Heroes={p1Picks}
          p2Heroes={p2Picks}
          onNewDraft={draft.returnToStart}
        />
      );
    }

    return (
      <ResultsScreen
        p1Picks={p1Picks}
        p2Picks={p2Picks}
        onNewDraft={draft.returnToStart}
        onStartBattle={() => {
          setView("battle");
          saveBattleView("battle");
        }}
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
