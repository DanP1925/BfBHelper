type ShieldAmuletIconProps = {
  /** Rendered width and height in px: 12 on the ArtifactToggle, 13 in the
   * Map's team status panel (to match the token icons). */
  size: number;
};

/** Runika's Shield Amulet (intent/17), as simplified line-art of the
 * token's art: a winged medallion, a ring with a swept wing on each side
 * and a chain line on top. The token's blue disk is left out. Decorative
 * only: the surrounding control carries the accessible name. */
export function ShieldAmuletIcon({ size }: ShieldAmuletIconProps) {
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
      <circle cx="8" cy="9" r="2.5" />
      <path d="M5.5 9C4.25 7.25 2.75 6.5 1 6.5c.25 2.5 1.75 4.25 4.5 4.75M10.5 9c1.25-1.75 2.75-2.5 4.5-2.5-.25 2.5-1.75 4.25-4.5 4.75" />
      <path d="M8 2.5v4" />
    </svg>
  );
}
