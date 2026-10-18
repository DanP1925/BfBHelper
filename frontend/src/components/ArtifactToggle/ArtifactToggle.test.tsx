import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArtifactToggle } from "./ArtifactToggle";
import { BattleFistIcon } from "./BattleFistIcon";

function renderToggle(faceUp: boolean) {
  const onChange = vi.fn();
  render(
    <ArtifactToggle
      faceUp={faceUp}
      onChange={onChange}
      icon={<BattleFistIcon size={12} />}
      summary="Battle Fist: +1 Attack"
      heroName="Runika"
    />,
  );
  return {
    onChange,
    // The name stays fixed whichever face is up: aria-pressed carries it.
    button: screen.getByRole("button", { name: "Battle Fist: +1 Attack, on Runika" }),
  };
}

describe("ArtifactToggle", () => {
  it("is pressed while face-up, and a tap flips it face-down", () => {
    const { onChange, button } = renderToggle(true);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("title", "Battle Fist: +1 Attack (face-up, tap to flip)");
    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("is still rendered while face-down, not pressed, and a tap flips it face-up", () => {
    const { onChange, button } = renderToggle(false);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAttribute("title", "Battle Fist: +1 Attack (face-down, tap to flip)");
    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
