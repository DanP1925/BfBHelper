import styles from "./StructureSlot.module.css";

type StructureSlotProps = {
  /** Short label, e.g. "Top", "Middle", "Bottom", "Bit" — "Structures" is
   * already established by the section heading above these slots. */
  label: string;
  hp: number;
  icon: string;
  /** Side accent color for the border, e.g. "var(--color-p1)" — used for
   * the Bit slot per the mockup, to call out the team's most vulnerable
   * structure. Defaults to the ordinary border color. */
  accent?: string;
};

export function StructureSlot({ label, hp, icon, accent }: StructureSlotProps) {
  return (
    <div
      className={styles.slot}
      style={accent ? { borderColor: accent } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export has no Image Optimization API, see next.config.ts */}
      <img src={icon} alt={label} className={styles.icon} />
      <div className={styles.label}>{label}</div>
      <div className={styles.hp}>{hp} HP</div>
    </div>
  );
}
