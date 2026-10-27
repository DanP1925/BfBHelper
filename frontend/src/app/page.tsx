"use client";

import { useCallback, useEffect, useState } from "react";
import { getHeroById } from "../data/heroes";
import { BattleBoardScreen } from "../components/screens/BattleBoardScreen/BattleBoardScreen";
import {
  BattleMapScreen,
  INITIAL_MAP_CAMERA,
  type MapCamera,
} from "../components/screens/BattleMapScreen/BattleMapScreen";
import { DraftBoardScreen } from "../components/screens/DraftBoardScreen/DraftBoardScreen";
import { ResultsScreen } from "../components/screens/ResultsScreen/ResultsScreen";
import { StartScreen } from "../components/screens/StartScreen/StartScreen";
import { WinScreen } from "../components/screens/WinScreen/WinScreen";
import type { BattleView } from "../components/ViewToggle/ViewToggle";
import type { Hero, HeroId } from "../lib/draft/types";
import { motionAllowed } from "../lib/motion";
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
    // A fresh battle starts with initiative on the coin-flip winner, who
    // keeps the marker for deployment and Round 1 (intent/05).
    draft.phase === "done" ? draft.initiative : null,
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

  // The Map's zoom/pan, held here rather than in BattleMapScreen so it
  // survives the screen unmounting on a Board ⇄ Map toggle. Not persisted —
  // a reload starts back at 100% — and reset whenever the draft leaves
  // "done", so a new battle never inherits the last one's camera.
  const [mapCamera, setMapCamera] = useState<MapCamera>(INITIAL_MAP_CAMERA);

  /** What plays between the 8th pick and a settled Draft Results screen
   * (intent/10). "landing": the Draft Board stays up until the last hero
   * has appeared in its slot. "versus": the Draft Results screen plays its
   * entrance. "none": normal rendering, which is also what a reload starts
   * with, so the entrance never replays. */
  const [draftOutro, setDraftOutro] = useState<"none" | "landing" | "versus">("none");

  useEffect(() => {
    if (draft.phase === "done") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView(loadView());
    } else {
      setView(null);
      setMapCamera(INITIAL_MAP_CAMERA);
      // A new draft (even mid-finale) never inherits the last one's.
      setDraftOutro("none");
    }
  }, [draft.phase]);

  function handlePick(heroId: HeroId) {
    // With reduced motion the draft ends straight on a settled Draft Results.
    if (draft.isFinalPickNext && motionAllowed()) setDraftOutro("landing");
    draft.pickHero(draft.currentTurnPlayer!, heroId);
  }

  // Stable, so the screens can depend on them in their effects.
  const finishLanding = useCallback(() => setDraftOutro("versus"), []);
  const finishIntro = useCallback(() => setDraftOutro("none"), []);

  // Shared by BattleBoardScreen's and BattleMapScreen's ViewToggle — the
  // only way to move between "battle" and "map" once a battle is underway.
  function switchView(target: BattleView) {
    setView(target);
    saveView(target);
  }

  if (draft.phase === "idle") {
    return <StartScreen onStartDraft={draft.startNewDraft} />;
  }

  // While "landing", the Draft Board stays up past the end of the draft.
  if (draft.phase === "done" && draftOutro !== "landing") {
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
          setHeroToken={{
            counted: battle.setHeroCountedToken,
            onOff: battle.setHeroOnOffToken,
          }}
          setHeroArtifact={battle.setHeroArtifact}
          setStructureHp={battle.setStructureHp}
          onNewDraft={draft.returnToStart}
          onEndBattle={() => {
            setView("win");
            saveView("win");
          }}
          onSwitchView={switchView}
          onPassInitiative={battle.passInitiative}
          onAdvancePhase={battle.advancePhase}
          onStepPhaseBack={battle.stepPhaseBack}
        />
      );
    }

    if (view === "map") {
      return (
        <BattleMapScreen
          p1Heroes={p1Picks}
          p2Heroes={p2Picks}
          battleState={battle.state}
          winner={battle.winner}
          setHeroPosition={battle.setHeroPosition}
          setGoldPile={battle.setGoldPile}
          setIceWall={battle.setIceWall}
          setBearTrap={battle.setBearTrap}
          onNewDraft={draft.returnToStart}
          onEndBattle={() => {
            setView("win");
            saveView("win");
          }}
          onSwitchView={switchView}
          onPassInitiative={battle.passInitiative}
          onAdvancePhase={battle.advancePhase}
          onStepPhaseBack={battle.stepPhaseBack}
          camera={mapCamera}
          onCameraChange={setMapCamera}
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
        playIntro={draftOutro === "versus"}
        onIntroEnd={finishIntro}
        onStartBattle={() => {
          setView("battle");
          saveView("battle");
        }}
      />
    );
  }

  // Drafting, or "landing": the same element type in the same spot, so the
  // board stays mounted past the end of the draft and the final pick's
  // animation plays out.
  return (
    <DraftBoardScreen
      initiative={draft.initiative!}
      stepNumber={draft.currentStep!}
      currentTurnPlayer={draft.currentTurnPlayer}
      picksRemainingThisStep={draft.picksRemainingThisStep!}
      pool={draft.remainingPool.map(getHeroById)}
      p1Slots={p1Slots}
      p2Slots={p2Slots}
      onPick={handlePick}
      onNewDraft={draft.startNewDraft}
      // Only while the last hero is landing: the board then reports as soon
      // as nothing is left playing.
      onFinalPickLanded={draftOutro === "landing" ? finishLanding : undefined}
    />
  );
}
