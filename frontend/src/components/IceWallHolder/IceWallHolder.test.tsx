import { fireEvent, render, screen } from "@testing-library/react";
import type { DragEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { isHeroDrag, isIceWallDrag } from "../../lib/map/dragPayload";
import {
  dropHero,
  dropIceWall,
  fakeDataTransfer,
  heroDragTransfer,
  iceWallDragTransfer,
} from "../../test/heroDrag";
import { IceWallHolder } from "./IceWallHolder";

const holder = () => screen.getByRole("region", { name: "Ice Wall" });

describe("IceWallHolder", () => {
  it("shows the wall only while it holds it", () => {
    const { rerender } = render(<IceWallHolder holdsWall onDrop={() => {}} />);
    expect(screen.getByRole("img", { name: "Ice Wall" })).toBeInTheDocument();

    rerender(<IceWallHolder holdsWall={false} onDrop={() => {}} />);
    expect(screen.queryByRole("img", { name: "Ice Wall" })).toBeNull();
    expect(holder()).toBeInTheDocument();
  });

  it("takes the wall back on drop, and ignores a hero", () => {
    const onDrop = vi.fn();
    render(<IceWallHolder holdsWall={false} onDrop={onDrop} />);

    dropHero(holder(), { side: "p1", heroId: "dazeem" });
    expect(onDrop).not.toHaveBeenCalled();

    dropIceWall(holder(), { clientX: 0, clientY: 0 });
    expect(onDrop).toHaveBeenCalledTimes(1);
  });

  it("highlights only while the wall is dragged over it", () => {
    const { container } = render(<IceWallHolder holdsWall={false} onDrop={() => {}} />);

    fireEvent.dragEnter(holder(), { dataTransfer: heroDragTransfer() });
    expect(container.querySelector('[class*="boxDragOver"]')).toBeNull();

    fireEvent.dragEnter(holder(), { dataTransfer: iceWallDragTransfer() });
    expect(container.querySelector('[class*="boxDragOver"]')).not.toBeNull();

    fireEvent.dragLeave(holder());
    expect(container.querySelector('[class*="boxDragOver"]')).toBeNull();
  });

  it("puts the wall's own drag type, not a hero's, on a drag from the marker", () => {
    render(<IceWallHolder holdsWall onDrop={() => {}} />);
    const dataTransfer = fakeDataTransfer();

    fireEvent.dragStart(screen.getByRole("img", { name: "Ice Wall" }), { dataTransfer });

    const drag = { dataTransfer } as unknown as DragEvent;
    expect(isIceWallDrag(drag)).toBe(true);
    expect(isHeroDrag(drag)).toBe(false);
  });
});
