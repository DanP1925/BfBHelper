import type { Locator, Page } from "@playwright/test";

/** Native HTML5 drag-and-drop via raw mouse down/move/up: Playwright's own
 * `dragTo` targets a locator and doesn't reliably fire the real browser
 * dragstart/dragover/drop sequence `MapToken` and the Map's drop targets
 * rely on. A real browser recognizes this as a native drag once the
 * pointer crosses the drag threshold, so it exercises the same code path a
 * player's drag does. */
export async function dragElementTo(page: Page, source: Locator, targetX: number, targetY: number) {
  const box = await source.boundingBox();
  if (box === null) throw new Error("drag source has no bounding box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 10 });
  await page.mouse.up();
}
