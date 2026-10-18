"use client";

import type { DragEvent } from "react";
import { useDragHighlight } from "./useDragHighlight";

/**
 * The native-HTML5-drag-and-drop side of a drop target for one of the
 * Map's single markers: Dazeem's Ice Wall (intent/16: the board and
 * `IceWallHolder`) or Boreas's Bear Trap (intent/18: each `MapSpace` and
 * `BearTrapHolder`). `matches` names the marker's drag kind
 * (`isIceWallDrag`, `isBearTrapDrag`). Spread `dropHandlers` on the target
 * element and style it by `isDragOver`. Only that marker highlights it or
 * drops on it; any other drag passes through untouched.
 *
 * `onDrop` gets the drop event itself, since the board turns the cursor's
 * position into the wall's spot on the art.
 */
export function useMarkerDropTarget(
  matches: (event: DragEvent) => boolean,
  onDrop: (event: DragEvent<HTMLElement>) => void,
) {
  const { isDragOver, highlightHandlers, endDrag } = useDragHighlight(matches);

  const dropHandlers = {
    ...highlightHandlers,
    onDrop(event: DragEvent<HTMLElement>) {
      if (!matches(event)) return;
      event.preventDefault();
      endDrag();
      onDrop(event);
    },
  };

  return { isDragOver, dropHandlers };
}
