"use client";

import styles from "./ViewToggle.module.css";

/** The two screens this toggle switches between — a subset of the
 * broader `View` type (`lib/persistence/schema.ts`), which also includes
 * `"results"`/`"win"` that this control never targets. */
export type BattleView = "battle" | "map";

type ViewToggleProps = {
  active: BattleView;
  onSwitchView: (target: BattleView) => void;
};

const OPTIONS: Array<{ value: BattleView; label: string }> = [
  { value: "battle", label: "Board" },
  { value: "map", label: "Map" },
];

/** A small two-option Board/Map control, placed next to the OverflowMenu
 * (not inside it) on both BattleBoardScreen and BattleMapScreen — a core,
 * frequently-used action rather than an exceptional one. Clicking the
 * already-active option is a no-op. */
export function ViewToggle({ active, onSwitchView }: ViewToggleProps) {
  return (
    <div className={styles.toggle} role="group" aria-label="Switch screen">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.option}
          aria-pressed={option.value === active}
          disabled={option.value === active}
          onClick={() => onSwitchView(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
