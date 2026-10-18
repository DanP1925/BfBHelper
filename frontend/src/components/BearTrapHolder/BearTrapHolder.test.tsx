import { fireEvent, render, screen } from "@testing-library/react";
import type { DragEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { isBearTrapDrag, isHeroDrag, isIceWallDrag } from "../../lib/map/dragPayload";
import {
  bearTrapDragTransfer,
  dropBearTrap,
  dropHero,
  dropIceWall,
  fakeDataTransfer,
  heroDragTransfer,
  iceWallDragTransfer,
} from "../../test/heroDrag";
import { BearTrapHolder } from "./BearTrapHolder";

const holder = () => screen.getByRole("region", { name: "Bear Trap" });

describe("BearTrapHolder", () => {
  it("shows the trap only while it holds it", () => {
    const { rerender } = render(<BearTrapHolder holdsTrap onDrop={() => {}} />);
    expect(screen.getByRole("img", { name: "Bear Trap" })).toBeInTheDocument();

    rerender(<BearTrapHolder holdsTrap={false} onDrop={() => {}} />);
    expect(screen.queryByRole("img", { name: "Bear Trap" })).toBeNull();
    expect(holder()).toBeInTheDocument();
  });

  it("takes the trap back on drop, and ignores a hero and the Ice Wall", () => {
    const onDrop = vi.fn();
    render(<BearTrapHolder holdsTrap={false} onDrop={onDrop} />);

    dropHero(holder(), { side: "p1", heroId: "boreas" });
    dropIceWall(holder(), { clientX: 0, clientY: 0 });
    expect(onDrop).not.toHaveBeenCalled();

    dropBearTrap(holder());
    expect(onDrop).toHaveBeenCalledTimes(1);
  });

  it("highlights only while the trap is dragged over it", () => {
    const { container } = render(<BearTrapHolder holdsTrap={false} onDrop={() => {}} />);

    fireEvent.dragEnter(holder(), { dataTransfer: heroDragTransfer() });
    fireEvent.dragEnter(holder(), { dataTransfer: iceWallDragTransfer() });
    expect(container.querySelector('[class*="boxDragOver"]')).toBeNull();

    fireEvent.dragEnter(holder(), { dataTransfer: bearTrapDragTransfer() });
    expect(container.querySelector('[class*="boxDragOver"]')).not.toBeNull();

    fireEvent.dragLeave(holder());
    expect(container.querySelector('[class*="boxDragOver"]')).toBeNull();
  });

  it("puts the trap's own drag type, not a hero's or the wall's, on a drag from the marker", () => {
    render(<BearTrapHolder holdsTrap onDrop={() => {}} />);
    const dataTransfer = fakeDataTransfer();

    fireEvent.dragStart(screen.getByRole("img", { name: "Bear Trap" }), { dataTransfer });

    const drag = { dataTransfer } as unknown as DragEvent;
    expect(isBearTrapDrag(drag)).toBe(true);
    expect(isHeroDrag(drag)).toBe(false);
    expect(isIceWallDrag(drag)).toBe(false);
  });
});
