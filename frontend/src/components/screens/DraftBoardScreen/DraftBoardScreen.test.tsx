import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { HERO_ROSTER } from "../../../data/heroes";
import type { HeroId, PlayerId } from "../../../lib/draft/types";
import { DraftBoardScreen } from "./DraftBoardScreen";

type Props = ComponentProps<typeof DraftBoardScreen>;

/** The board at `stepNumber`, with `picked` gone from the pool. Initiative
 * is Player 1, so odd steps are theirs; null `turn` means the draft is done. */
function boardProps(
  stepNumber: number,
  turn: PlayerId | null,
  picked: HeroId[] = [],
  overrides: Partial<Props> = {},
): Props {
  return {
    initiative: "p1",
    stepNumber,
    currentTurnPlayer: turn,
    picksRemainingThisStep: 1,
    pool: HERO_ROSTER.filter((hero) => !picked.includes(hero.id)),
    p1Slots: [null, null, null, null],
    p2Slots: [null, null, null, null],
    onPick: () => {},
    onNewDraft: () => {},
    ...overrides,
  };
}

/** The heroes the pool shows, by name. */
function shownHeroes() {
  return screen.getAllByRole("button", { name: /^Pick / }).map(
    (card) =>
      card
        .getAttribute("aria-label")!
        .replace(/^Pick /, "")
        .split(",")[0],
  );
}

function chooseRole(label: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label} `) }));
}

function activeRole() {
  return screen
    .getByRole("group", { name: "Filter heroes by role" })
    .querySelector('[aria-pressed="true"]')!
    .textContent!.split(" ")[0];
}

describe("DraftBoardScreen role filter (intent/23)", () => {
  it("starts on All with every remaining hero", () => {
    render(<DraftBoardScreen {...boardProps(1, "p1")} />);

    expect(activeRole()).toBe("All");
    expect(shownHeroes()).toHaveLength(19);
  });

  it("narrows the pool to the chosen role, in alphabetical order", () => {
    render(<DraftBoardScreen {...boardProps(1, "p1")} />);

    chooseRole("Support");

    expect(activeRole()).toBe("Support");
    expect(shownHeroes()).toEqual(["Baldwin", "Caligar", "Cyrus"]);
  });

  it("keeps the role after a pick within the same step", () => {
    const { rerender } = render(<DraftBoardScreen {...boardProps(2, "p2", ["felix"])} />);
    chooseRole("Support");

    rerender(<DraftBoardScreen {...boardProps(2, "p2", ["felix", "baldwin"])} />);

    expect(activeRole()).toBe("Support");
    expect(shownHeroes()).toEqual(["Caligar", "Cyrus"]);
  });

  it("goes back to All when the turn passes", () => {
    const { rerender } = render(<DraftBoardScreen {...boardProps(2, "p2", ["felix"])} />);
    chooseRole("Damage");

    rerender(<DraftBoardScreen {...boardProps(3, "p1", ["felix", "boreas", "sterling"])} />);

    expect(activeRole()).toBe("All");
    expect(shownHeroes()).toHaveLength(16);
  });

  it("doesn't bring a choice back on the same player's next step", () => {
    const { rerender } = render(<DraftBoardScreen {...boardProps(1, "p1")} />);
    chooseRole("Utility");

    rerender(<DraftBoardScreen {...boardProps(3, "p1", ["felix", "boreas", "sterling"])} />);

    expect(activeRole()).toBe("All");
  });

  it("goes back to All when the chosen role runs out, and disables it", () => {
    const supportGone: HeroId[] = ["baldwin", "caligar"];
    const { rerender } = render(<DraftBoardScreen {...boardProps(2, "p2", supportGone)} />);
    chooseRole("Support");
    expect(shownHeroes()).toEqual(["Cyrus"]);

    rerender(<DraftBoardScreen {...boardProps(2, "p2", [...supportGone, "cyrus"])} />);

    expect(activeRole()).toBe("All");
    expect(screen.getByRole("button", { name: "Support 0" })).toBeDisabled();
  });

  it("reads All once the draft is done", () => {
    const { rerender } = render(<DraftBoardScreen {...boardProps(5, "p1")} />);
    chooseRole("Damage");

    rerender(<DraftBoardScreen {...boardProps(5, null)} />);

    expect(activeRole()).toBe("All");
  });

  it("clears the choice on New Draft, which restarts at step 1 on the same board", () => {
    const onNewDraft = vi.fn();
    const { rerender } = render(<DraftBoardScreen {...boardProps(1, "p1", [], { onNewDraft })} />);
    chooseRole("Support");

    fireEvent.click(screen.getByRole("button", { name: "New Draft" }));
    rerender(<DraftBoardScreen {...boardProps(1, "p1", [], { onNewDraft })} />);

    expect(onNewDraft).toHaveBeenCalledOnce();
    expect(activeRole()).toBe("All");
  });
});
