"use client";

import type { DragEvent } from "react";
import { isHeroDrag, parseHeroDragPayload, type HeroDragPayload } from "./dragPayload";
import { useDragHighlight } from "./useDragHighlight";

/**
 * The native-HTML5-drag-and-drop side of a hero drop target (`MapSpace`,
 * `RespawnAreaStrip`, `ArenaPanel`): spread `dropHandlers` on the target
 * element and style it by `isDragOver`.
 *
 * Only hero drags highlight it (`useDragHighlight`), so dragging the Ice
 * Wall across the board doesn't light up every space it passes. The
 * highlight means "a drop could land here," not "this drop is valid":
 * browsers hide a drag's payload until `drop`, so `accept` can only run
 * then. A malformed or foreign payload, or one `accept` refuses, is
 * silently ignored. Nothing here stops propagation, so a wall dropped on
 * a space still reaches the board around it.
 */
export function useHeroDropTarget(
  onDrop: (payload: HeroDragPayload) => void,
  accept: (payload: HeroDragPayload) => boolean = () => true,
) {
  const { isDragOver, highlightHandlers, endDrag } = useDragHighlight(isHeroDrag);

  const dropHandlers = {
    ...highlightHandlers,
    onDrop(event: DragEvent<HTMLElement>) {
      event.preventDefault();
      endDrag();
      const payload = parseHeroDragPayload(event);
      if (payload === null || !accept(payload)) return;
      onDrop(payload);
    },
  };

  return { isDragOver, dropHandlers };
}
