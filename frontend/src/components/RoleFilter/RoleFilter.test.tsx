import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RoleFilter } from "./RoleFilter";

const COUNTS = { all: 16, damage: 7, utility: 6, support: 3 };

describe("RoleFilter", () => {
  it("shows the four options with their counts, in order", () => {
    render(<RoleFilter active="all" counts={COUNTS} onSelect={() => {}} />);

    const group = screen.getByRole("group", { name: "Filter heroes by role" });
    expect(
      within(group)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["All 16", "Damage 7", "Utility 6", "Support 3"]);
  });

  it("marks the active option with aria-pressed", () => {
    render(<RoleFilter active="damage" counts={COUNTS} onSelect={() => {}} />);

    expect(screen.getByRole("button", { name: "Damage 7" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "All 16" })).toHaveAttribute("aria-pressed", "false");
  });

  it("disables an option with no heroes left", () => {
    render(<RoleFilter active="all" counts={{ ...COUNTS, support: 0 }} onSelect={() => {}} />);

    expect(screen.getByRole("button", { name: "Support 0" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Utility 6" })).toBeEnabled();
  });

  it("reports the clicked role", () => {
    const onSelect = vi.fn();
    render(<RoleFilter active="all" counts={COUNTS} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Utility 6" }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith("utility");
  });

  it("ignores a click on the active option", () => {
    const onSelect = vi.fn();
    render(<RoleFilter active="damage" counts={COUNTS} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Damage 7" }));

    expect(onSelect).not.toHaveBeenCalled();
  });
});
