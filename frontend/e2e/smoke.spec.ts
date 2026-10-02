import { test, expect } from "@playwright/test";

test("start screen leads into a draft", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Battle for Biternia" })).toBeVisible();

  await page.getByRole("button", { name: "Start Draft" }).click();

  await expect(page.getByRole("button", { name: "Start Draft" })).not.toBeVisible();
});
