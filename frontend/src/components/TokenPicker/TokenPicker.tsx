"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useDismiss } from "../../lib/useDismiss";
import styles from "./TokenPicker.module.css";

/** One row in the picker: a token this hero can take right now. */
export type TokenPickerOption = {
  key: string;
  /** Decorative 14px icon, drawn in `accent`. */
  icon: ReactNode;
  /** The token's name, e.g. "+1 Attack" or "Confuse". */
  label: string;
  /** The token's color (e.g. `"var(--color-confuse)"`), for the row's icon. */
  accent: string;
  /** How many the hero already holds, for counted tokens ("×2"). */
  count?: number;
  /** A counted token at its ceiling. */
  disabled?: boolean;
  onPick: () => void;
};

type TokenPickerProps = {
  heroName: string;
  options: TokenPickerOption[];
  /** Owned by the parent, so only one picker or chip on the Board is open at
   * a time (intent/06, intent/09). */
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
};

/** Space between the "+" and the popover, and the popover and the viewport
 * edge. */
const GAP = 4;
const VIEWPORT_MARGIN = 8;

/**
 * The always-visible "+" at the end of a hero card's token row and the
 * popover it opens (intent/09). Picking a row calls its `onPick` and leaves
 * the popover open, so three +1 Attack tokens are one open and three taps.
 * Closes on a tap outside, a second tap of "+", or Escape (focus back on
 * "+"), like TokenChip. Generic: it knows nothing about which tokens exist.
 *
 * The popover is `position: fixed`, so the card's `overflow: hidden` can't
 * clip it and it never grows the Board's scroll area. It's placed from the
 * "+" when it opens (below it, or above when there's no room) and closes on
 * scroll or resize instead of following the button.
 */
export function TokenPicker({ heroName, options, expanded, onExpandedChange }: TokenPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useDismiss(expanded, () => onExpandedChange(false), containerRef, buttonRef);

  // Placed straight on the DOM node before paint, so there's no frame at the
  // wrong spot and no state to sync. Anchored by `bottom` when flipped, so
  // the popover stays against the "+" as on/off rows drop out of it.
  useLayoutEffect(() => {
    const button = buttonRef.current;
    const popover = popoverRef.current;
    if (!expanded || !button || !popover) return;

    const anchor = button.getBoundingClientRect();
    const { width, height } = popover.getBoundingClientRect();
    const fitsBelow = anchor.bottom + GAP + height <= window.innerHeight - VIEWPORT_MARGIN;
    const maxLeft = window.innerWidth - VIEWPORT_MARGIN - width;

    popover.style.left = `${Math.max(VIEWPORT_MARGIN, Math.min(anchor.left, maxLeft))}px`;
    if (fitsBelow) {
      popover.style.top = `${anchor.bottom + GAP}px`;
      popover.style.bottom = "";
    } else {
      popover.style.top = "";
      popover.style.bottom = `${window.innerHeight - anchor.top + GAP}px`;
    }
  }, [expanded]);

  // Read through a ref, like useDismiss, so the parent's inline callback
  // doesn't re-attach these listeners on every pick while the picker is open.
  const onExpandedChangeRef = useRef(onExpandedChange);
  useEffect(() => {
    onExpandedChangeRef.current = onExpandedChange;
  });

  useEffect(() => {
    if (!expanded) return;
    const close = () => onExpandedChangeRef.current(false);
    // Capture, so a scroll of the Board's own scroll area counts too.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [expanded]);

  const groupLabel = `Add a token to ${heroName}`;

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        type="button"
        ref={buttonRef}
        className={styles.add}
        aria-expanded={expanded}
        aria-haspopup="true"
        aria-label={groupLabel}
        title="Add a token"
        onClick={() => onExpandedChange(!expanded)}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M8 3.5v9M3.5 8h9" />
        </svg>
      </button>
      {expanded && (
        <div ref={popoverRef} className={styles.popover} role="group" aria-label={groupLabel}>
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              className={styles.option}
              aria-label={
                option.count ? `Add ${option.label}, ${option.count} held` : `Add ${option.label}`
              }
              disabled={option.disabled}
              onClick={option.onPick}
            >
              <span
                className={styles.optionIcon}
                style={{ "--token-accent": option.accent } as CSSProperties}
              >
                {option.icon}
              </span>
              <span>{option.label}</span>
              {option.count ? <span className={styles.optionCount}>×{option.count}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
