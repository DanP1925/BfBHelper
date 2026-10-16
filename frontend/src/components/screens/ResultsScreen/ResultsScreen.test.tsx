import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getHeroById, HERO_IDS } from "../../../data/heroes";
import { ResultsScreen } from "./ResultsScreen";

const p1 = HERO_IDS.slice(0, 4).map(getHeroById);
const p2 = HERO_IDS.slice(4, 8).map(getHeroById);

describe("ResultsScreen (Draft Results)", () => {
  it("shows a permanent VS between the teams, hidden from screen readers", () => {
    render(<ResultsScreen p1Picks={p1} p2Picks={p2} onStartBattle={() => {}} />);
    const vs = screen.getByText("VS");
    expect(vs.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("has Start Battle as its only button", () => {
    const onStartBattle = vi.fn();
    render(<ResultsScreen p1Picks={p1} p2Picks={p2} onStartBattle={onStartBattle} />);

    expect(screen.getAllByRole("button")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Start Battle →" }));
    expect(onStartBattle).toHaveBeenCalledTimes(1);
  });
});
