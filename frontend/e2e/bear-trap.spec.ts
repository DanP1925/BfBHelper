import { test, expect, type Locator, type Page } from "@playwright/test";
import { dragElementTo, dragTo } from "./helpers";

/** Drags `source` onto a point of the board art, as fractions of its box. */
async function dragToArt(page: Page, source: Locator, art: Locator, x: number, y: number) {
  const box = await art.boundingBox();
  if (box === null) throw new Error("board art has no bounding box");
  await dragElementTo(page, source, box.x + box.width * x, box.y + box.height * y);
}

/** The trap sits beside its space's centre, not on it (offset right and a
 * little down), so "on this space" is a loose check: within 8% of the art. */
async function expectNearSpace(trap: Locator, art: Locator, x: number, y: number) {
  const [t, a] = [await trap.boundingBox(), await art.boundingBox()];
  if (t === null || a === null) throw new Error("no bounding box");
  const spot = { x: (t.x + t.width / 2 - a.x) / a.width, y: (t.y + t.height / 2 - a.y) / a.height };
  expect(Math.abs(spot.x - x)).toBeLessThan(0.08);
  expect(Math.abs(spot.y - y)).toBeLessThan(0.08);
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

// Board spaces, as fractions of the art (data/mapSpaces.ts).
const P2_PLAIN_1 = { x: 0.58, y: 0.27 };
const P1_PLAIN_1 = { x: 0.705, y: 0.415 };
/** Bare board art, well away from every space's drop circle. */
const BETWEEN_SPACES = { x: 0.5, y: 0.35 };

test("Boreas's Bear Trap snaps to a space, moves and goes back by hand, staying through a Board/Map switch, zoom, reload, a hero landing on it and Boreas's defeat", async ({
  page,
}) => {
  await draftAndStart(page, "Pick Boreas, Hunter");
  await page.getByRole("button", { name: "Map" }).click();

  const holder = page.getByRole("region", { name: "Bear Trap" });
  const trap = page.getByRole("img", { name: "Bear Trap" });
  const art = page.locator('img[src="/map/board.jpg"]');

  // The holder hangs beside Boreas's team column, with the trap in it.
  const boreasArea = page
    .getByRole("region", { name: /respawning area$/ })
    .filter({ has: page.getByAltText("Boreas", { exact: true }) });
  await expect(
    boreasArea.locator("xpath=..").getByRole("region", { name: "Bear Trap" }),
  ).toBeVisible();
  await expect(holder.getByRole("img", { name: "Bear Trap" })).toBeVisible();
  await expect(trap).toHaveCount(1);

  // Dragged onto a space, it snaps there.
  await dragToArt(page, trap, art, P2_PLAIN_1.x, P2_PLAIN_1.y);
  await expect(holder.getByRole("img", { name: "Bear Trap" })).toHaveCount(0);
  await expect(trap).toHaveCount(1);
  await expectNearSpace(trap, art, P2_PLAIN_1.x, P2_PLAIN_1.y);

  // Dropped between spaces, it stays where it was.
  await dragToArt(page, trap, art, BETWEEN_SPACES.x, BETWEEN_SPACES.y);
  await expectNearSpace(trap, art, P2_PLAIN_1.x, P2_PLAIN_1.y);

  // Same space after a Board/Map switch, at a higher zoom and after a reload.
  await page.getByRole("button", { name: "Board" }).click();
  await page.getByRole("button", { name: "Map" }).click();
  await expectNearSpace(trap, art, P2_PLAIN_1.x, P2_PLAIN_1.y);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expectNearSpace(trap, art, P2_PLAIN_1.x, P2_PLAIN_1.y);
  await page.getByRole("button", { name: "Reset zoom and pan" }).click();
  await page.reload();
  await expectNearSpace(trap, art, P2_PLAIN_1.x, P2_PLAIN_1.y);

  // Moved to another space (playing the card again).
  await dragToArt(page, trap, art, P1_PLAIN_1.x, P1_PLAIN_1.y);
  await expectNearSpace(trap, art, P1_PLAIN_1.x, P1_PLAIN_1.y);

  // A hero dropped onto the trapped space lands there, and the trap stays.
  const boardLayer = art.locator("xpath=..");
  await dragToArt(
    page,
    page.getByAltText("Boreas", { exact: true }),
    art,
    P1_PLAIN_1.x,
    P1_PLAIN_1.y,
  );
  await expect(boardLayer.getByAltText("Boreas", { exact: true })).toBeVisible();
  await expectNearSpace(trap, art, P1_PLAIN_1.x, P1_PLAIN_1.y);

  // Boreas's defeat doesn't take it off the board.
  await page.getByRole("button", { name: "Board" }).click();
  const decreaseHp = page.getByRole("button", { name: "Decrease Boreas HP" });
  while (await decreaseHp.isEnabled()) {
    await decreaseHp.click();
  }
  await page.getByRole("button", { name: "Map" }).click();
  await expectNearSpace(trap, art, P1_PLAIN_1.x, P1_PLAIN_1.y);

  // Dragged back to the holder, it leaves the board.
  await dragTo(page, trap, holder);
  await expect(holder.getByRole("img", { name: "Bear Trap" })).toBeVisible();
  await expect(trap).toHaveCount(1);
  await page.reload();
  await expect(holder.getByRole("img", { name: "Bear Trap" })).toBeVisible();
});

test("a battle without Boreas has no Bear Trap", async ({ page }) => {
  await draftAndStart(page, null, /^Pick (?!Boreas)/);
  await page.getByRole("button", { name: "Map" }).click();

  await expect(page.getByRole("region", { name: /respawning area$/ })).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Bear Trap" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Bear Trap" })).toHaveCount(0);
});
