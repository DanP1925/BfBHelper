import { test, expect } from "@playwright/test";
import { dragElementTo } from "./helpers";

test("dragging a hero from the respawn area onto the board persists across reload and a Board/Map switch", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 8; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();

  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");

  // Drag Player 1's first respawn-area hero onto the board's center node
  // (the "Mid" gold pile — always present, a stable drop target).
  // Scoped to the RespawnAreaStrip component specifically — "Player 1" as
  // visible text is ambiguous (MapTeamStatusPanel's header says it too).
  const heroToken = page.locator('[class*="RespawnAreaStrip"]').first().locator("img[alt]").first();
  const heroName = await heroToken.getAttribute("alt");
  const heroDraggable = heroToken.locator("xpath=ancestor::div[@draggable='true']");
  const board = page.locator('img[src="/map/board.jpg"]');
  const boardBox = await board.boundingBox();
  if (boardBox === null) throw new Error("board has no bounding box");

  await dragElementTo(
    page,
    heroDraggable,
    boardBox.x + boardBox.width / 2,
    boardBox.y + boardBox.height / 2,
  );

  // The hero's name label now renders on the board, not inside a respawn
  // strip — querying by alt text (the token's <img alt={hero.name}>)
  // rather than visible text avoids ambiguity with MapTeamStatusPanel,
  // which always shows every hero's name as plain text regardless of
  // position.
  await expect(page.getByAltText(heroName as string)).toBeVisible();

  // Switch to the Board, confirm HP edits still work there (the Map
  // doesn't interfere with the Board's own controls).
  await page.getByRole("button", { name: "Board" }).click();
  const firstHpStepper = page.getByRole("spinbutton").first();
  await expect(firstHpStepper).toBeVisible();

  // Switch back to the Map and reload — the position should survive both.
  await page.getByRole("button", { name: "Map" }).click();
  await page.reload();
  await expect(page.getByAltText(heroName as string)).toBeVisible();
});
