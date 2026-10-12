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
 * counterpart of TokenChip for tokens that don't stack. Muted icon when
 * off, a lit pill in `accent` when on. `aria-pressed` carries the state,
 * so the label stays fixed. Generic on purpose, so Immobilize reuses it
 * with its own icon, label and accent. No state of its own.
 */
export function TokenToggle({ on, onChange, icon, label, heroName, accent }: TokenToggleProps) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${on ? styles.on : ""}`}
      style={{ "--token-accent": accent } as CSSProperties}
      aria-pressed={on}
      aria-label={`${label} on ${heroName}`}
      title={label}
      onClick={() => onChange(!on)}
    >
      {icon}
    </button>
  );
}
