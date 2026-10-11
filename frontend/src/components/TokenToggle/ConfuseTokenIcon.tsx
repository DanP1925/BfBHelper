type ConfuseTokenIconProps = {
  /** Rendered width and height in px: 12 on the TokenToggle, 13 in the Map's
   * team status panel (to match the +1 Attack swords). */
  size: number;
};

/** The Confuse token's "?" ringed by sparkles (intent/07), drawn as
 * simplified line art like AttackTokenIcon. Shared by the Board's
 * TokenToggle and the Map's read-only token line so it's drawn once.
 * Decorative only: the surrounding control carries the accessible name. */
export function ConfuseTokenIcon({ size }: ConfuseTokenIconProps) {
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
      <path d="M6.2 6.2a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1V10" />
      <path d="M8 12.6v.1" />
      <path d="M2.5 2v3M1 3.5h3" />
      <path d="M13 1.8v2.4M11.8 3h2.4" />
      <path d="M12.8 11.2v2.4M11.6 12.4h2.4" />
    </svg>
  );
}
