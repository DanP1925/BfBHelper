import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Home from "./page";
import { getHeroById, HERO_IDS } from "../data/heroes";
import { battleReducer, createInitialBattleState } from "../lib/battle/reducer";
import { saveBattleState, saveDraft, saveView } from "../lib/persistence/storage";

/** Saves a finished draft (first 8 heroes, split 4/4) and returns a fresh
 * battle state for it — callers save it as-is or after edits. */
function seedDoneDraft() {
  const p1Ids = HERO_IDS.slice(0, 4);
  const p2Ids = HERO_IDS.slice(4, 8);
  saveDraft({ initiative: "p1", picks: { p1: p1Ids, p2: p2Ids } });
  return createInitialBattleState(p1Ids.map(getHeroById), p2Ids.map(getHeroById), "p1");
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("Home", () => {
  it("renders the Start screen when no draft is in progress", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /battle for biternia/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start draft/i })).toBeInTheDocument();
  });

  it("renders the Win Screen when a completed battle's persisted view is 'win'", () => {
    const fresh = seedDoneDraft();
    const p1BitDown = battleReducer(fresh, {
      type: "SET_STRUCTURE_HP",
      side: "p1",
      slot: "bit",
      value: 0,
    });
    saveBattleState(p1BitDown);
    saveView("win");

    render(<Home />);
    expect(screen.getByText(/player 2 wins!/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new draft/i })).toBeInTheDocument();
  });

  it("keeps the Map's zoom when switching to the Board and back", () => {
    saveBattleState(seedDoneDraft());
    saveView("map");

    render(<Home />);
    // Zoom out is disabled at 100%, so it being enabled means "zoomed in".
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    expect(screen.queryByRole("button", { name: "Zoom out" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Map" }));

    expect(screen.getByRole("button", { name: "Zoom out" })).toBeEnabled();
  });

  it("starts a new battle with initiative on the draft's coin-flip winner", () => {
    seedDoneDraft();
    saveView("battle");

    render(<Home />);
    expect(screen.getByRole("button", { name: /^Initiative: Player 1\./ })).toBeInTheDocument();
  });

  it("passing initiative on the Board shows on the Map too, and survives a reload", () => {
    saveBattleState(seedDoneDraft());
    saveView("battle");

    const { unmount } = render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /^Initiative: Player 1\./ }));
    expect(screen.getByRole("button", { name: /^Initiative: Player 2\./ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Map" }));
    expect(screen.getByRole("button", { name: /^Initiative: Player 2\./ })).toBeInTheDocument();

    unmount();
    render(<Home />);
    expect(screen.getByRole("button", { name: /^Initiative: Player 2\./ })).toBeInTheDocument();
  });
});
