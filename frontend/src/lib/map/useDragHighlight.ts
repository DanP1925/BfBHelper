"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";

/**
 * The drag-over highlight shared by the Map's drop targets
 * (`useHeroDropTarget`, `useMarkerDropTarget`), for one kind of drag:
 * only drags that `matches` light the target up or let it take a drop.
 *
 * `isDragOver` is tracked with an enter/leave counter rather than a plain
 * boolean: `dragenter`/`dragleave` fire again every time the pointer
 * crosses into or out of a child (a hero token), which a boolean would
 * misread as leaving the target and flicker the highlight off mid-hover.
 * `dragleave` needs no `matches` check: a drag that never counted leaves
 * the counter at 0, where it stays.
 */
export function useDragHighlight(matches: (event: DragEvent) => boolean) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);

  const highlightHandlers = {
    onDragEnter(event: DragEvent<HTMLElement>) {
      if (!matches(event)) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setIsDragOver(true);
    },
    onDragOver(event: DragEvent<HTMLElement>) {
      if (matches(event)) event.preventDefault();
    },
    onDragLeave() {
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDragOver(false);
    },
  };

  /** Called on drop: the drag is over, whatever it carried. */
  function endDrag() {
    dragDepthRef.current = 0;
    setIsDragOver(false);
  }

  return { isDragOver, highlightHandlers, endDrag };
}
