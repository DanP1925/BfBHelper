import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { TokenPicker, type TokenPickerOption } from "./TokenPicker";

function makeOptions(overrides: Partial<Record<string, Partial<TokenPickerOption>>> = {}) {
  const base: TokenPickerOption[] = [
    { key: "attack", icon: null, label: "+1 Attack", accent: "gold", onPick: vi.fn() },
    { key: "confused", icon: null, label: "Confuse", accent: "purple", onPick: vi.fn() },
  ];
  return base.map((option) => ({ ...option, ...overrides[option.key] }));
}

/** Owns `expanded` like BattleBoardScreen does, for open/close flows. */
function StatefulPicker({ options }: { options: TokenPickerOption[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button type="button">outside</button>
      <TokenPicker
        heroName="Boreas"
        options={options}
        expanded={expanded}
        onExpandedChange={setExpanded}
      />
    </div>
  );
}

const addButton = () => screen.getByRole("button", { name: "Add a token to Boreas" });
const popover = () => screen.queryByRole("group", { name: "Add a token to Boreas" });

describe("TokenPicker", () => {
  it("always renders the '+', closed, with no popover", () => {
    render(<StatefulPicker options={makeOptions()} />);

    expect(addButton()).toHaveAttribute("aria-expanded", "false");
    expect(addButton()).toHaveAttribute("aria-haspopup", "true");
    expect(addButton()).toHaveAttribute("title", "Add a token");
    expect(popover()).toBeNull();
  });

  it("opens a popover listing the options in the given order", () => {
    render(<StatefulPicker options={makeOptions()} />);
    fireEvent.click(addButton());

    expect(addButton()).toHaveAttribute("aria-expanded", "true");
    const rows = within(popover()!).getAllByRole("button");
    expect(rows.map((row) => row.textContent)).toEqual(["+1 Attack", "Confuse"]);
  });

  it("a pick calls onPick and stays open", () => {
    const options = makeOptions();
    render(<StatefulPicker options={options} />);
    fireEvent.click(addButton());

    fireEvent.click(within(popover()!).getByRole("button", { name: "Add Confuse" }));
    fireEvent.click(within(popover()!).getByRole("button", { name: "Add +1 Attack" }));

    expect(options[1].onPick).toHaveBeenCalledTimes(1);
    expect(options[0].onPick).toHaveBeenCalledTimes(1);
    expect(popover()).not.toBeNull();
  });

  it("disables an option at its ceiling, and shows no count on any row", () => {
    const options = makeOptions({ attack: { disabled: true } });
    render(<StatefulPicker options={options} />);
    fireEvent.click(addButton());

    const attack = within(popover()!).getByRole("button", { name: "Add +1 Attack" });
    expect(popover()).not.toHaveTextContent("×");
    expect(attack).toBeDisabled();
    fireEvent.click(attack);
    expect(options[0].onPick).not.toHaveBeenCalled();
  });

  it("closes on a second tap of '+'", () => {
    render(<StatefulPicker options={makeOptions()} />);
    fireEvent.click(addButton());
    fireEvent.click(addButton());

    expect(popover()).toBeNull();
  });

  it("closes on an outside mousedown, but not on one inside the popover", () => {
    render(<StatefulPicker options={makeOptions()} />);
    fireEvent.click(addButton());

    fireEvent.mouseDown(within(popover()!).getByRole("button", { name: "Add Confuse" }));
    expect(popover()).not.toBeNull();

    fireEvent.mouseDown(screen.getByRole("button", { name: "outside" }));
    expect(popover()).toBeNull();
  });

  it("closes on Escape and returns focus to '+'", () => {
    render(<StatefulPicker options={makeOptions()} />);
    fireEvent.click(addButton());
    within(popover()!).getByRole("button", { name: "Add Confuse" }).focus();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(popover()).toBeNull();
    expect(addButton()).toHaveFocus();
  });

  it("closes on a scroll anywhere, rather than following the '+'", () => {
    render(<StatefulPicker options={makeOptions()} />);
    fireEvent.click(addButton());

    fireEvent.scroll(screen.getByRole("button", { name: "outside" }));

    expect(popover()).toBeNull();
  });

  it("places the popover below the '+' when there's room, and above when there isn't", () => {
    const { rerender } = render(
      <TokenPicker heroName="Boreas" options={makeOptions()} expanded onExpandedChange={vi.fn()} />,
    );
    // jsdom has no layout: every rect is 0 and the window is 1024x768, so
    // the popover fits below a "+" at the top.
    expect(popover()!.style.top).toBe("4px");
    expect(popover()!.style.bottom).toBe("");

    rerender(
      <TokenPicker
        heroName="Boreas"
        options={makeOptions()}
        expanded={false}
        onExpandedChange={vi.fn()}
      />,
    );
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 740,
      bottom: 760,
      left: 10,
      right: 30,
      width: 160,
      height: 80,
      x: 10,
      y: 740,
      toJSON: () => ({}),
    });
    rerender(
      <TokenPicker heroName="Boreas" options={makeOptions()} expanded onExpandedChange={vi.fn()} />,
    );
    expect(popover()!.style.top).toBe("");
    expect(popover()!.style.bottom).toBe(`${window.innerHeight - 740 + 4}px`);
    expect(popover()!.style.left).toBe("10px");
    rect.mockRestore();
  });
});
