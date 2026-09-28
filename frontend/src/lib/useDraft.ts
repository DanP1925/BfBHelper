"use client";

import { useCallback, useEffect, useState } from "react";
import { HERO_IDS } from "../data/heroes";
import { coinFlip } from "./draft/coinFlip";
import { draftReducer } from "./draft/reducer";
import {
  getCurrentStep,
  getCurrentTurnPlayer,
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
  currentStep: number | null;
  currentTurnPlayer: PlayerId | null;
  picksRequiredThisStep: number | null;
  remainingPool: HeroId[];
  teamSlots: Record<PlayerId, Array<HeroId | null>>;
  pickHero: (player: PlayerId, heroId: HeroId) => void;
  startNewDraft: () => void;
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

  const pickHero = useCallback((player: PlayerId, heroId: HeroId) => {
    setDraftState((prev) => {
      if (prev === null) return prev;
      const next = draftReducer(prev, { type: "PICK_HERO", player, heroId });
      if (next !== prev) {
        saveDraft(next);
      }
      return next;
    });
  }, []);

  const startNewDraft = useCallback(() => {
    const initiative = coinFlip();
    const next = draftReducer(
      { initiative, picks: { p1: [], p2: [] } },
      { type: "NEW_DRAFT", initiative },
    );
    clearDraft();
    saveDraft(next);
    setDraftState(next);
  }, []);

  const phase: DraftPhase =
    draftState === null
      ? "idle"
      : isDraftComplete(draftState)
        ? "done"
        : "drafting";

  return {
    phase,
    currentStep: draftState ? getCurrentStep(draftState) : null,
    currentTurnPlayer: draftState ? getCurrentTurnPlayer(draftState) : null,
    picksRequiredThisStep: draftState
      ? getPicksRequiredThisStep(draftState)
      : null,
    remainingPool: draftState ? getRemainingPool(draftState, HERO_IDS) : [],
    teamSlots: {
      p1: draftState ? getTeamSlots(draftState, "p1") : EMPTY_SLOTS,
      p2: draftState ? getTeamSlots(draftState, "p2") : EMPTY_SLOTS,
    },
    pickHero,
    startNewDraft,
  };
}
