import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AttackTokenIcon } from "./AttackTokenIcon";
import { TokenChip } from "./TokenChip";

type ChipProps = Partial<Parameters<typeof TokenChip>[0]>;

function renderChip(props: ChipProps = {}) {
  const onChange = props.onChange ?? vi.fn();
  const onExpandedChange = props.onExpandedChange ?? vi.fn();
  render(
    <TokenChip
      count={0}
      max={9}
      icon={<AttackTokenIcon size={12} />}
      label="+1 Attack"
      heroName="Caligar"
      expanded={false}
      {...props}
      onChange={onChange}
      onExpandedChange={onExpandedChange}
    />,
  );
  return { onChange, onExpandedChange };
}

/** Owns `expanded` like BattleBoardScreen does, for open/close flows. */
function StatefulChip({ count = 2 }: { count?: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button type="button">outside</button>
      <TokenChip
        count={count}
        max={9}
        onChange={() => {}}
        icon={<AttackTokenIcon size={12} />}
        label="+1 Attack"
        heroName="Caligar"
        expanded={expanded}
        onExpandedChange={setExpanded}
      />
    </div>
  );
}

describe("TokenChip", () => {
  it("collapsed at 0 shows only the icon, with the count in its label", () => {
    renderChip({ count: 0 });

    const toggle = screen.getByRole("button", {
      name: "Caligar: 0 +1 Attack tokens. Show controls",
    });
    expect(toggle).toHaveTextContent("");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("title", "+1 Attack tokens");
  });

  it("collapsed from 1 up shows ×N", () => {
    renderChip({ count: 2 });

    expect(
      screen.getByRole("button", { name: "Caligar: 2 +1 Attack tokens. Show controls" }),
    ).toHaveTextContent("×2");
  });

  it("uses the singular for one token", () => {
    renderChip({ count: 1 });

    expect(
      screen.getByRole("button", { name: "Caligar: 1 +1 Attack token. Show controls" }),
    ).toBeInTheDocument();
  });

  it("makes − / + inert while collapsed", () => {
    renderChip({ count: 2 });
    const toggle = screen.getByRole("button", { name: /Show controls$/ });
    const controls = document.getElementById(toggle.getAttribute("aria-controls")!);
    expect(controls).toHaveAttribute("inert");
  });

  it("leaves − / + interactive while expanded", () => {
    renderChip({ count: 2, expanded: true });
    const toggle = screen.getByRole("button", { name: /Hide controls$/ });
    const controls = document.getElementById(toggle.getAttribute("aria-controls")!);
    expect(controls).not.toHaveAttribute("inert");
  });

  it("tapping the toggle asks to expand, and to collapse when open", () => {
    const { onExpandedChange } = renderChip({ count: 2 });
    fireEvent.click(screen.getByRole("button", { name: /Show controls$/ }));
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
  });

  it("expanded, the toggle says Hide and points at the controls", () => {
    const { onExpandedChange } = renderChip({ count: 0, expanded: true });

    const toggle = screen.getByRole("button", {
      name: "Caligar: 0 +1 Attack tokens. Hide controls",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent("×0");
    const controlsId = toggle.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
    expect(document.getElementById(controlsId!)).toContainElement(
      screen.getByRole("button", { name: "Add +1 Attack token to Caligar" }),
    );

    fireEvent.click(toggle);
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);
  });

  it("− and + call onChange with count ∓ 1 and leave it open", () => {
    const { onChange, onExpandedChange } = renderChip({ count: 2, expanded: true });

    fireEvent.click(screen.getByRole("button", { name: "Add +1 Attack token to Caligar" }));
    expect(onChange).toHaveBeenLastCalledWith(3);

    fireEvent.click(screen.getByRole("button", { name: "Remove +1 Attack token from Caligar" }));
    expect(onChange).toHaveBeenLastCalledWith(1);

    expect(onExpandedChange).not.toHaveBeenCalled();
  });

  it("disables − at 0", () => {
    renderChip({ count: 0, expanded: true });

    expect(
      screen.getByRole("button", { name: "Remove +1 Attack token from Caligar" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add +1 Attack token to Caligar" })).toBeEnabled();
  });

  it("disables + at max", () => {
    renderChip({ count: 9, expanded: true });

    expect(screen.getByRole("button", { name: "Add +1 Attack token to Caligar" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Remove +1 Attack token from Caligar" }),
    ).toBeEnabled();
  });

  it("closes on an outside mousedown", () => {
    render(<StatefulChip />);

    fireEvent.click(screen.getByRole("button", { name: /Show controls$/ }));
    expect(screen.getByRole("button", { name: /Hide controls$/ })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("button", { name: "outside" }));
    expect(screen.getByRole("button", { name: /Show controls$/ })).toBeInTheDocument();
  });

  it("stays open on a mousedown inside the chip", () => {
    render(<StatefulChip />);

    fireEvent.click(screen.getByRole("button", { name: /Show controls$/ }));
    fireEvent.mouseDown(screen.getByRole("button", { name: "Add +1 Attack token to Caligar" }));

    expect(screen.getByRole("button", { name: /Hide controls$/ })).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the toggle", () => {
    render(<StatefulChip />);

    fireEvent.click(screen.getByRole("button", { name: /Show controls$/ }));
    screen.getByRole("button", { name: "Add +1 Attack token to Caligar" }).focus();
    fireEvent.keyDown(document, { key: "Escape" });

    const toggle = screen.getByRole("button", { name: /Show controls$/ });
    expect(toggle).toHaveFocus();
  });

  it("doesn't listen for outside clicks while collapsed", () => {
    const { onExpandedChange } = renderChip({ count: 2 });

    fireEvent.mouseDown(document.body);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onExpandedChange).not.toHaveBeenCalled();
  });
});
