type ShieldTokenIconProps = {
  /** Rendered width and height in px: 12 on the TokenChip, 14 in the
   * picker, 13 in the Map's team status panel (to match its heart). */
  size: number;
};

/** Cyrus's Shield token (intent/11), as simplified line-art: the rulebook
 * token's heater shield with a small diamond for the emblem in its center.
 * The token's blue rim is left out. Shared by the Board's TokenChip and the
 * Map's read-only token line. Decorative only: the surrounding control
 * carries the accessible name. */
export function ShieldTokenIcon({ size }: ShieldTokenIconProps) {
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
      <path d="M8 1.75l5.25 2v4c0 3.2-2.3 5.4-5.25 6.5-2.95-1.1-5.25-3.3-5.25-6.5v-4z" />
      <path d="M8 5.25l1.75 2.5L8 10.25l-1.75-2.5z" />
    </svg>
  );
}
