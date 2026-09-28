import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { HERO_IDS } from "../data/heroes";
import { STORAGE_KEY } from "./persistence/schema";
import { saveDraft } from "./persistence/storage";
import type { DraftState } from "./draft/types";
import { useDraft } from "./useDraft";

function readRawPicks(): { p1: string[]; p2: string[] } {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) throw new Error("expected a persisted draft");
  return JSON.parse(raw).picks;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("useDraft", () => {
  it("reports phase 'idle' with no persisted state", () => {
    const { result } = renderHook(() => useDraft());
    expect(result.current.phase).toBe("idle");
    expect(result.current.currentStep).toBeNull();
    expect(result.current.currentTurnPlayer).toBeNull();
  });

  it("restores a valid persisted mid-draft state with the correct phase/turn/step", () => {
    const midDraft: DraftState = {
      initiative: "p2",
      picks: { p1: [], p2: [HERO_IDS[0]] },
    };
    saveDraft(midDraft);

    const { result } = renderHook(() => useDraft());

    expect(result.current.phase).toBe("drafting");
    expect(result.current.currentStep).toBe(2);
    expect(result.current.currentTurnPlayer).toBe("p1");
    expect(result.current.teamSlots.p2[0]).toBe(HERO_IDS[0]);
  });

  it("persists every successful pickHero call", () => {
    const { result } = renderHook(() => useDraft());

    act(() => {
      result.current.startNewDraft();
    });
    const initiative = result.current.currentTurnPlayer!;

    act(() => {
      result.current.pickHero(initiative, HERO_IDS[0]);
    });

    expect(readRawPicks()[initiative]).toEqual([HERO_IDS[0]]);
  });

  it("does not persist a rejected (wrong-turn) pickHero call", () => {
    const { result } = renderHook(() => useDraft());

    act(() => {
      result.current.startNewDraft();
    });
    const initiative = result.current.currentTurnPlayer!;
    const other = initiative === "p1" ? "p2" : "p1";

    act(() => {
      result.current.pickHero(other, HERO_IDS[0]);
    });

    expect(readRawPicks()[other]).toEqual([]);
  });

  it("startNewDraft mid-draft immediately persists the fresh (empty) state", () => {
    const { result } = renderHook(() => useDraft());

    act(() => {
      result.current.startNewDraft();
    });
    const firstInitiative = result.current.currentTurnPlayer!;
    act(() => {
      result.current.pickHero(firstInitiative, HERO_IDS[0]);
    });
    expect(readRawPicks()[firstInitiative]).toEqual([HERO_IDS[0]]);

    act(() => {
      result.current.startNewDraft();
    });

    expect(readRawPicks()).toEqual({ p1: [], p2: [] });
    expect(result.current.phase).toBe("drafting");
  });

  it("returnToStart clears the persisted draft and goes back to idle", () => {
    const { result } = renderHook(() => useDraft());

    act(() => {
      result.current.startNewDraft();
    });
    expect(result.current.phase).toBe("drafting");

    act(() => {
      result.current.returnToStart();
    });

    expect(result.current.phase).toBe("idle");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
