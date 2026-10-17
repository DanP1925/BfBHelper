import { test, expect, type Locator, type Page } from "@playwright/test";
import { dragElementTo, dragTo } from "./helpers";

/** Drags `source` onto a point of the board art, as fractions of its box. */
async function dragToArt(page: Page, source: Locator, art: Locator, x: number, y: number) {
  const box = await art.boundingBox();
  if (box === null) throw new Error("board art has no bounding box");
  await dragElementTo(page, source, box.x + box.width * x, box.y + box.height * y);
}

/** Where `marker`'s center sits on the board art, as fractions of the art's
 * on-screen box (which includes the Map's zoom and pan). */
async function spotOnArt(marker: Locator, art: Locator) {
  const [m, a] = [await marker.boundingBox(), await art.boundingBox()];
  if (m === null || a === null) throw new Error("no bounding box");
  return {
    x: (m.x + m.width / 2 - a.x) / a.width,
    y: (m.y + m.height / 2 - a.y) / a.height,
  };
}

async function expectSpot(marker: Locator, art: Locator, x: number, y: number) {
  const spot = await spotOnArt(marker, art);
  expect(spot.x).toBeCloseTo(x, 1);
  expect(spot.y).toBeCloseTo(y, 1);
}

/** Drafts `firstPick` (if any), then fills the draft with the first hero
 * whose pick button matches `pickable`, the same deterministic completion
 * as draft-to-battle.spec.ts, and starts the battle. */
async function draftAndStart(page: Page, firstPick: string | null, pickable = /^Pick /) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start Draft" }).click();
  if (firstPick !== null) {
    await page.getByRole("button", { name: firstPick }).click();
  }
  const pickButton = page.getByRole("button", { name: pickable });
  for (let i = firstPick === null ? 0 : 1; i < 8; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();
}

test("Dazeem's Ice Wall is placed, moved and put back by hand, staying on its spot through a Board/Map switch, zoom, reload and Dazeem's defeat", async ({
  page,
}) => {
  await draftAndStart(page, "Pick Dazeem, Ice Mage");
  await page.getByRole("button", { name: "Map" }).click();

  const holder = page.getByRole("region", { name: "Ice Wall" });
  const wall = page.getByRole("img", { name: "Ice Wall" });
  const art = page.locator('img[src="/map/board.jpg"]');

  // The holder sits in Dazeem's team column, under his respawn area, with
  // the wall in it.
  const dazeemArea = page
    .getByRole("region", { name: /respawning area$/ })
    .filter({ has: page.getByAltText("Dazeem", { exact: true }) });
  await expect(
    dazeemArea.locator("xpath=..").getByRole("region", { name: "Ice Wall" }),
  ).toBeVisible();
  await expect(holder.getByRole("img", { name: "Ice Wall" })).toBeVisible();
  await expect(wall).toHaveCount(1);

  // Dragged onto the board, it lands where it's dropped.
  await dragToArt(page, wall, art, 0.4, 0.3);
  await expect(holder.getByRole("img", { name: "Ice Wall" })).toHaveCount(0);
  await expect(wall).toHaveCount(1);
  await expectSpot(wall, art, 0.4, 0.3);

  // Same spot on the art after a Board/Map switch and at a higher zoom.
  await page.getByRole("button", { name: "Board" }).click();
  await page.getByRole("button", { name: "Map" }).click();
  await expectSpot(wall, art, 0.4, 0.3);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expectSpot(wall, art, 0.4, 0.3);
  await page.getByRole("button", { name: "Reset zoom and pan" }).click();

  // And after a reload.
  await page.reload();
  await expectSpot(wall, art, 0.4, 0.3);

  // Moved to another spot.
  await dragToArt(page, wall, art, 0.6, 0.55);
  await expectSpot(wall, art, 0.6, 0.55);

  // Dropped right on a space (p2-plain-1, at 58% / 27%), it still lets a
  // hero dropped there land on the space, and can still be picked up.
  await dragToArt(page, wall, art, 0.58, 0.27);
  await expectSpot(wall, art, 0.58, 0.27);
  const boardLayer = art.locator("xpath=..");
  await dragToArt(page, page.getByAltText("Dazeem", { exact: true }), art, 0.58, 0.27);
  await expect(boardLayer.getByAltText("Dazeem", { exact: true })).toBeVisible();
  await dragToArt(page, wall, art, 0.6, 0.55);
  await expectSpot(wall, art, 0.6, 0.55);

  // Dazeem's defeat doesn't take it off the board.
  await page.getByRole("button", { name: "Board" }).click();
  const decreaseHp = page.getByRole("button", { name: "Decrease Dazeem HP" });
  while (await decreaseHp.isEnabled()) {
    await decreaseHp.click();
  }
  await page.getByRole("button", { name: "Map" }).click();
  await expectSpot(wall, art, 0.6, 0.55);

  // Dragged back to the holder, it leaves the board.
  await dragTo(page, wall, holder);
  await expect(holder.getByRole("img", { name: "Ice Wall" })).toBeVisible();
  await expect(wall).toHaveCount(1);
  await page.reload();
  await expect(holder.getByRole("img", { name: "Ice Wall" })).toBeVisible();
});

test("a battle without Dazeem has no Ice Wall", async ({ page }) => {
  await draftAndStart(page, null, /^Pick (?!Dazeem)/);
  await page.getByRole("button", { name: "Map" }).click();

  await expect(page.getByRole("region", { name: /respawning area$/ })).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Ice Wall" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Ice Wall" })).toHaveCount(0);
});
