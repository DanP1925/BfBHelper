import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfuseTokenIcon } from "./ConfuseTokenIcon";
import { ImmobilizeIcon } from "./ImmobilizeIcon";
import { TokenToggle } from "./TokenToggle";

function renderToggle(on: boolean) {
  const onChange = vi.fn();
  render(
    <TokenToggle
      on={on}
      onChange={onChange}
      icon={<ConfuseTokenIcon size={12} />}
      label="Confuse token"
      heroName="Agatha Trunch"
      accent="var(--color-confuse)"
    />,
  );
  return {
    onChange,
    button: screen.getByRole("button", { name: "Confuse token on Agatha Trunch" }),
  };
}

describe("TokenToggle", () => {
  it("is not pressed when off, and a tap turns it on", () => {
    const { onChange, button } = renderToggle(false);
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("is pressed when on, and a tap turns it off", () => {
    const { onChange, button } = renderToggle(true);
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("keeps a fixed label and tooltip whatever the state", () => {
    const { button } = renderToggle(true);
    expect(button).toHaveAttribute("title", "Confuse token");
  });

  it("uses the label verbatim, so a non-token name reads right", () => {
    render(
      <TokenToggle
        on={false}
        onChange={vi.fn()}
        icon={<ImmobilizeIcon size={12} />}
        label="Immobilized"
        heroName="Boreas"
        accent="var(--color-immobilize)"
      />,
    );
    const button = screen.getByRole("button", { name: "Immobilized on Boreas" });
    expect(button).toHaveAttribute("title", "Immobilized");
  });

  it("sets the accent as --token-accent", () => {
    const { button } = renderToggle(false);
    expect(button.style.getPropertyValue("--token-accent")).toBe("var(--color-confuse)");
  });

  it("renders the icon as decoration only", () => {
    const { button } = renderToggle(false);
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
