import { createEvent, fireEvent } from "@testing-library/react";
import type { DragEvent } from "react";
import {
  serializeBearTrapDrag,
  serializeHeroDragPayload,
  serializeIceWallDrag,
  type HeroDragPayload,
} from "../lib/map/dragPayload";

/** jsdom's DataTransfer doesn't implement getData/setData, so drop targets
 * get this minimal stand-in, which backs both. `types` lists what was set,
 * as a real drag exposes during dragenter/dragover. */
export function fakeDataTransfer() {
  const store = new Map<string, string>();
  return {
    setData: (type: string, value: string) => store.set(type, value),
    getData: (type: string) => store.get(type) ?? "",
    get types() {
      return Array.from(store.keys());
    },
    effectAllowed: "",
  };
}

/** A transfer carrying a hero, written the way a real `MapToken` drag
 * writes it, so tests never hard-code the drag MIME type. */
export function heroDragTransfer(payload: HeroDragPayload = { side: "p1", heroId: "boreas" }) {
  const dataTransfer = fakeDataTransfer();
  serializeHeroDragPayload({ dataTransfer } as unknown as DragEvent, payload);
  return dataTransfer;
}

/** A transfer carrying the Ice Wall (intent/16), as `IceWallMarker` writes it. */
export function iceWallDragTransfer() {
  const dataTransfer = fakeDataTransfer();
  serializeIceWallDrag({ dataTransfer } as unknown as DragEvent);
  return dataTransfer;
}

/** A transfer carrying the Bear Trap (intent/18), as `BearTrapMarker` writes it. */
export function bearTrapDragTransfer() {
  const dataTransfer = fakeDataTransfer();
  serializeBearTrapDrag({ dataTransfer } as unknown as DragEvent);
  return dataTransfer;
}

/** Fires a `drop` of the Bear Trap on `element`. Unlike the wall, where it
 * lands is the target itself, so no cursor position is needed. */
export function dropBearTrap(element: Element) {
  fireEvent.drop(element, { dataTransfer: bearTrapDragTransfer() });
}

/** Fires a `drop` on `element` carrying `payload`. With no payload the
 * drop carries nothing. */
export function dropHero(element: Element, payload?: HeroDragPayload) {
  const dataTransfer = payload === undefined ? fakeDataTransfer() : heroDragTransfer(payload);
  fireEvent.drop(element, { dataTransfer });
}

/** Fires a `drop` of the Ice Wall on `element`, at a cursor position.
 * jsdom has no DragEvent, so the drop is a plain Event and the cursor
 * position is set on it by hand. */
export function dropIceWall(element: Element, at: { clientX: number; clientY: number }) {
  const event = createEvent.drop(element, { dataTransfer: iceWallDragTransfer() });
  Object.defineProperties(event, {
    clientX: { value: at.clientX },
    clientY: { value: at.clientY },
  });
  fireEvent(element, event);
}
