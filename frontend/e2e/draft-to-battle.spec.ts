import { test, expect } from "@playwright/test";

test("completing a draft and starting battle renders the Battle Board", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();

  // The draft takes exactly 8 picks (steps of 1,2,2,2,1) regardless of
  // which heroes are chosen — clicking the first available pool card each
  // time drives it to completion deterministically.
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 8; i++) {
    await pickButton.first().click();
  }

  await expect(page.getByText("Draft Complete")).toBeVisible();

  await page.getByRole("button", { name: "Start Battle →" }).click();

  await expect(page.getByText("Structures")).toHaveCount(2);
  await expect(page.getByRole("spinbutton", { name: "Player 1 gold" })).toHaveValue("0");
  await expect(page.getByRole("spinbutton", { name: "Player 2 gold" })).toHaveValue("0");
});
