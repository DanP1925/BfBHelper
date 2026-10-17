"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { parseHeroDragPayload, type HeroDragPayload } from "./dragPayload";

/**
 * The native-HTML5-drag-and-drop side of a hero drop target (`MapSpace`,
 * `RespawnAreaStrip`, `ArenaPanel`): spread `dropHandlers` on the target
 * element and style it by `isDragOver`.
 *
 * `isDragOver` is tracked with an enter/leave counter rather than a plain
 * boolean: `dragenter`/`dragleave` fire again every time the pointer
 * crosses into or out of a child (a hero token), which a boolean would
 * misread as leaving the target and flicker the highlight off mid-hover.
 * It means "a drop could land here," not "this drop is valid": browsers
 * hide a drag's payload until `drop`, so `accept` can only run then. A
 * malformed or foreign payload, or one `accept` refuses, is silently
 * ignored.
 */
export function useHeroDropTarget(
  onDrop: (payload: HeroDragPayload) => void,
  accept: (payload: HeroDragPayload) => boolean = () => true,
) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);

  const dropHandlers = {
    onDragEnter(event: DragEvent<HTMLElement>) {
      event.preventDefault();
      dragDepthRef.current += 1;
      setIsDragOver(true);
    },
    onDragOver(event: DragEvent<HTMLElement>) {
      event.preventDefault();
    },
    onDragLeave() {
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDragOver(false);
    },
    onDrop(event: DragEvent<HTMLElement>) {
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDragOver(false);
      const payload = parseHeroDragPayload(event);
      if (payload === null || !accept(payload)) return;
      onDrop(payload);
    },
  };

  return { isDragOver, dropHandlers };
}
