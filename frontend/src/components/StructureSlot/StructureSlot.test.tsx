import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STRUCTURE_DEFEAT_KEYFRAMES } from "../../lib/useDefeatAnimation";
import { installFakeAnimations, type FakeAnimations } from "../../test/fakeAnimations";
import { stubMatchMedia } from "../../test/stubMatchMedia";
import { StructureSlot } from "./StructureSlot";

let fakes: FakeAnimations;

beforeEach(() => {
  fakes = installFakeAnimations();
  stubMatchMedia(false);
});

afterEach(() => fakes.restore());

function BoardBit({ hp }: { hp: number }) {
  return (
    <StructureSlot
      label="Bit"
      teamLabel="Player 2"
      hp={hp}
      icon="/bit.png"
      accent="var(--color-p2)"
      onHpChange={vi.fn()}
      max={16}
    />
  );
}

describe("StructureSlot (intent/27)", () => {
  it("shows the Bit as destroyed at 0 HP, like a Tower", () => {
    const { rerender } = render(<BoardBit hp={0} />);
    expect(screen.getByAltText("Bit").className).toMatch(/iconDestroyed/);
    rerender(<BoardBit hp={1} />);
    expect(screen.getByAltText("Bit").className).not.toMatch(/iconDestroyed/);
  });

  it("collapses the icon when HP reaches 0 on the Board", () => {
    const { rerender } = render(<BoardBit hp={1} />);
    rerender(<BoardBit hp={0} />);
    expect(fakes.animations).toHaveLength(1);
    expect(fakes.animations[0].element).toBe(screen.getByAltText("Bit"));
    expect(fakes.animations[0].keyframes).toBe(STRUCTURE_DEFEAT_KEYFRAMES);
  });

  it("plays nothing without an HP stepper", () => {
    const { rerender } = render(
      <StructureSlot label="Top" teamLabel="Player 1" hp={1} icon="/tower.png" />,
    );
    rerender(<StructureSlot label="Top" teamLabel="Player 1" hp={0} icon="/tower.png" />);
    expect(fakes.animations).toHaveLength(0);
  });
});
