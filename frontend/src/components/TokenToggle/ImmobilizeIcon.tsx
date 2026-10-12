type ImmobilizeIconProps = {
  /** Rendered width and height in px: 12 on the TokenToggle, 13 in the Map's
   * team status panel (to match the other token icons). */
  size: number;
};

/** Immobilize's "held in place" sign (intent/08): a horizontal three-link
 * chain, two face-on oval links joined by a flat, edge-on middle link.
 * There's no rulebook token to draw from, so it follows the mockup. Shared
 * by the Board's TokenToggle and the Map's read-only token line. Decorative
 * only: the surrounding control carries the accessible name. */
export function ImmobilizeIcon({ size }: ImmobilizeIconProps) {
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
      <rect x="0.75" y="5.25" width="6.5" height="5.5" rx="2.75" />
      <rect x="8.75" y="5.25" width="6.5" height="5.5" rx="2.75" />
      <rect x="5" y="7" width="6" height="2" rx="1" />
    </svg>
  );
}
