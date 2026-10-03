import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ViewToggle } from "./ViewToggle";

describe("ViewToggle", () => {
  it("clicking the inactive option calls onSwitchView with that target", () => {
    const onSwitchView = vi.fn();
    render(<ViewToggle active="battle" onSwitchView={onSwitchView} />);

    fireEvent.click(screen.getByRole("button", { name: "Map" }));

    expect(onSwitchView).toHaveBeenCalledOnce();
    expect(onSwitchView).toHaveBeenCalledWith("map");
  });

  it("clicking the already-active option does not call onSwitchView", () => {
    const onSwitchView = vi.fn();
    render(<ViewToggle active="battle" onSwitchView={onSwitchView} />);

    fireEvent.click(screen.getByRole("button", { name: "Board" }));

    expect(onSwitchView).not.toHaveBeenCalled();
  });

  it("reflects which option is active via aria-pressed", () => {
    render(<ViewToggle active="map" onSwitchView={() => {}} />);

    expect(screen.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Board" })).toHaveAttribute("aria-pressed", "false");
  });
});
