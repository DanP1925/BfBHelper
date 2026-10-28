import { test, expect } from "@playwright/test";
import { startBattle } from "./helpers";

test("entering Cleanup gives each team 2 gold, which survives a Board/Map switch and reload, and stepping back takes it off", async ({
  page,
}) => {
  await startBattle(page);

  const p1Gold = page.getByRole("spinbutton", { name: "Player 1 gold", exact: true });
  const p2Gold = page.getByRole("spinbutton", { name: "Player 2 gold", exact: true });
  const currentPhase = page.getByRole("listitem").and(page.locator('[aria-current="step"]'));
  const forward = page.getByRole("button", { name: /^Forward to/ });
  const back = page.getByRole("button", { name: /^(Back to|Already at)/ });

  // Orders → Movement → Action pays nothing.
  for (let i = 0; i < 2; i++) await forward.click();
  await expect(currentPhase).toHaveText("Action");
  await expect(p1Gold).toHaveValue("0");
  await expect(p2Gold).toHaveValue("0");

  // Action → Cleanup gives each team 2.
  await forward.click();
  await expect(currentPhase).toHaveText("Cleanup");
  await expect(p1Gold).toHaveValue("2");
  await expect(p2Gold).toHaveValue("2");

  // The Map reads the same state: back on the Board, it's still 2.
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Board" }).click();
  await expect(p1Gold).toHaveValue("2");
  await expect(p2Gold).toHaveValue("2");

  // Kept across a reload.
  await page.reload();
  await expect(p1Gold).toHaveValue("2");
  await expect(p2Gold).toHaveValue("2");

  // Stepping back to Action takes it off again.
  await back.click();
  await expect(currentPhase).toHaveText("Action");
  await expect(p1Gold).toHaveValue("0");
  await expect(p2Gold).toHaveValue("0");
});
