import { test, expect } from "@playwright/test";
import { setTeamGold } from "./helpers";

test("a defeat shows the respawn window on the Board and the Map, survives a reload, and clears on respawn", async ({
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

  // Ceralin to level 2, so her team's levels add up to 5.
  await setTeamGold(page, ceralinTeam, 2);
  await page.getByRole("button", { name: "Increase Ceralin level" }).click();
  await expect(page.getByRole("status", { name: "Ceralin level", exact: true })).toHaveText("2");

  // Round 3.
  const forward = page.getByRole("button", { name: /^Forward to/ });
  for (let i = 0; i < 8; i++) await forward.click();
  await expect(page.getByText("Round", { exact: true }).locator("..")).toHaveText("Round3");

  // Defeated in Round 3, with three heroes standing: 4 + 5 - 3 = 6 cards
  // ahead, so her card is the 7th. Round 3 at 8 a Cleanup, Round 5 at 3.
  const ceralinHp = page.getByRole("spinbutton", { name: "Ceralin HP", exact: true });
  await ceralinHp.fill("0");
  await ceralinHp.press("Enter");
  const band = page.getByTitle("Ceralin respawns Round 3–5");
  await expect(band).toHaveText("RespawnRound 3–5");

  // The Map shows it short, in place of her HP.
  await page.getByRole("button", { name: "Map" }).click();
  const mapWindow = page.getByRole("img", { name: "Ceralin respawns Round 3–5" });
  await expect(mapWindow).toHaveText("R3–5");

  // Kept across a reload.
  await page.reload();
  await expect(mapWindow).toHaveText("R3–5");

  // Raising her HP (a respawn) clears it on both screens.
  await page.getByRole("button", { name: "Board" }).click();
  await expect(band).toBeVisible();
  await ceralinHp.fill("5");
  await ceralinHp.press("Enter");
  await expect(page.getByTitle(/^Ceralin respawns/)).toHaveCount(0);
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("img", { name: /^Ceralin respawns/ })).toHaveCount(0);
});
