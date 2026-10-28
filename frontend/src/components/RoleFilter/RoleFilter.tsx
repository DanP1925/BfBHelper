"use client";

import { ROLE_FILTER_OPTIONS, type RoleFilterValue } from "../../lib/draft/roles";
import styles from "./RoleFilter.module.css";

type RoleFilterProps = {
  active: RoleFilterValue;
  /** Heroes left in each role (and "all"), shown beside each label. */
  counts: Record<RoleFilterValue, number>;
  onSelect: (role: RoleFilterValue) => void;
};

/** The draft pool's All / Damage / Utility / Support filter (intent/23).
 * Presentational: the screen owns which role is active. An option with
 * no heroes left is disabled, and clicking the active one is a no-op. */
export function RoleFilter({ active, counts, onSelect }: RoleFilterProps) {
  return (
    <div className={styles.filter} role="group" aria-label="Filter heroes by role">
      {ROLE_FILTER_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.option}
          aria-pressed={option.value === active}
          disabled={counts[option.value] === 0}
          onClick={() => {
            if (option.value !== active) onSelect(option.value);
          }}
        >
          {/* The space only reaches the accessible name ("Support 3"): a
              flex container drops whitespace-only text, and `gap` spaces them. */}
          <span className={styles.label}>{option.label}</span>{" "}
          <span className={styles.count}>{counts[option.value]}</span>
        </button>
      ))}
    </div>
  );
}
