type FavoredEnemyIconProps = {
  /** Rendered width and height in px: 12 on the TokenToggle, 14 in the
   * picker, 13 in the Map's team status panel (to match the other token
   * icons). */
  size: number;
};

/** Boreas's Favored Enemy token (intent/15), as simplified line-art: the
 * token's crosshair, a ring with four ticks crossing it and a dot in the
 * center. The token's black disk is left out. Shared by the Board's
 * TokenToggle and the Map's read-only token line. Decorative only: the
 * surrounding control carries the accessible name. */
export function FavoredEnemyIcon({ size }: FavoredEnemyIconProps) {
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
      <circle cx="8" cy="8" r="4.5" />
      <path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" />
      <circle cx="8" cy="8" r="0.75" fill="currentColor" />
    </svg>
  );
}
