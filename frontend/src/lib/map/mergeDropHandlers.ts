import type { DragEvent } from "react";

type DropHandlers = {
  onDragEnter(event: DragEvent<HTMLElement>): void;
  onDragOver(event: DragEvent<HTMLElement>): void;
  onDragLeave(event: DragEvent<HTMLElement>): void;
  onDrop(event: DragEvent<HTMLElement>): void;
};

/** One set of drop handlers that calls both `a`'s and `b`'s, for an element
 * that takes two kinds of drag (a `MapSpace` takes heroes and the Bear
 * Trap, intent/18). Safe because each hook ignores the other's drag kind:
 * `useHeroDropTarget` finds no hero payload in a trap drag, and
 * `useMarkerDropTarget` returns early for anything but its own marker. */
export function mergeDropHandlers(a: DropHandlers, b: DropHandlers): DropHandlers {
  return {
    onDragEnter(event) {
      a.onDragEnter(event);
      b.onDragEnter(event);
    },
    onDragOver(event) {
      a.onDragOver(event);
      b.onDragOver(event);
    },
    onDragLeave(event) {
      a.onDragLeave(event);
      b.onDragLeave(event);
    },
    onDrop(event) {
      a.onDrop(event);
      b.onDrop(event);
    },
  };
}
