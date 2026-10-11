"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Closes a popover-style control (OverflowMenu's dropdown, TokenChip's
 * − / +) on a mousedown outside `containerRef` or on Escape, which also
 * returns focus to `triggerRef`. Listeners are attached only while `open`.
 * `onClose` is read through a ref, so callers can pass an inline arrow
 * without the listeners being re-attached on every render.
 */
export function useDismiss(
  open: boolean,
  onClose: () => void,
  containerRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onCloseRef.current();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, containerRef, triggerRef]);
}
