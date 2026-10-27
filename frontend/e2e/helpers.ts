import { expect, type Locator, type Page } from "@playwright/test";

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

/** Drags `source` onto the center of `target`. */
export async function dragTo(page: Page, source: Locator, target: Locator) {
  const box = await target.boundingBox();
  if (box === null) throw new Error("drop target has no bounding box");
  await dragElementTo(page, source, box.x + box.width / 2, box.y + box.height / 2);
}

/** Starts a battle through the real flow: Start Draft, the deterministic
 * 8-pick completion, Start Battle. Returns the coin-flip winner (who starts
 * with initiative) and the other player, as "Player 1" / "Player 2". */
export async function startBattle(page: Page): Promise<{ winner: string; loser: string }> {
  await page.goto("/");
  await page.getByRole("button", { name: "Start Draft" }).click();

  const subtitle = await page.getByText(/^Initiative: Player [12]$/).textContent();
  const winner = subtitle?.endsWith("1") ? "Player 1" : "Player 2";
  const loser = winner === "Player 1" ? "Player 2" : "Player 1";

  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 8; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();
  return { winner, loser };
}
