type DeathMarkIconProps = {
  /** Rendered width and height in px: 12 on the TokenToggle, 13 in the Map's
   * team status panel (to match the other token icons). */
  size: number;
};

/** Kunoichi's Death Mark token (intent/09), as simplified line-art: the
 * token's dagger on the diagonal, blade up and right, a short crossguard,
 * the handle down to the lower left, and a single drop under the tip. The
 * token's red splatter rim is left out. It's the same dagger as on her hero
 * card, so it reads as hers. Shared by the Board's TokenToggle and the Map's
 * read-only token line. Decorative only: the surrounding control carries the
 * accessible name. */
export function DeathMarkIcon({ size }: DeathMarkIconProps) {
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
      <path d="M13.5 2.5l-.9 2.9-5.2 5.2-2-2 5.2-5.2z" />
      <path d="M4.2 7.8l4 4" />
      <path d="M6.2 9.8l-3.7 3.7" />
      <path d="M13.3 8.2c.6.9.9 1.4.9 1.9a.9.9 0 0 1-1.8 0c0-.5.3-1 .9-1.9z" />
    </svg>
  );
}
