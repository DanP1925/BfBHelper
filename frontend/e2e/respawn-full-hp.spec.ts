import { test, expect } from "@playwright/test";
import { dragElementTo, setTeamGold } from "./helpers";

test("dragging a defeated hero out of the respawn area sets full HP and clears the window", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();
  // The first pick goes to the coin-flip winner, so Ceralin is on that team.
  const subtitle = await page.getByText(/^Initiative: Player [12]$/).textContent();
  const ceralinTeam = subtitle?.endsWith("1") ? "Player 1" : "Player 2";
  await page.getByRole("button", { name: /^Pick Ceralin, / }).click();
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 7; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();

  // Ceralin (Base HP 10) to level 2, so her max HP is 12. Then defeated.
  await setTeamGold(page, ceralinTeam, 2);
  await page.getByRole("button", { name: "Increase Ceralin level" }).click();
  const ceralinHp = page.getByRole("spinbutton", { name: "Ceralin HP", exact: true });
  await expect(ceralinHp).toHaveValue("12");
  await ceralinHp.fill("0");
  await ceralinHp.press("Enter");
  await expect(page.getByTitle(/^Ceralin respawns/)).toHaveCount(1);

  // On the Map, drag her from the respawn area onto the board's center.
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("img", { name: /^Ceralin respawns/ })).toBeVisible();
  const token = page
    .locator('[class*="RespawnAreaStrip"]')
    .locator('img[alt="Ceralin"]')
    .locator("xpath=ancestor::div[@draggable='true']");
  const board = page.locator('img[src="/map/board.jpg"]');
  const boardBox = await board.boundingBox();
  if (boardBox === null) throw new Error("board has no bounding box");
  await dragElementTo(
    page,
    token,
    boardBox.x + boardBox.width / 2,
    boardBox.y + boardBox.height / 2,
  );

  // No window on the Map, and full HP on the Board.
  await expect(page.locator('[class*="RespawnAreaStrip"]').getByAltText("Ceralin")).toHaveCount(0);
  await expect(page.getByRole("img", { name: /^Ceralin respawns/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Board" }).click();
  await expect(ceralinHp).toHaveValue("12");
  await expect(page.getByTitle(/^Ceralin respawns/)).toHaveCount(0);

  // Kept across a reload.
  await page.reload();
  await expect(ceralinHp).toHaveValue("12");
});
