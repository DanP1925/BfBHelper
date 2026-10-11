"use client";

import type { PlayerId } from "../../lib/draft/types";
import { otherPlayer } from "../../lib/draft/selectors";
import styles from "./InitiativeBadge.module.css";

type InitiativeBadgeProps = {
  holder: PlayerId;
  onPass: () => void;
};

const PLAYER_LABELS: Record<PlayerId, string> = { p1: "Player 1", p2: "Player 2" };

/** Shows who holds initiative, top right of both battle screens' shared
 * top bar (next to the OverflowMenu). The badge *is* the pass control
 * (intent/05) — no separate button — so it's styled as a button, with a
 * swap icon. Stateless: re-renders from `holder`; a wrong tap is undone
 * with a second tap. */
export function InitiativeBadge({ holder, onPass }: InitiativeBadgeProps) {
  const label = `Initiative: ${PLAYER_LABELS[holder]}. Pass to ${PLAYER_LABELS[otherPlayer(holder)]}.`;

  return (
    <button
      type="button"
      className={`${styles.badge} ${styles[holder]}`}
      aria-label={label}
      title={label}
      onClick={onPass}
    >
      <span className={styles.name}>{PLAYER_LABELS[holder]}</span>
      <svg
        className={styles.icon}
        aria-hidden="true"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 5h11M10 2l3 3-3 3" />
        <path d="M14 11H3M6 8l-3 3 3 3" />
      </svg>
    </button>
  );
}
