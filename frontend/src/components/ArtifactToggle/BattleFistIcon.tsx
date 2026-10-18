type BattleFistIconProps = {
  /** Rendered width and height in px: 12 on the ArtifactToggle, 13 in the
   * Map's team status panel (to match the token icons). */
  size: number;
};

/** Runika's Battle Fist (intent/17), as simplified line-art of the token's
 * art: a clenched gauntlet seen from the front, three knuckle bumps over a
 * rounded fist with the thumb on the left. The token's blue disk is left
 * out. Decorative only: the surrounding control carries the accessible
 * name. */
export function BattleFistIcon({ size }: BattleFistIconProps) {
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
      <path d="M4 7V5.5a1.25 1.25 0 0 1 2.5 0V7M6.5 6.5V4.25a1.25 1.25 0 0 1 2.5 0V6.5M9 6.5V4.75a1.25 1.25 0 0 1 2.5 0V7" />
      <path d="M11.5 7V6a1.25 1.25 0 0 1 2.5 0v3a4.5 4.5 0 0 1-4.5 4.5h-2A4 4 0 0 1 3.5 9.5V8a1.25 1.25 0 0 1 2.5 0v1" />
    </svg>
  );
}
