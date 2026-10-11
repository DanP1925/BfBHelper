import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Hero } from "../../lib/draft/types";
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

/** jsdom's DataTransfer doesn't implement getData/setData by default —
 * this minimal stand-in backs both, matching the shape
 * lib/map/dragPayload.ts reads/writes. */
function fakeDataTransfer() {
  const store = new Map<string, string>();
  return {
    setData: (type: string, value: string) => store.set(type, value),
    getData: (type: string) => store.get(type) ?? "",
    effectAllowed: "",
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

    const dataTransfer = fakeDataTransfer();
    dataTransfer.setData(
      "application/x-bfbhelper-hero",
      JSON.stringify({ side: "p1", heroId: "caligar" }),
    );
    fireEvent.drop(screen.getByText("Respawning Area"), { dataTransfer });

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

    const dataTransfer = fakeDataTransfer();
    dataTransfer.setData(
      "application/x-bfbhelper-hero",
      JSON.stringify({ side: "p1", heroId: "caligar" }),
    );

    fireEvent.drop(screen.getByRole("region", { name: "Player 1 respawning area" }), {
      dataTransfer,
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

    const dataTransfer = fakeDataTransfer();
    dataTransfer.setData(
      "application/x-bfbhelper-hero",
      JSON.stringify({ side: "p2", heroId: "sterling" }),
    );

    fireEvent.drop(screen.getByRole("region", { name: "Player 1 respawning area" }), {
      dataTransfer,
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

    fireEvent.drop(screen.getByRole("region", { name: "Player 1 respawning area" }), {
      dataTransfer: fakeDataTransfer(),
    });

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

    fireEvent.dragEnter(strip, { dataTransfer: fakeDataTransfer() });
    expect(container.querySelector('[class*="stripDragOver"]')).not.toBeNull();

    fireEvent.dragLeave(strip);
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

    fireEvent.dragEnter(strip, { dataTransfer: fakeDataTransfer() });
    expect(container.querySelector('[class*="stripDragOver"]')).not.toBeNull();

    const dataTransfer = fakeDataTransfer();
    dataTransfer.setData(
      "application/x-bfbhelper-hero",
      JSON.stringify({ side: "p1", heroId: "boreas" }),
    );
    fireEvent.drop(strip, { dataTransfer });

    expect(container.querySelector('[class*="stripDragOver"]')).toBeNull();
  });
});
