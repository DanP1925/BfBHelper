import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfuseTokenIcon } from "./ConfuseTokenIcon";
import { ImmobilizeIcon } from "./ImmobilizeIcon";
import { TokenToggle } from "./TokenToggle";

// Only ever rendered while held since intent/09, so always `on`.
function renderToggle() {
  const onChange = vi.fn();
  render(
    <TokenToggle
      on
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
  it("is pressed, and a tap removes the token", () => {
    const { onChange, button } = renderToggle();
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("says in its tooltip that a tap removes it", () => {
    const { button } = renderToggle();
    expect(button).toHaveAttribute("title", "Confuse token (tap to remove)");
  });

  it("uses the label verbatim, so a non-token name reads right", () => {
    render(
      <TokenToggle
        on
        onChange={vi.fn()}
        icon={<ImmobilizeIcon size={12} />}
        label="Immobilized"
        heroName="Boreas"
        accent="var(--color-immobilize)"
      />,
    );
    const button = screen.getByRole("button", { name: "Immobilized on Boreas" });
    expect(button).toHaveAttribute("title", "Immobilized (tap to remove)");
  });

  it("sets the accent as --token-accent", () => {
    const { button } = renderToggle();
    expect(button.style.getPropertyValue("--token-accent")).toBe("var(--color-confuse)");
  });

  it("renders the icon as decoration only", () => {
    const { button } = renderToggle();
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
