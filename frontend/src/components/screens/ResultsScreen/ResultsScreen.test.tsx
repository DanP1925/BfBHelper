import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  describe("versus entrance", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    function renderIntro(onIntroEnd = vi.fn(), onStartBattle = vi.fn()) {
      const view = render(
        <ResultsScreen
          p1Picks={p1}
          p2Picks={p2}
          playIntro
          onIntroEnd={onIntroEnd}
          onStartBattle={onStartBattle}
        />,
      );
      return { view, onIntroEnd, onStartBattle };
    }

    it("covers the screen with a focused skip button; a tap ends the entrance", () => {
      const { onIntroEnd, onStartBattle } = renderIntro();
      const skip = screen.getByRole("button", { name: "Skip intro" });
      expect(skip).toHaveFocus();

      fireEvent.click(skip);
      expect(onIntroEnd).toHaveBeenCalledTimes(1);
      expect(onStartBattle).not.toHaveBeenCalled();
    });

    it("ends when the footer, the last thing in, finishes animating", () => {
      const { onIntroEnd } = renderIntro();
      const footer = screen.getByRole("button", { name: "Start Battle →" }).parentElement!;

      // A bubbled animationend from inside the footer doesn't count.
      fireEvent.animationEnd(screen.getByRole("button", { name: "Start Battle →" }));
      expect(onIntroEnd).not.toHaveBeenCalled();

      fireEvent.animationEnd(footer);
      expect(onIntroEnd).toHaveBeenCalledTimes(1);
    });

    it("ends on a timeout if the keyframes never run", () => {
      vi.useFakeTimers();
      const { onIntroEnd } = renderIntro();
      vi.advanceTimersByTime(1000);
      expect(onIntroEnd).not.toHaveBeenCalled();
      vi.advanceTimersByTime(400);
      expect(onIntroEnd).toHaveBeenCalledTimes(1);
    });

    it("hands focus to Start Battle once it ends, and the VS stays", () => {
      const { view } = renderIntro();
      view.rerender(<ResultsScreen p1Picks={p1} p2Picks={p2} onStartBattle={() => {}} />);

      expect(screen.queryByRole("button", { name: "Skip intro" })).toBeNull();
      expect(screen.getByRole("button", { name: "Start Battle →" })).toHaveFocus();
      expect(screen.getByText("VS")).toBeInTheDocument();
    });
  });
});
