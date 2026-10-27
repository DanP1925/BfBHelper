import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BattlePhase } from "../../lib/battle/types";
import { PhaseControl } from "./PhaseControl";

function renderAt(round: number, phase: BattlePhase, onAdvance = () => {}, onStepBack = () => {}) {
  return render(
    <PhaseControl round={round} phase={phase} onAdvance={onAdvance} onStepBack={onStepBack} />,
  );
}

describe("PhaseControl", () => {
  it("shows the round, read-only", () => {
    renderAt(3, "orders");

    expect(screen.getByText("Round").parentElement).toHaveTextContent("Round3");
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("shows all four phases, marking only the current one", () => {
    renderAt(2, "action");

    const phases = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(phases.map((li) => li.textContent)).toEqual(["Orders", "Movement", "Action", "Cleanup"]);
    expect(phases.filter((li) => li.getAttribute("aria-current") === "step")).toEqual([phases[2]]);
  });

  it("names where each arrow goes", () => {
    renderAt(2, "action");

    expect(screen.getByRole("button", { name: "Forward to Round 2, Cleanup" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Back to Round 2, Movement" })).toBeEnabled();
  });

  it("says when a step crosses a round, since that passes initiative", () => {
    const { unmount } = renderAt(3, "cleanup");
    expect(
      screen.getByRole("button", { name: "Forward to Round 4, Orders (passes initiative)" }),
    ).toBeInTheDocument();
    unmount();

    renderAt(4, "orders");
    expect(
      screen.getByRole("button", { name: "Back to Round 3, Cleanup (passes initiative back)" }),
    ).toBeInTheDocument();
  });

  it("disables the back arrow at Round 1, Orders", () => {
    renderAt(1, "orders");

    expect(screen.getByRole("button", { name: "Already at Round 1, Orders" })).toBeDisabled();
  });

  it("the arrows call their callbacks; the phase names aren't buttons", () => {
    const onAdvance = vi.fn();
    const onStepBack = vi.fn();
    renderAt(2, "movement", onAdvance, onStepBack);

    expect(screen.getAllByRole("button")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /^Forward/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Back/ }));

    expect(onAdvance).toHaveBeenCalledOnce();
    expect(onStepBack).toHaveBeenCalledOnce();
  });
});
