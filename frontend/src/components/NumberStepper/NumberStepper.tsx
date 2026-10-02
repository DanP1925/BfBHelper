"use client";

import { useState } from "react";
import styles from "./NumberStepper.module.css";

type NumberStepperProps = {
  value: number;
  min: number;
  /** No ceiling when omitted (e.g. gold) — the "+" button is then never disabled. */
  max?: number;
  onChange: (next: number) => void;
  /** Used to build this control's aria-labels, e.g. "Gold", "Boreas HP". */
  label: string;
};

// Deliberately local rather than importing lib/battle/bounds's `clamp` —
// this component is domain-agnostic (no lib/battle/draft/useBattle
// imports), so it owns its own tiny clamp instead of depending on a
// battle-specific module. Mirrors that function's NaN-falls-back-to-min
// contract so the two can't silently diverge in practice.
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * The one control every editable battle value (gold, hero HP/level,
 * structure HP) is built from: a "-" button, a numeric input that's
 * always directly editable, and a "+" button. The input never blocks a
 * keystroke — a value is only clamped (and rounded to the nearest
 * integer) once it's committed (blur/Enter), so typing e.g. "99" into a
 * max-15 field settles at 15, and "7.5" settles at 8, instead of either
 * being silently rejected mid-keystroke.
 */
export function NumberStepper({ value, min, max, onChange, label }: NumberStepperProps) {
  const [draftText, setDraftText] = useState(String(value));
  // Tracks the `value` the text buffer was last synced to, so a prop
  // change (a step or a committed edit, both resolved by the parent) can
  // be reflected into the buffer during render — React's documented
  // pattern for adjusting state from a changed prop, which avoids an
  // extra render pass versus doing the same sync in an effect.
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraftText(String(value));
  }

  function commit() {
    const trimmed = draftText.trim();
    const parsed = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(parsed)) {
      setDraftText(String(value));
      return;
    }

    const next = clamp(Math.round(parsed), min, max ?? Infinity);
    if (next !== value) {
      onChange(next);
    } else {
      setDraftText(String(value));
    }
  }

  function step(delta: number) {
    const next = clamp(value + delta, min, max ?? Infinity);
    if (next !== value) {
      onChange(next);
    }
  }

  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.button}
        onClick={() => step(-1)}
        disabled={atMin}
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <input
        type="number"
        className={styles.input}
        value={draftText}
        min={min}
        max={max}
        step={1}
        onChange={(event) => setDraftText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        aria-label={label}
      />
      <button
        type="button"
        className={styles.button}
        onClick={() => step(1)}
        disabled={atMax}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}
