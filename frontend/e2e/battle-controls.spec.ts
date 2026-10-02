import { test, expect } from "@playwright/test";

test("driving a Bit to 0 HP and ending the battle renders the Win Screen", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();

  // Same deterministic 8-pick completion as draft-to-battle.spec.ts.
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 8; i++) {
    await pickButton.first().click();
  }

  await expect(page.getByText("Draft Complete")).toBeVisible();

  await page.getByRole("button", { name: "Start Battle →" }).click();

  // Drive Player 1's Bit from BIT_STARTING_HP (16) down to 0 — the
  // stepper's aria-label is qualified by team ("Player 1 Bit HP") so it's
  // unambiguous which side's Bit this targets.
  const decreaseP1Bit = page.getByRole("button", { name: "Decrease Player 1 Bit HP" });
  for (let i = 0; i < 16; i++) {
    await decreaseP1Bit.click();
  }

  await page.getByRole("button", { name: "More actions" }).click();
  await expect(page.getByRole("menuitem", { name: "End Battle" })).toBeVisible();
  await page.getByRole("menuitem", { name: "End Battle" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "End Battle" }).click();

  // Player 1's Bit hit 0, so Player 2 wins.
  await expect(page.getByText(/player 2 wins!/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "← New Draft" })).toBeVisible();
});
