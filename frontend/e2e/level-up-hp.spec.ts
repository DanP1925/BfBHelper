import { test, expect } from "@playwright/test";
import { setTeamGold } from "./helpers";

test("a level change moves HP by one per level, leaves a defeated hero at 0, and survives a Board/Map switch and reload", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();
  // Felix and Ceralin first, then the same deterministic completion as
  // draft-to-battle.spec.ts.
  await page.getByRole("button", { name: "Pick Felix, Duelist" }).click();
  await page.getByRole("button", { name: /^Pick Ceralin, / }).click();
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 6; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();
  // Level-ups cost gold (intent/22); give both teams plenty.
  await setTeamGold(page, "Player 1", 20);
  await setTeamGold(page, "Player 2", 20);

  // Felix starts at level 1 with base 9 + 1 = 10 HP. The level is read-only
  // text (intent/22).
  const felixHp = page.getByRole("spinbutton", { name: "Felix HP", exact: true });
  const felixLevel = page.getByRole("status", { name: "Felix level", exact: true });
  await expect(felixHp).toHaveValue("10");
  await expect(felixLevel).toHaveText("1");

  // Level up, HP up; level down undoes it.
  await page.getByRole("button", { name: "Increase Felix level" }).click();
  await expect(felixLevel).toHaveText("2");
  await expect(felixHp).toHaveValue("11");
  await page.getByRole("button", { name: "Decrease Felix level" }).click();
  await expect(felixLevel).toHaveText("1");
  await expect(felixHp).toHaveValue("10");

  // A defeated Ceralin levels up for later and stays at 0 HP.
  const ceralinHp = page.getByRole("spinbutton", { name: "Ceralin HP", exact: true });
  const decreaseCeralinHp = page.getByRole("button", { name: "Decrease Ceralin HP" });
  while (await decreaseCeralinHp.isEnabled()) {
    await decreaseCeralinHp.click();
  }
  await expect(ceralinHp).toHaveValue("0");
  await page.getByRole("button", { name: "Increase Ceralin level" }).click();
  await expect(page.getByRole("status", { name: "Ceralin level", exact: true })).toHaveText("2");
  await expect(ceralinHp).toHaveValue("0");

  // Felix's bumped HP survives a Board/Map switch and a reload.
  await page.getByRole("button", { name: "Increase Felix level" }).click();
  await page.getByRole("button", { name: "Increase Felix level" }).click();
  await expect(felixHp).toHaveValue("12");
  await page.getByRole("button", { name: "Map" }).click();
  await page.getByRole("button", { name: "Board" }).click();
  await page.reload();
  await expect(felixLevel).toHaveText("3");
  await expect(felixHp).toHaveValue("12");
  await expect(ceralinHp).toHaveValue("0");
});
