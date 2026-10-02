import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Home from "./page";
import { getHeroById, HERO_IDS } from "../data/heroes";
import { battleReducer, createInitialBattleState } from "../lib/battle/reducer";
import { saveBattleState, saveDraft, saveView } from "../lib/persistence/storage";

beforeEach(() => {
  window.localStorage.clear();
});

describe("Home", () => {
  it("renders the Start screen when no draft is in progress", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /battle for biternia/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start draft/i }),
    ).toBeInTheDocument();
  });

  it("renders the Win Screen when a completed battle's persisted view is 'win'", () => {
    const p1Ids = HERO_IDS.slice(0, 4);
    const p2Ids = HERO_IDS.slice(4, 8);
    saveDraft({ initiative: "p1", picks: { p1: p1Ids, p2: p2Ids } });

    const fresh = createInitialBattleState(p1Ids.map(getHeroById), p2Ids.map(getHeroById));
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
    expect(
      screen.getByRole("button", { name: /new draft/i }),
    ).toBeInTheDocument();
  });
});
