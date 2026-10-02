"use client";

import { useEffect, useState } from "react";
import { getHeroById } from "../data/heroes";
import { BattleBoardScreen } from "../components/screens/BattleBoardScreen/BattleBoardScreen";
import { DraftBoardScreen } from "../components/screens/DraftBoardScreen/DraftBoardScreen";
import { ResultsScreen } from "../components/screens/ResultsScreen/ResultsScreen";
import { StartScreen } from "../components/screens/StartScreen/StartScreen";
import { WinScreen } from "../components/screens/WinScreen/WinScreen";
import type { Hero } from "../lib/draft/types";
import type { View } from "../lib/persistence/schema";
import { loadView, saveView } from "../lib/persistence/storage";
import { useBattle } from "../lib/useBattle";
import { useDraft } from "../lib/useDraft";

/** Stable empty-array reference passed to `useBattle` while a draft isn't
 * done yet — see the comment at its call site below. */
const EMPTY_HEROES: Hero[] = [];

export default function Home() {
  const draft = useDraft();

  const p1Slots = draft.teamSlots.p1.map((id) => (id ? getHeroById(id) : null));
  const p2Slots = draft.teamSlots.p2.map((id) => (id ? getHeroById(id) : null));
  const p1Picks = p1Slots.filter((hero): hero is Hero => hero !== null);
  const p2Picks = p2Slots.filter((hero): hero is Hero => hero !== null);

  // Gated on `draft.phase === "done"`, not the raw picks arrays directly —
  // both sides' picks arrays are already non-empty well before the draft
  // is actually done (from the 2nd overall pick onward, mid-draft; see
  // lib/draft/sequence.ts's STEP_SEQUENCE), so passing them unconditionally
  // would make useBattle activate and start persisting a throwaway
  // BattleState partway through drafting instead of only once a battle
  // actually starts.
  const battle = useBattle(
    draft.phase === "done" ? p1Picks : EMPTY_HEROES,
    draft.phase === "done" ? p2Picks : EMPTY_HEROES,
  );

  // Which screen is showing once a draft is done — persisted separately
  // from DraftState/BattleState (lib/persistence/storage.ts's loadView/
  // saveView, cleared together with the draft by clearDraft) so reloading
  // mid-battle or on the Win Screen stays there. `null` means "not yet
  // determined for the current done-draft" and renders as nothing (not a
  // default screen) to avoid flashing the wrong screen on a reload.
  //
  // Re-derived from storage every time `draft.phase` transitions *into*
  // "done" (not just once on mount), and reset to `null` whenever it
  // leaves "done" — so every path back to "drafting"/"idle" correctly
  // forgets which screen was showing, instead of that being each call
  // site's job.
  const [view, setView] = useState<View | null>(null);

  useEffect(() => {
    if (draft.phase === "done") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView(loadView());
    } else {
      setView(null);
    }
  }, [draft.phase]);

  if (draft.phase === "idle") {
    return <StartScreen onStartDraft={draft.startNewDraft} />;
  }

  if (draft.phase === "done") {
    if (view === null || battle.state === null) {
      // Not yet hydrated from storage — render nothing for this one
      // instant rather than guessing (and possibly flashing) a screen.
      return null;
    }

    if (view === "battle") {
      return (
        <BattleBoardScreen
          p1Heroes={p1Picks}
          p2Heroes={p2Picks}
          battleState={battle.state}
          winner={battle.winner}
          setGold={battle.setGold}
          setHeroHp={battle.setHeroHp}
          setHeroLevel={battle.setHeroLevel}
          setStructureHp={battle.setStructureHp}
          onNewDraft={draft.returnToStart}
          onEndBattle={() => {
            setView("win");
            saveView("win");
          }}
        />
      );
    }

    if (view === "win") {
      return (
        <WinScreen
          p1Heroes={p1Picks}
          p2Heroes={p2Picks}
          battleState={battle.state}
          // view and battle state are persisted under separate keys and
          // hydrated independently, so a stale/cross-tab-edited
          // battle-state payload could in principle no longer have either
          // Bit at 0 even though view === "win" — getBattleWinner would
          // then return null. Falling back to "draw" rather than
          // force-asserting non-null keeps that edge case from rendering
          // a broken screen (undefined heading, no winner emphasis).
          winner={battle.winner ?? "draw"}
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
          saveView("battle");
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
