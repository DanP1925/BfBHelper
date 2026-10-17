import { test, expect, type Locator, type Page } from "@playwright/test";

/** Raw mouse down/move/up, as in battle-map.spec.ts: Playwright's `dragTo`
 * doesn't reliably fire the native dragstart/dragover/drop sequence. */
async function dragTo(page: Page, source: Locator, target: { x: number; y: number }) {
  const box = await source.boundingBox();
  if (box === null) throw new Error("drag source has no bounding box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 10 });
  await page.mouse.up();
}

async function centerOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("drop target has no bounding box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A hero's draggable token, wherever it is on the Map. */
const token = (page: Page, name: string) =>
  page.getByAltText(name, { exact: true }).locator("xpath=ancestor::div[@draggable='true']");

test("the Arena opens at Felix's level 4, takes only Felix and one enemy, and survives a Board/Map switch, reload and the enemy's defeat", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();
  // Felix first, then the same deterministic completion as
  // draft-to-battle.spec.ts. The coin flip decides his side.
  await page.getByRole("button", { name: "Pick Felix, Duelist" }).click();
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 7; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();

  const arena = page.getByRole("region", { name: "The Arena" });
  const board = page.locator('img[src="/map/board.jpg"]');
  const respawnAreas = page.getByRole("region", { name: /respawning area$/ });

  await page.getByRole("button", { name: "Map" }).click();
  await expect(arena).toHaveCount(0);

  // Every hero starts in a respawn area: Felix's names his team. Pinned by
  // name, since a filter on "holds Felix" stops matching once he leaves.
  const felixAreaName = await respawnAreas
    .filter({ has: page.getByAltText("Felix", { exact: true }) })
    .getAttribute("aria-label");
  const felixArea = page.getByRole("region", { name: felixAreaName!, exact: true });
  const enemyAreaName = felixAreaName!.startsWith("Player 1")
    ? "Player 2 respawning area"
    : "Player 1 respawning area";
  const enemyArea = page.getByRole("region", { name: enemyAreaName, exact: true });
  const allyNames = (
    await felixArea
      .locator("img[alt]")
      .evaluateAll((imgs) => imgs.map((img) => img.getAttribute("alt") as string))
  ).filter((name) => name !== "Felix");
  const enemyNames = await enemyArea
    .locator("img[alt]")
    .evaluateAll((imgs) => imgs.map((img) => img.getAttribute("alt") as string));
  expect(allyNames).toHaveLength(3);
  expect(enemyNames).toHaveLength(4);
  const [enemy, secondEnemy] = enemyNames;

  // Level 4 on the Board isn't enough while Felix is still in his respawn
  // area; deploying him opens the Arena.
  await page.getByRole("button", { name: "Board" }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Increase Felix level" }).click();
  }
  await page.getByRole("button", { name: "Map" }).click();
  await expect(arena).toHaveCount(0);
  await dragTo(page, token(page, "Felix"), await centerOf(board));
  await expect(arena).toBeVisible();

  // Felix and one enemy go in; a second enemy and Felix's ally are refused.
  await dragTo(page, token(page, "Felix"), await centerOf(arena));
  await dragTo(page, token(page, enemy), await centerOf(arena));
  await dragTo(page, token(page, secondEnemy), await centerOf(arena));
  await dragTo(page, token(page, allyNames[0]), await centerOf(arena));
  await expect(arena.locator("img[alt]")).toHaveCount(2);
  await expect(arena.getByAltText("Felix", { exact: true })).toBeVisible();
  await expect(arena.getByAltText(enemy, { exact: true })).toBeVisible();
  await expect(enemyArea.getByAltText(secondEnemy, { exact: true })).toBeVisible();
  await expect(felixArea.getByAltText(allyNames[0], { exact: true })).toBeVisible();

  // A Board/Map switch and a reload keep it.
  await page.getByRole("button", { name: "Board" }).click();
  await page.getByRole("button", { name: "Map" }).click();
  await page.reload();
  await expect(arena.getByAltText("Felix", { exact: true })).toBeVisible();
  await expect(arena.getByAltText(enemy, { exact: true })).toBeVisible();

  // The enemy's defeat sends them to their respawn area; Felix stays.
  await page.getByRole("button", { name: "Board" }).click();
  const decreaseHp = page.getByRole("button", { name: `Decrease ${enemy} HP` });
  while (await decreaseHp.isEnabled()) {
    await decreaseHp.click();
  }
  await page.getByRole("button", { name: "Map" }).click();
  await expect(enemyArea.getByAltText(enemy, { exact: true })).toBeVisible();
  await expect(arena.locator("img[alt]")).toHaveCount(1);
  await expect(arena.getByAltText("Felix", { exact: true })).toBeVisible();

  // The player drags the survivor out; the empty Arena stays at level 4.
  await dragTo(page, token(page, "Felix"), await centerOf(board));
  await expect(arena).toBeVisible();
  await expect(arena.locator("img[alt]")).toHaveCount(0);

  // Below level 4 and empty, it hides again.
  await page.getByRole("button", { name: "Board" }).click();
  await page.getByRole("button", { name: "Decrease Felix level" }).click();
  await page.getByRole("button", { name: "Map" }).click();
  await expect(arena).toHaveCount(0);
});
