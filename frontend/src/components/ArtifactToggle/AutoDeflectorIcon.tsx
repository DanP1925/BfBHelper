type AutoDeflectorIconProps = {
  /** Rendered width and height in px: 12 on the ArtifactToggle, 13 in the
   * Map's team status panel (to match the token icons). */
  size: number;
};

/** Runika's Auto Deflector (intent/17), as simplified line-art of the
 * token's art: its gem orb on a stand, with three short spark ticks above.
 * The token's blue disk is left out. Decorative only: the surrounding
 * control carries the accessible name. */
export function AutoDeflectorIcon({ size }: AutoDeflectorIconProps) {
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
      <circle cx="8" cy="6.25" r="3" />
      <path d="M5.75 10.5h4.5l1 3.25h-6.5z" />
      <path d="M8 9.25v1.25M2.5 3.5l1.25.75M13.5 3.5l-1.25.75" />
    </svg>
  );
}
