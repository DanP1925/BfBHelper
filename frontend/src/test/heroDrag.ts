import { fireEvent } from "@testing-library/react";
import type { DragEvent } from "react";
import { serializeHeroDragPayload, type HeroDragPayload } from "../lib/map/dragPayload";

/** jsdom's DataTransfer doesn't implement getData/setData, so drop targets
 * get this minimal stand-in, which backs both. */
export function fakeDataTransfer() {
  const store = new Map<string, string>();
  return {
    setData: (type: string, value: string) => store.set(type, value),
    getData: (type: string) => store.get(type) ?? "",
    effectAllowed: "",
  };
}

/** Fires a `drop` on `element` carrying `payload`, written the way a real
 * `MapToken` drag writes it (`serializeHeroDragPayload`), so tests never
 * hard-code the drag MIME type. With no payload the drop carries nothing. */
export function dropHero(element: Element, payload?: HeroDragPayload) {
  const dataTransfer = fakeDataTransfer();
  if (payload !== undefined) {
    serializeHeroDragPayload({ dataTransfer } as unknown as DragEvent, payload);
  }
  fireEvent.drop(element, { dataTransfer });
}
