import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getHeroById } from "../../data/heroes";
import { dropHero } from "../../test/heroDrag";
import { ArenaPanel } from "./ArenaPanel";

describe("ArenaPanel", () => {
  it("shows its label and each occupant's token", () => {
    render(
      <ArenaPanel
        occupants={[
          { hero: getHeroById("felix"), side: "p1" },
          { hero: getHeroById("sterling"), side: "p2" },
        ]}
        canDrop={() => true}
        onDrop={() => {}}
      />,
    );

    expect(screen.getByRole("region", { name: "The Arena" })).toBeInTheDocument();
    expect(screen.getByText("The Arena")).toBeInTheDocument();
    expect(screen.getByAltText("Felix")).toBeInTheDocument();
    expect(screen.getByAltText("Sterling")).toBeInTheDocument();
  });

  it("calls onDrop when canDrop passes, and not when it fails", () => {
    const onDrop = vi.fn();
    const canDrop = vi.fn((payload: { heroId: string }) => payload.heroId === "felix");
    render(<ArenaPanel occupants={[]} canDrop={canDrop} onDrop={onDrop} />);
    const arena = screen.getByRole("region", { name: "The Arena" });

    dropHero(arena, { side: "p1", heroId: "boreas" });
    expect(onDrop).not.toHaveBeenCalled();

    dropHero(arena, { side: "p1", heroId: "felix" });
    expect(onDrop).toHaveBeenCalledWith({ side: "p1", heroId: "felix" });
  });

  it("ignores a drop with no hero payload without asking canDrop", () => {
    const onDrop = vi.fn();
    const canDrop = vi.fn(() => true);
    render(<ArenaPanel occupants={[]} canDrop={canDrop} onDrop={onDrop} />);

    dropHero(screen.getByRole("region", { name: "The Arena" }));

    expect(canDrop).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });
});
