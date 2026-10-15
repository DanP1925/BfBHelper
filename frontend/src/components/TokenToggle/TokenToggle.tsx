import type { CSSProperties, ReactNode } from "react";
import styles from "./TokenToggle.module.css";

type TokenToggleProps = {
  on: boolean;
  onChange: (next: boolean) => void;
  /** Decorative icon (e.g. `<ConfuseTokenIcon size={12} />`): the only
   * visible label, so it should be `aria-hidden`. */
  icon: ReactNode;
  /** The full name, used verbatim as the tooltip and in the aria label
   * (`${label} on ${heroName}`), e.g. "Confuse token" or "Immobilized". */
  label: string;
  heroName: string;
  /** The lit color, any CSS color (e.g. `"var(--color-confuse)"`). */
  accent: string;
};

/**
 * A one-tap on/off token control for a hero card (intent/07), the
 * counterpart of TokenChip for tokens that don't stack: a lit pill in
 * `accent`. Since intent/09 the card only renders it while the token is
 * held (adding goes through TokenPicker), so a tap removes it.
 * `aria-pressed` carries the state, so the label stays fixed. Generic on
 * purpose: each on/off token passes its own icon, label and accent. No
 * state of its own.
 */
export function TokenToggle({ on, onChange, icon, label, heroName, accent }: TokenToggleProps) {
  return (
    <button
      type="button"
      className={styles.toggle}
      style={{ "--token-accent": accent } as CSSProperties}
      aria-pressed={on}
      aria-label={`${label} on ${heroName}`}
      title={`${label} (tap to remove)`}
      onClick={() => onChange(!on)}
    >
      {icon}
    </button>
  );
}
