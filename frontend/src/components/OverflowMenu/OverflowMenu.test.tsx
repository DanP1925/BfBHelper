import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OverflowMenu } from "./OverflowMenu";

describe("OverflowMenu", () => {
  it("opens the dropdown on trigger click and closes it again on a second click", () => {
    render(<OverflowMenu items={[{ label: "New Draft", onSelect: vi.fn() }]} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu and calls onSelect when an item is clicked", () => {
    const onSelect = vi.fn();
    render(<OverflowMenu items={[{ label: "New Draft", onSelect }]} />);

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "New Draft" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on Escape without firing any item", () => {
    const onSelect = vi.fn();
    render(<OverflowMenu items={[{ label: "New Draft", onSelect }]} />);

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("closes on an outside click without firing any item", () => {
    const onSelect = vi.fn();
    render(
      <div>
        <button type="button">outside</button>
        <OverflowMenu items={[{ label: "New Draft", onSelect }]} />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("button", { name: "outside" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renders a disabled item as disabled and does not fire it when clicked", () => {
    const onSelect = vi.fn();
    render(<OverflowMenu items={[{ label: "End Battle", onSelect, disabled: true }]} />);

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    const item = screen.getByRole("menuitem", { name: "End Battle" });
    expect(item).toBeDisabled();

    fireEvent.click(item);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
