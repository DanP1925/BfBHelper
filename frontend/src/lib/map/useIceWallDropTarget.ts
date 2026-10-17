"use client";

import type { DragEvent } from "react";
import { isIceWallDrag } from "./dragPayload";
import { useDragHighlight } from "./useDragHighlight";

/**
 * The native-HTML5-drag-and-drop side of an Ice Wall drop target
 * (intent/16: the board and `IceWallHolder`): spread `dropHandlers` on the
 * target element and style it by `isDragOver`. Only the wall highlights it
 * or drops on it; a hero drag passes through untouched.
 *
 * `onDrop` gets the drop event itself, since the board turns the cursor's
 * position into the wall's spot on the art.
 */
export function useIceWallDropTarget(onDrop: (event: DragEvent<HTMLElement>) => void) {
  const { isDragOver, highlightHandlers, endDrag } = useDragHighlight(isIceWallDrag);

  const dropHandlers = {
    ...highlightHandlers,
    onDrop(event: DragEvent<HTMLElement>) {
      if (!isIceWallDrag(event)) return;
      event.preventDefault();
      endDrag();
      onDrop(event);
    },
  };

  return { isDragOver, dropHandlers };
}
