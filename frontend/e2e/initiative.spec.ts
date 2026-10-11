import { test, expect } from "@playwright/test";

test("initiative starts on the coin-flip winner, passes on tap, and survives a Board/Map switch and reload", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();

  // The Draft Board shows the pre-draft coin flip's result.
  const subtitle = await page.getByText(/^Initiative: Player [12]$/).textContent();
  const winner = subtitle?.endsWith("1") ? "Player 1" : "Player 2";
  const loser = winner === "Player 1" ? "Player 2" : "Player 1";

  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 8; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();

  // The battle starts with initiative on the coin-flip winner.
  const badge = page.getByRole("button", { name: /^Initiative:/ });
  await expect(badge).toHaveAccessibleName(`Initiative: ${winner}. Pass to ${loser}.`);
  await expect(badge).toHaveText(winner);

  await badge.click();
  await expect(badge).toHaveAccessibleName(`Initiative: ${loser}. Pass to ${winner}.`);

  // Same value on the Map, and after a reload.
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(badge).toHaveText(loser);

  await page.reload();
  await expect(badge).toHaveText(loser);

  // Tapping again passes it back.
  await badge.click();
  await expect(badge).toHaveText(winner);
});
