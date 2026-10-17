import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Hero } from "../../lib/draft/types";
import {
  dropHero,
  fakeDataTransfer,
  heroDragTransfer,
  iceWallDragTransfer,
} from "../../test/heroDrag";
import { RespawnAreaStrip } from "./RespawnAreaStrip";

function makeHero(id: Hero["id"], name: string): Hero {
  return {
    id,
    name,
    className: "Test Class",
    portrait: `/portraits/${id}.png`,
    battleToken: `/heroes-tokens/${id}.png`,
    baseHp: 10,
  };
}

describe("RespawnAreaStrip", () => {
  it('shows a "Respawning Area" heading', () => {
    render(<RespawnAreaStrip side="p1" label="Player 1" heroes={[]} onDrop={() => {}} />);

    expect(screen.getByText("Respawning Area")).toBeInTheDocument();
  });

  it("calls onDrop when a drop lands on the heading, not just the box", () => {
    const onDrop = vi.fn();
    render(<RespawnAreaStrip side="p1" label="Player 1" heroes={[]} onDrop={onDrop} />);

    dropHero(screen.getByText("Respawning Area"), { side: "p1", heroId: "caligar" });

    expect(onDrop).toHaveBeenCalledWith("caligar");
  });

  it("calls onDrop when the drag payload's side matches this strip's side", () => {
    const onDrop = vi.fn();
    render(
      <RespawnAreaStrip
        side="p1"
        label="Player 1"
        heroes={[makeHero("boreas", "Boreas")]}
        onDrop={onDrop}
      />,
    );

    dropHero(screen.getByRole("region", { name: "Player 1 respawning area" }), {
      side: "p1",
      heroId: "caligar",
    });

    expect(onDrop).toHaveBeenCalledOnce();
    expect(onDrop).toHaveBeenCalledWith("caligar");
  });

  it("rejects a drop carrying the other side's payload", () => {
    const onDrop = vi.fn();
    render(
      <RespawnAreaStrip
        side="p1"
        label="Player 1"
        heroes={[makeHero("boreas", "Boreas")]}
        onDrop={onDrop}
      />,
    );

    dropHero(screen.getByRole("region", { name: "Player 1 respawning area" }), {
      side: "p2",
      heroId: "sterling",
    });

    expect(onDrop).not.toHaveBeenCalled();
  });

  it("ignores a drop with no recognizable payload", () => {
    const onDrop = vi.fn();
    render(
      <RespawnAreaStrip
        side="p1"
        label="Player 1"
        heroes={[makeHero("boreas", "Boreas")]}
        onDrop={onDrop}
      />,
    );

    dropHero(screen.getByRole("region", { name: "Player 1 respawning area" }));

    expect(onDrop).not.toHaveBeenCalled();
  });

  it("highlights while something is dragged over it, and un-highlights on drag-leave", () => {
    const { container } = render(
      <RespawnAreaStrip
        side="p1"
        label="Player 1"
        heroes={[makeHero("boreas", "Boreas")]}
        onDrop={() => {}}
      />,
    );
    const strip = screen.getByRole("region", { name: "Player 1 respawning area" });

    fireEvent.dragEnter(strip, { dataTransfer: heroDragTransfer() });
    expect(container.querySelector('[class*="stripDragOver"]')).not.toBeNull();

    fireEvent.dragLeave(strip);
    expect(container.querySelector('[class*="stripDragOver"]')).toBeNull();
  });

  it("doesn't highlight for the Ice Wall or an unknown drag (intent/16)", () => {
    const { container } = render(
      <RespawnAreaStrip
        side="p1"
        label="Player 1"
        heroes={[makeHero("boreas", "Boreas")]}
        onDrop={() => {}}
      />,
    );
    const strip = screen.getByRole("region", { name: "Player 1 respawning area" });

    fireEvent.dragEnter(strip, { dataTransfer: iceWallDragTransfer() });
    fireEvent.dragEnter(strip, { dataTransfer: fakeDataTransfer() });
    expect(container.querySelector('[class*="stripDragOver"]')).toBeNull();
  });

  it("clears the highlight once the drop lands", () => {
    const { container } = render(
      <RespawnAreaStrip
        side="p1"
        label="Player 1"
        heroes={[makeHero("boreas", "Boreas")]}
        onDrop={() => {}}
      />,
    );
    const strip = screen.getByRole("region", { name: "Player 1 respawning area" });

    fireEvent.dragEnter(strip, { dataTransfer: heroDragTransfer() });
    expect(container.querySelector('[class*="stripDragOver"]')).not.toBeNull();

    dropHero(strip, { side: "p1", heroId: "boreas" });

    expect(container.querySelector('[class*="stripDragOver"]')).toBeNull();
  });
});
