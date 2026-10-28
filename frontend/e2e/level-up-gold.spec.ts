import { test, expect } from "@playwright/test";
import { setTeamGold } from "./helpers";

test("a level-up pays its gold, can't be bought without it, refunds on a level-down, and survives a Board/Map switch and reload", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();
  // The first pick goes to the coin-flip winner and the second to the other
  // player, so Ceralin and Ken Obi land on opposite teams.
  const subtitle = await page.getByText(/^Initiative: Player [12]$/).textContent();
  const ceralinTeam = subtitle?.endsWith("1") ? "Player 1" : "Player 2";
  const kenObiTeam = ceralinTeam === "Player 1" ? "Player 2" : "Player 1";
  await page.getByRole("button", { name: /^Pick Ceralin, / }).click();
  await page.getByRole("button", { name: /^Pick Ken Obi, / }).click();
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 6; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();

  const ceralinGold = page.getByRole("spinbutton", { name: `${ceralinTeam} gold`, exact: true });
  const ceralinLevel = page.getByRole("status", { name: "Ceralin level", exact: true });
  const ceralinHp = page.getByRole("spinbutton", { name: "Ceralin HP", exact: true });
  const increaseCeralin = page.getByRole("button", { name: "Increase Ceralin level" });
  const ceralinCost = page.getByRole("img", { name: /^Ceralin's next level costs/ });

  // Both teams start at 0 gold: no level-up can be bought, and no cost shows.
  await expect(increaseCeralin).toBeDisabled();
  await expect(ceralinCost).toHaveCount(0);

  // With 5 gold, level 1 → 2 costs 2 and level 2 → 3 costs 3. HP follows.
  await setTeamGold(page, ceralinTeam, 5);
  await expect(ceralinCost).toHaveAccessibleName("Ceralin's next level costs 2 gold");
  await increaseCeralin.click();
  await expect(ceralinGold).toHaveValue("3");
  await expect(ceralinLevel).toHaveText("2");
  await expect(ceralinHp).toHaveValue("12");
  await expect(ceralinCost).toHaveAccessibleName("Ceralin's next level costs 3 gold");
  await increaseCeralin.click();
  await expect(ceralinGold).toHaveValue("0");
  await expect(ceralinLevel).toHaveText("3");

  // Out of gold: + is off and the cost is gone.
  await expect(increaseCeralin).toBeDisabled();
  await expect(ceralinCost).toHaveCount(0);

  // A level-down refunds that level's price.
  await page.getByRole("button", { name: "Decrease Ceralin level" }).click();
  await expect(ceralinGold).toHaveValue("3");
  await expect(ceralinLevel).toHaveText("2");

  // Ken Obi pays one less: 1 gold is enough for his level 1 → 2.
  await setTeamGold(page, kenObiTeam, 1);
  await expect(page.getByRole("img", { name: "Ken Obi's next level costs 1 gold" })).toBeVisible();
  await page.getByRole("button", { name: "Increase Ken Obi level" }).click();
  await expect(page.getByRole("status", { name: "Ken Obi level", exact: true })).toHaveText("2");
  await expect(
    page.getByRole("spinbutton", { name: `${kenObiTeam} gold`, exact: true }),
  ).toHaveValue("0");

  // The paid levels and gold survive a Board/Map switch and a reload.
  await page.getByRole("button", { name: "Map" }).click();
  await page.getByRole("button", { name: "Board" }).click();
  await page.reload();
  await expect(ceralinLevel).toHaveText("2");
  await expect(ceralinGold).toHaveValue("3");
  await expect(page.getByRole("status", { name: "Ken Obi level", exact: true })).toHaveText("2");
});
