import type { DragEvent } from "react";
import type { HeroId, PlayerId } from "../draft/types";

/** The custom MIME type native HTML5 drag-and-drop carries this payload
 * under — distinct from "text/plain" so an accidental drop of real text
 * (or from outside the app) can't be misread as a hero move. */
const HERO_DRAG_MIME_TYPE = "application/x-bfbhelper-hero";

export type HeroDragPayload = { side: PlayerId; heroId: HeroId };

/** Called from a `MapToken`'s `onDragStart`. */
export function serializeHeroDragPayload(event: DragEvent, payload: HeroDragPayload): void {
  event.dataTransfer.setData(HERO_DRAG_MIME_TYPE, JSON.stringify(payload));
  event.dataTransfer.effectAllowed = "move";
}

/** Called from a drop target's `onDrop`. Never throws — a malformed,
 * missing, or foreign (non-hero) payload returns `null` rather than
 * propagating a parse error into UI code. */
export function parseHeroDragPayload(event: DragEvent): HeroDragPayload | null {
  const raw = event.dataTransfer.getData(HERO_DRAG_MIME_TYPE);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;
  if (candidate.side !== "p1" && candidate.side !== "p2") return null;
  if (typeof candidate.heroId !== "string" || candidate.heroId.length === 0) return null;

  return { side: candidate.side, heroId: candidate.heroId as HeroId };
}

/** Dazeem's Ice Wall (intent/16) travels under its own MIME type, so hero
 * drop targets never take it and the wall's drop targets never take a
 * hero. */
const ICE_WALL_DRAG_MIME_TYPE = "application/x-bfbhelper-ice-wall";

/** Called from `IceWallMarker`'s `onDragStart`. Carries no data: there's
 * only one wall, and where it lands is the drop's own cursor position. */
export function serializeIceWallDrag(event: DragEvent): void {
  event.dataTransfer.setData(ICE_WALL_DRAG_MIME_TYPE, "1");
  event.dataTransfer.effectAllowed = "move";
}

/** Whether a drag carries `mimeType`. Unlike its data, a drag's MIME
 * *types* are readable during dragenter/dragover, not just on drop. */
function carries(event: DragEvent, mimeType: string): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes(mimeType);
}

/** Whether a drag is the Ice Wall. Works during the whole drag. */
export function isIceWallDrag(event: DragEvent): boolean {
  return carries(event, ICE_WALL_DRAG_MIME_TYPE);
}

/** Whether a drag is a hero token. Works during the whole drag; the
 * payload itself is still only readable on drop (parseHeroDragPayload). */
export function isHeroDrag(event: DragEvent): boolean {
  return carries(event, HERO_DRAG_MIME_TYPE);
}
