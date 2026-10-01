"use client";

import { useCallback, useEffect, useState } from "react";
import { HERO_IDS } from "../data/heroes";
import { coinFlip } from "./draft/coinFlip";
import { draftReducer } from "./draft/reducer";
import {
  getCurrentStep,
  getCurrentTurnPlayer,
  getPicksRemainingThisStep,
  getPicksRequiredThisStep,
  getRemainingPool,
  getTeamSlots,
  isDraftComplete,
} from "./draft/selectors";
import type { DraftState, HeroId, PlayerId } from "./draft/types";
import { clearDraft, loadDraft, saveDraft } from "./persistence/storage";

export type DraftPhase = "idle" | "drafting" | "done";

export type UseDraftResult = {
  phase: DraftPhase;
  /** The player who won the coin flip — fixed for the whole draft, unlike currentTurnPlayer. */
  initiative: PlayerId | null;
  currentStep: number | null;
  currentTurnPlayer: PlayerId | null;
  picksRequiredThisStep: number | null;
  picksRemainingThisStep: number | null;
  remainingPool: HeroId[];
  teamSlots: Record<PlayerId, Array<HeroId | null>>;
  pickHero: (player: PlayerId, heroId: HeroId) => void;
  startNewDraft: () => void;
  /** Clears any in-progress/completed draft and returns to the idle Start screen. */
  returnToStart: () => void;
};

const EMPTY_SLOTS: Array<HeroId | null> = [null, null, null, null];

/**
 * The single integration point between the pure draft reducer/selectors,
 * localStorage persistence, and React. Loads any persisted draft on mount;
 * `draftState === null` means "no draft in progress" (phase 'idle'), kept
 * distinct from a drafting state with zero picks.
 */
export function useDraft(): UseDraftResult {
  const [draftState, setDraftState] = useState<DraftState | null>(null);

  useEffect(() => {
    // Reading localStorage must happen post-mount, not during the lazy
    // initial-state pass, so the static-export server render (no `window`)
    // and the client's first render both produce 'idle' — avoiding a
    // hydration mismatch. This is a one-time snapshot read, not a
    // subscription, so react-hooks/set-state-in-effect doesn't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftState(loadDraft());
  }, []);

  // Persisting is a real side effect (localStorage), so it belongs in a
  // committed effect reacting to the final state, not inside the setState
  // updater below — React can invoke an updater more than once per commit
  // (Strict Mode's dev-only double-invoke, or a discarded concurrent
  // render), which would otherwise fire extra, out-of-band writes.
  useEffect(() => {
    if (draftState !== null) {
      saveDraft(draftState);
    }
  }, [draftState]);

  const pickHero = useCallback((player: PlayerId, heroId: HeroId) => {
    setDraftState((prev) => {
      if (prev === null) return prev;
      return draftReducer(prev, { type: "PICK_HERO", player, heroId });
    });
  }, []);

  const startNewDraft = useCallback(() => {
    const initiative = coinFlip();
    const next = draftReducer(
      { initiative, picks: { p1: [], p2: [] } },
      { type: "NEW_DRAFT", initiative },
    );
    clearDraft();
    setDraftState(next);
  }, []);

  const returnToStart = useCallback(() => {
    clearDraft();
    setDraftState(null);
  }, []);

  const phase: DraftPhase =
    draftState === null
      ? "idle"
      : isDraftComplete(draftState)
        ? "done"
        : "drafting";

  return {
    phase,
    initiative: draftState ? draftState.initiative : null,
    currentStep: draftState ? getCurrentStep(draftState) : null,
    currentTurnPlayer: draftState ? getCurrentTurnPlayer(draftState) : null,
    picksRequiredThisStep: draftState
      ? getPicksRequiredThisStep(draftState)
      : null,
    picksRemainingThisStep: draftState
      ? getPicksRemainingThisStep(draftState)
      : null,
    remainingPool: draftState ? getRemainingPool(draftState, HERO_IDS) : [],
    teamSlots: {
      p1: draftState ? getTeamSlots(draftState, "p1") : EMPTY_SLOTS,
      p2: draftState ? getTeamSlots(draftState, "p2") : EMPTY_SLOTS,
    },
    pickHero,
    startNewDraft,
    returnToStart,
  };
}
