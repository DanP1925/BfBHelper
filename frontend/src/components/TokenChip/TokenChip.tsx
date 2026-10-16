"use client";

import { useId, useRef, type CSSProperties, type ReactNode } from "react";
import { useDismiss } from "../../lib/useDismiss";
import styles from "./TokenChip.module.css";

/** "2 +1 Attack tokens" / "1 +1 Attack token": the spoken count, shared by
 * the chip and the Map's read-only token line so the two never drift. */
export function tokenCountLabel(count: number, label: string): string {
  return `${count} ${label} ${count === 1 ? "token" : "tokens"}`;
}

/** "+1 Attack tokens": a counted token's tooltip, shared by the chip and the
 * Map's token line like tokenCountLabel. */
export function tokenTitle(label: string): string {
  return `${label} tokens`;
}

type TokenChipProps = {
  count: number;
  max: number;
  onChange: (next: number) => void;
  /** Decorative icon (e.g. `<AttackTokenIcon size={12} />`): the only visible
   * label, so it should be `aria-hidden`. */
  icon: ReactNode;
  /** The token's name for aria labels and the tooltip, e.g. "+1 Attack". */
  label: string;
  /** The token's color (e.g. `"var(--color-gold)"`) for the pill, icon and
   * focus ring (intent/11), like TokenToggle's. */
  accent: string;
  heroName: string;
  /** Owned by the parent, so only one chip on the screen is open at a time
   * (intent/06). */
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
};

/**
 * A compact counted-token control for a hero card (intent/06). It's a pill
 * with the icon and "×N"; tapping it slides in − / +. Since intent/09 the
 * card only renders it while the hero holds one or it's open (adding goes
 * through TokenPicker), so it stays at 0 while open and is gone once it
 * closes there. Taps on − / + leave it open, so adding three tokens is
 * three taps. Closes on a second tap of the icon, a click outside, or
 * Escape, like OverflowMenu. Generic on purpose, so later counted tokens
 * reuse it with their own icon and label. No count state of its own:
 * clamping lives in the reducer, and − / + are just disabled at the bounds.
 */
export function TokenChip({
  count,
  max,
  onChange,
  icon,
  label,
  accent,
  heroName,
  expanded,
  onExpandedChange,
}: TokenChipProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const controlsId = useId();

  useDismiss(expanded, () => onExpandedChange(false), containerRef, toggleRef);

  const toggleLabel = `${heroName}: ${tokenCountLabel(count, label)}. ${expanded ? "Hide" : "Show"} controls`;
  return (
    <div
      ref={containerRef}
      className={`${styles.chip} ${expanded ? styles.expanded : ""}`}
      style={{ "--token-accent": accent } as CSSProperties}
    >
      <button
        type="button"
        ref={toggleRef}
        className={styles.toggle}
        aria-expanded={expanded}
        aria-controls={controlsId}
        aria-label={toggleLabel}
        title={tokenTitle(label)}
        onClick={() => onExpandedChange(!expanded)}
      >
        {icon}
        <span className={styles.count}>×{count}</span>
      </button>
      {/* `inert` while collapsed backs up the CSS `visibility: hidden`: the
          zero-width buttons can't be tabbed to, clicked or read out. */}
      <span id={controlsId} className={styles.controls} inert={!expanded}>
        <button
          type="button"
          className={styles.step}
          aria-label={`Remove ${label} token from ${heroName}`}
          disabled={count <= 0}
          onClick={() => onChange(count - 1)}
        >
          −
        </button>
        <button
          type="button"
          className={styles.step}
          aria-label={`Add ${label} token to ${heroName}`}
          disabled={count >= max}
          onClick={() => onChange(count + 1)}
        >
          +
        </button>
      </span>
    </div>
  );
}
