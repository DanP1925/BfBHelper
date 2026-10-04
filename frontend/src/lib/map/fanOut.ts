/**
 * The footprint spacing is solved for is **not** just the 46px ring
 * (`MapToken.module.css`'s `.ring`) — each token's name label renders
 * below its ring and is noticeably wider than it (e.g. "Agatha Trunch"),
 * so solving purely for ring-to-ring clearance still let adjacent labels
 * overlap once actually rendered. This is sized for the widest realistic
 * label instead, with the two kept in sync manually (not worth a shared
 * constant for numbers that are really about token/label art, not a
 * generic layout concern).
 */
const TOKEN_FOOTPRINT_PX = 68;
/** >1 so adjacent footprints get a visible gap, not just touch edge-to-edge. */
const SPACING_FACTOR = 1.03;

/**
 * Visual-only offset for the N-th of `total` tokens sharing one map
 * space — a ring centered on the node rather than a line, so it holds up
 * the same way whether it's a same-team stack (a full team retreated to
 * its own Bit after a wipe) or a cross-team pair/group sharing a gold
 * node. No state, no cap on `total` — purely a render-time layout.
 *
 * The radius isn't a flat constant: it's solved so that any two adjacent
 * tokens around the ring stay `SPACING_FACTOR` ring-diameters apart no
 * matter how many share the space (radius = (diameter * spacing) / (2 *
 * sin(π / total))) — a fixed small radius visibly overlapped as few as 3
 * tokens once actually rendered against real 46px token art.
 */
export function fanOffset(index: number, total: number): { dx: number; dy: number } {
  if (total <= 1) return { dx: 0, dy: 0 };

  const radius = (TOKEN_FOOTPRINT_PX * SPACING_FACTOR) / (2 * Math.sin(Math.PI / total));
  // Rotated so no token ever lands exactly "straight up" (angle -π/2): a
  // token's name label always renders below its own ring (MapToken.tsx),
  // so a token placed directly above the node's center would have that
  // label land right on top of the node's center — exactly where a
  // gold-pile marker, always rendered topmost, also sits. Shifting the
  // whole ring by +π/total keeps every label clear of that spot (a token
  // can still land straight *down*, whose label points further away from
  // center, which is never a problem).
  const angle = (2 * Math.PI * index) / total - Math.PI / 2 + Math.PI / total;
  return { dx: radius * Math.cos(angle), dy: radius * Math.sin(angle) };
}
