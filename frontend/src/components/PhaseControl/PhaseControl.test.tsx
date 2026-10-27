import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhaseControl } from "./PhaseControl";

describe("PhaseControl", () => {
  it("shows all four phases, marking only the current one", () => {
    render(<PhaseControl round={2} phase="action" onAdvance={() => {}} onStepBack={() => {}} />);

    const phases = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(phases.map((li) => li.textContent)).toEqual(["Orders", "Movement", "Action", "Cleanup"]);
    expect(phases.filter((li) => li.getAttribute("aria-current") === "step")).toEqual([phases[2]]);
  });

  it("names where each arrow goes", () => {
    render(<PhaseControl round={2} phase="action" onAdvance={() => {}} onStepBack={() => {}} />);

    expect(screen.getByRole("button", { name: "Forward to Round 2, Cleanup" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Back to Round 2, Movement" })).toBeEnabled();
  });

  it("says when a step crosses a round, since that passes initiative", () => {
    const { rerender } = render(
      <PhaseControl round={3} phase="cleanup" onAdvance={() => {}} onStepBack={() => {}} />,
    );
    expect(
      screen.getByRole("button", { name: "Forward to Round 4, Orders (passes initiative)" }),
    ).toBeInTheDocument();

    rerender(<PhaseControl round={4} phase="orders" onAdvance={() => {}} onStepBack={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Back to Round 3, Cleanup (passes initiative back)" }),
    ).toBeInTheDocument();
  });

  it("disables the back arrow at Round 1, Orders", () => {
    render(<PhaseControl round={1} phase="orders" onAdvance={() => {}} onStepBack={() => {}} />);

    expect(screen.getByRole("button", { name: "Already at Round 1, Orders" })).toBeDisabled();
  });

  it("the arrows call their callbacks; the phase names aren't buttons", () => {
    const onAdvance = vi.fn();
    const onStepBack = vi.fn();
    render(
      <PhaseControl round={2} phase="movement" onAdvance={onAdvance} onStepBack={onStepBack} />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /^Forward/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Back/ }));

    expect(onAdvance).toHaveBeenCalledOnce();
    expect(onStepBack).toHaveBeenCalledOnce();
  });
});
