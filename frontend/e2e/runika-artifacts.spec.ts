import { test, expect } from "@playwright/test";
import { dragElementTo } from "./helpers";

test("Runika's Artifacts flip on her card only, show face-up on the Map, and survive a reload, her defeat and a respawn", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();

  // Runika first, then the same deterministic completion as
  // draft-to-battle.spec.ts.
  await page.getByRole("button", { name: "Pick Runika, Artificer" }).click();
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 7; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();

  // Only her card has the row, with all three face-up.
  await expect(page.getByRole("group", { name: /'s Artifacts$/ })).toHaveCount(1);
  const row = page.getByRole("group", { name: "Runika's Artifacts" });
  const pills = row.getByRole("button");
  await expect(pills).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await expect(pills.nth(i)).toHaveAttribute("aria-pressed", "true");
  }

  const deflector = page.getByRole("button", {
    name: "Auto Deflector: +1 defense vs melee attacks, on Runika",
  });
  const mapIcon = (name: string) => page.getByLabel(new RegExp(`^${name}: `));

  async function goToMap() {
    await page.getByRole("button", { name: "Map" }).click();
    await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  }

  // An enemy hit: flip Auto Deflector face-down.
  await deflector.click();
  await expect(deflector).toHaveAttribute("aria-pressed", "false");

  // The Map shows only the two face-up ones.
  await goToMap();
  await expect(mapIcon("Battle Fist")).toHaveCount(1);
  await expect(mapIcon("Shield Amulet")).toHaveCount(1);
  await expect(mapIcon("Auto Deflector")).toHaveCount(0);

  // Respawn: drag her out of the respawn area onto the board. Nothing flips.
  const respawnToken = page
    .locator('[class*="RespawnAreaStrip"]')
    .getByAltText("Runika", { exact: true });
  const board = page.locator('img[src="/map/board.jpg"]');
  const boardBox = await board.boundingBox();
  if (boardBox === null) throw new Error("board has no bounding box");
  await dragElementTo(
    page,
    respawnToken.locator("xpath=ancestor::div[@draggable='true']"),
    boardBox.x + boardBox.width / 2,
    boardBox.y + boardBox.height / 2,
  );
  await expect(respawnToken).toHaveCount(0);
  await expect(mapIcon("Auto Deflector")).toHaveCount(0);

  await page.reload();
  await expect(mapIcon("Auto Deflector")).toHaveCount(0);
  await expect(mapIcon("Battle Fist")).toHaveCount(1);

  // Back on the Board: still face-down after the reload, and after her
  // defeat.
  await page.getByRole("button", { name: "Board" }).click();
  await expect(deflector).toHaveAttribute("aria-pressed", "false");
  const decreaseHp = page.getByRole("button", { name: "Decrease Runika HP" });
  while (await decreaseHp.isEnabled()) {
    await decreaseHp.click();
  }
  await expect(page.getByLabel("Runika HP", { exact: true })).toHaveValue("0");
  await expect(deflector).toHaveAttribute("aria-pressed", "false");

  // Flipped back up (a Rest or respawn), it's on the Map again.
  await deflector.click();
  await expect(deflector).toHaveAttribute("aria-pressed", "true");
  await goToMap();
  await expect(mapIcon("Auto Deflector")).toHaveCount(1);
});
