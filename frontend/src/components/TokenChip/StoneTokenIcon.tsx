type StoneTokenIconProps = {
  /** Rendered width and height in px: 12 on the TokenChip, 14 in the
   * picker, 13 in the Map's team status panel (to match its heart). */
  size: number;
};

/** Sedusa's Stone token (intent/12), as simplified line-art: the rulebook
 * token's coiled snake, an oval head and an S-shaped body. The token's grey
 * stone disk and cracks are left out. Shared by the Board's TokenChip and
 * the Map's read-only token line. Decorative only: the surrounding control
 * carries the accessible name. */
export function StoneTokenIcon({ size }: StoneTokenIconProps) {
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
      <path d="M9.5 3.5a2 1.5 0 1 0 4 0a2 1.5 0 1 0-4 0z" />
      <path d="M10 4.75C7 5.25 4.5 6.5 5.5 8.5s6 .5 6.75 2.75S9 14.5 3.5 13.75" />
    </svg>
  );
}
