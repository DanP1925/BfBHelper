import { test, expect } from "@playwright/test";

test("each team's level follows its heroes' level-ups on the Board and the Map, and survives a reload", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();
  // Felix first (Player 1), then the same deterministic completion as
  // draft-to-battle.spec.ts.
  await page.getByRole("button", { name: "Pick Felix, Duelist" }).click();
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 7; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();

  // Both teams start at 0 level-ups.
  await expect(page.getByRole("img", { name: "Player 1 team level 0" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Player 2 team level 0" })).toBeVisible();

  // Two level-ups for Felix: Player 1's team level is 2.
  const increaseFelixLevel = page.getByRole("button", { name: "Increase Felix level" });
  await increaseFelixLevel.click();
  await increaseFelixLevel.click();
  await expect(page.getByRole("img", { name: "Player 1 team level 2" })).toBeVisible();

  // The Map shows the same, in each team's status panel header.
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("img", { name: "Player 1 team level 2" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Player 2 team level 0" })).toBeVisible();

  // It's worked out from the stored levels, so it survives a reload.
  await page.reload();
  await page.getByRole("button", { name: "Board" }).click();
  await expect(page.getByRole("img", { name: "Player 1 team level 2" })).toBeVisible();

  // Lowering a level takes it back off.
  await page.getByRole("button", { name: "Decrease Felix level" }).click();
  await expect(page.getByRole("img", { name: "Player 1 team level 1" })).toBeVisible();
});
