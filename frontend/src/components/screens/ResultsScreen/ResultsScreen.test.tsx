import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getHeroById } from "../../../data/heroes";
import type { HeroId } from "../../../lib/draft/types";
import { ResultsScreen } from "./ResultsScreen";

const p1 = (["runika", "cyrus", "dazeem", "kerrick"] as HeroId[]).map(getHeroById);
const p2 = (["vladiator", "sedusa", "ceralin", "motley"] as HeroId[]).map(getHeroById);

describe("ResultsScreen (Draft Results)", () => {
  // jsdom has no ResizeObserver; the team grids' fit hook only needs one to exist.
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("shows a permanent VS between the teams, hidden from screen readers", () => {
    render(<ResultsScreen p1Picks={p1} p2Picks={p2} onStartBattle={() => {}} />);
    const vs = screen.getByText("VS");
    expect(vs.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("has Start Battle as its only button", () => {
    const onStartBattle = vi.fn();
    render(<ResultsScreen p1Picks={p1} p2Picks={p2} onStartBattle={onStartBattle} />);

    expect(screen.queryByRole("button", { name: /new draft/i })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Start Battle →" }));
    expect(onStartBattle).toHaveBeenCalledTimes(1);
  });
});
