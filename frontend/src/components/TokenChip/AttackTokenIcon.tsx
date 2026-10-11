type AttackTokenIconProps = {
  /** Rendered width and height in px: 12 on the TokenChip, 13 in the Map's
   * team status panel (to match its heart). */
  size: number;
};

/** The +1 Attack token's crossed swords (intent/06), drawn as simplified
 * line art like InitiativeBadge's swap icon. Shared by the Board's
 * TokenChip and the Map's read-only token line so it's drawn once.
 * Decorative only: the surrounding control carries the accessible name. */
export function AttackTokenIcon({ size }: AttackTokenIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 2.5l8.5 8.5M2.5 2.5h3M2.5 2.5v3" />
      <path d="M13.5 2.5L5 11M13.5 2.5h-3M13.5 2.5v3" />
      <path d="M9.5 12.5l3-3M11 11l2.5 2.5" />
      <path d="M6.5 12.5l-3-3M5 11l-2.5 2.5" />
    </svg>
  );
}
