import { NumberStepper } from "../NumberStepper/NumberStepper";
import styles from "./StructureSlot.module.css";

type StructureSlotProps = {
  /** Short label, e.g. "Top", "Middle", "Bottom", "Bit" — "Structures" is
   * already established by the section heading above these slots. */
  label: string;
  /** The owning team's label (e.g. "Player 1") — qualifies this slot's
   * stepper aria-label only (not the visible `label`), since both sides
   * render an identically-labeled "Bit"/"Top"/etc. slot and would
   * otherwise share one indistinguishable accessible name. */
  teamLabel: string;
  hp: number;
  icon: string;
  /** Side accent color for the border, e.g. "var(--color-p1)" — used for
   * the Bit slot per the mockup, to call out the team's most vulnerable
   * structure. Defaults to the ordinary border color. */
  accent?: string;
  /** Renders a `NumberStepper` in place of the plain "{hp} HP" text when
   * provided (the Battle Board). Always passed together with `max`. */
  onHpChange?: (value: number) => void;
  /** Ceiling for the stepper — this structure's own starting HP. */
  max?: number;
  /** Adds "destroyed" styling at `hp === 0` (intent/03) — passed for the
   * 3 Tower slots only, not the Bit, since the Bit's zero-HP state drives
   * the win condition rather than a cosmetic style of its own. */
  reactiveStyling?: boolean;
};

export function StructureSlot({
  label,
  teamLabel,
  hp,
  icon,
  accent,
  onHpChange,
  max,
  reactiveStyling,
}: StructureSlotProps) {
  const isDestroyed = reactiveStyling && hp === 0;

  return (
    <div
      className={styles.slot}
      style={accent ? { borderColor: accent } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
      <img
        src={icon}
        alt={label}
        className={isDestroyed ? `${styles.icon} ${styles.iconDestroyed}` : styles.icon}
      />
      <div className={styles.label}>{label}</div>
      {onHpChange ? (
        <NumberStepper
          value={hp}
          min={0}
          max={max}
          onChange={onHpChange}
          label={`${teamLabel} ${label} HP`}
        />
      ) : (
        <div className={styles.hp}>{hp} HP</div>
      )}
    </div>
  );
}
