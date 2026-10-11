"use client";

import { useRef, useState } from "react";
import { useDismiss } from "../../lib/useDismiss";
import styles from "./OverflowMenu.module.css";

export type OverflowMenuItem = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
};

type OverflowMenuProps = {
  /** Generic — this component has no knowledge of what any item does. */
  items: OverflowMenuItem[];
};

/**
 * A small "..." trigger that opens a short dropdown of actions. Closes on
 * Escape, a click outside, or selecting an item — and closes itself
 * *before* calling that item's `onSelect`, so anything the selection
 * opens (e.g. a confirm dialog) isn't stacked under the still-closing
 * menu.
 */
export function OverflowMenu({ items }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useDismiss(open, () => setOpen(false), containerRef, triggerRef);

  function selectItem(item: OverflowMenuItem) {
    setOpen(false);
    item.onSelect();
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        onClick={() => setOpen((prev) => !prev)}
      >
        ⋯
      </button>
      {open && (
        <div className={styles.dropdown} role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={styles.item}
              disabled={item.disabled}
              onClick={() => selectItem(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
