import styles from "./RoundBadge.module.css";

type RoundBadgeProps = {
  round: number;
};

/** The current round, in the middle of both battle screens' shared top bar
 * (intent/21). Read-only: the round only changes through PhaseControl's
 * steps, so this is a plain element with no buttons. A new round is
 * announced politely to screen readers. */
export function RoundBadge({ round }: RoundBadgeProps) {
  return (
    <div className={styles.badge} aria-live="polite">
      <span className={styles.label}>Round</span>
      <span className={styles.value}>{round}</span>
    </div>
  );
}
