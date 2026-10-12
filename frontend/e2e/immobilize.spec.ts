import { test, expect } from "@playwright/test";

/** Native HTML5 drag-and-drop via raw mouse down/move/up, same as
 * battle-map.spec.ts (Playwright's `dragTo` doesn't reliably fire the
 * dragstart/dragover/drop sequence `MapToken`/`MapSpace` rely on). */
async function dragElementTo(
  page: import("@playwright/test").Page,
  source: import("@playwright/test").Locator,
  targetX: number,
  targetY: number,
) {
  const box = await source.boundingBox();
  if (box === null) throw new Error("drag source has no bounding box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 10 });
  await page.mouse.up();
}

test("Immobilize toggles on and off, never blocks a move, and survives a Board/Map switch, reload and defeat", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();

  // Same deterministic 8-pick completion as draft-to-battle.spec.ts.
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 8; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();

  // Every hero card has an Immobilize toggle, off. Read the first hero's
  // name off its label rather than hardcoding the draft order.
  const toggles = page.getByRole("button", { name: /^Immobilized on / });
  await expect(toggles).toHaveCount(8);
  for (let i = 0; i < 8; i++) {
    await expect(toggles.nth(i)).toHaveAttribute("aria-pressed", "false");
  }
  const label = await toggles.first().getAttribute("aria-label");
  const hero = label!.slice("Immobilized on ".length);
  const heroToggle = page.getByRole("button", { name: `Immobilized on ${hero}` });

  // One tap turns it on, and only for that hero.
  await heroToggle.click();
  await expect(heroToggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggles.nth(1)).toHaveAttribute("aria-pressed", "false");

  // The Map shows it read-only in the team status panel.
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Immobilized", { exact: true })).toHaveCount(1);

  // Moving is never blocked: drag the immobilized hero out of its respawn
  // area onto the board's center node (the "Mid" gold pile, a stable
  // drop target). It lands, and stays immobilized.
  const respawnStrips = page.locator('[class*="RespawnAreaStrip"]');
  const heroInStrip = respawnStrips.getByAltText(hero, { exact: true });
  await expect(heroInStrip).toHaveCount(1);
  const heroDraggable = heroInStrip.locator("xpath=ancestor::div[@draggable='true']");
  const board = page.locator('img[src="/map/board.jpg"]');
  const boardBox = await board.boundingBox();
  if (boardBox === null) throw new Error("board has no bounding box");
  await dragElementTo(
    page,
    heroDraggable,
    boardBox.x + boardBox.width / 2,
    boardBox.y + boardBox.height / 2,
  );
  await expect(heroInStrip).toHaveCount(0);
  await expect(page.getByAltText(hero, { exact: true })).toBeVisible();
  await expect(page.getByLabel("Immobilized", { exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "Board" }).click();
  await expect(heroToggle).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(heroToggle).toHaveAttribute("aria-pressed", "true");

  // Defeat (HP to 0) doesn't clear it.
  const decreaseHp = page.getByRole("button", { name: `Decrease ${hero} HP` });
  while (await decreaseHp.isEnabled()) {
    await decreaseHp.click();
  }
  await expect(page.getByLabel(`${hero} HP`, { exact: true })).toHaveValue("0");
  await expect(heroToggle).toHaveAttribute("aria-pressed", "true");

  // Another tap turns it off, on both screens.
  await heroToggle.click();
  await expect(heroToggle).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Immobilized", { exact: true })).toHaveCount(0);
});
