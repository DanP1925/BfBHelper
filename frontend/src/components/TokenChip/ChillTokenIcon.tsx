type ChillTokenIconProps = {
  /** Rendered width and height in px: 12 on the TokenChip, 14 in the
   * picker, 13 in the Map's team status panel (to match its heart). */
  size: number;
};

/** Dazeem's Chill token (intent/13), as simplified line-art: the rulebook
 * token's snowflake, three crossing strokes with a small V near each tip.
 * The token's blue disk is left out. Shared by the Board's TokenChip and
 * the Map's read-only token line. Decorative only: the surrounding control
 * carries the accessible name. */
export function ChillTokenIcon({ size }: ChillTokenIconProps) {
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
      <path d="M8 2v12M2.8 5l10.4 6M2.8 11l10.4-6" />
      <path d="M9.6 2.8L8 4.4L6.4 2.8M4.3 4.01L4.88 6.2L2.7 6.79M2.7 9.21L4.88 9.8L4.3 11.99M6.4 13.2L8 11.6L9.6 13.2M11.7 11.99L11.12 9.8L13.3 9.21M13.3 6.79L11.12 6.2L11.7 4.01" />
    </svg>
  );
}
