import { test, expect, type Page } from "@playwright/test";

async function startBattle(page: Page): Promise<{ winner: string; loser: string }> {
  await page.goto("/");
  await page.getByRole("button", { name: "Start Draft" }).click();

  const subtitle = await page.getByText(/^Initiative: Player [12]$/).textContent();
  const winner = subtitle?.endsWith("1") ? "Player 1" : "Player 2";
  const loser = winner === "Player 1" ? "Player 2" : "Player 1";

  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 8; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();
  return { winner, loser };
}

test("the phase steps through a round, a new round passes initiative, and it survives a Board/Map switch and reload", async ({
  page,
}) => {
  const { winner, loser } = await startBattle(page);

  const round = page.getByText("Round", { exact: true }).locator("..");
  const currentPhase = page.getByRole("listitem").and(page.locator('[aria-current="step"]'));
  const badge = page.getByRole("button", { name: /^Initiative:/ });
  const forward = page.getByRole("button", { name: /^Forward to/ });
  const back = page.getByRole("button", { name: /^(Back to|Already at)/ });

  // A battle starts at Round 1, Orders, with no step back.
  await expect(round).toHaveText("Round1");
  await expect(currentPhase).toHaveText("Orders");
  await expect(back).toBeDisabled();

  // Three steps stay in Round 1 and leave initiative alone.
  for (let i = 0; i < 3; i++) await forward.click();
  await expect(currentPhase).toHaveText("Cleanup");
  await expect(badge).toHaveText(winner);

  // Leaving Cleanup starts Round 2 and passes initiative.
  await expect(forward).toHaveAccessibleName("Forward to Round 2, Orders (passes initiative)");
  await forward.click();
  await expect(round).toHaveText("Round2");
  await expect(currentPhase).toHaveText("Orders");
  await expect(badge).toHaveText(loser);

  // The Map shows the same round, phase and holder.
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(round).toHaveText("Round2");
  await expect(currentPhase).toHaveText("Orders");
  await expect(badge).toHaveText(loser);

  // Stepping back undoes it, initiative included.
  await back.click();
  await expect(round).toHaveText("Round1");
  await expect(currentPhase).toHaveText("Cleanup");
  await expect(badge).toHaveText(winner);

  // Kept across a reload.
  await page.reload();
  await expect(round).toHaveText("Round1");
  await expect(currentPhase).toHaveText("Cleanup");
});

test("the Win Screen shows the round the game ended in", async ({ page }) => {
  await startBattle(page);

  const forward = page.getByRole("button", { name: /^Forward to/ });
  for (let i = 0; i < 8; i++) await forward.click();
  await expect(page.getByText("Round", { exact: true }).locator("..")).toHaveText("Round3");

  const decreaseP1Bit = page.getByRole("button", { name: "Decrease Player 1 Bit HP" });
  for (let i = 0; i < 16; i++) await decreaseP1Bit.click();

  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "End Battle" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "End Battle" }).click();

  await expect(page.getByText(/player 2 wins!/i)).toBeVisible();
  await expect(page.getByText("in Round 3")).toBeVisible();
});
