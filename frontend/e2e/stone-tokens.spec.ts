import { test, expect } from "@playwright/test";

test("+1 Stone is offered only on Sedusa's enemies, stops at 3, and survives a Board/Map switch, reload and either hero's defeat", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();

  // Sedusa first, then the same deterministic completion as
  // draft-to-battle.spec.ts. The coin flip decides her side, so her enemies
  // are found below rather than assumed.
  await page.getByRole("button", { name: "Pick Sedusa, Gorgon" }).click();
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 7; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();

  // Exactly the 4 heroes on the other team are offered it; Sedusa's own
  // team, Sedusa included, isn't.
  const addButtons = page.getByRole("button", { name: /^Add a token to / });
  await expect(addButtons).toHaveCount(8);
  const enemies: string[] = [];
  const team: string[] = [];
  for (let i = 0; i < 8; i++) {
    const label = (await addButtons.nth(i).getAttribute("aria-label"))!;
    const name = label.slice("Add a token to ".length);
    await addButtons.nth(i).click();
    const picker = page.getByRole("group", { name: label });
    await expect(picker.getByRole("button", { name: "Add +1 Attack" })).toBeVisible();
    const offered = await picker.getByRole("button", { name: "Add +1 Stone" }).count();
    (offered === 1 ? enemies : team).push(name);
    await page.keyboard.press("Escape");
  }
  expect(enemies).toHaveLength(4);
  expect(team).toHaveLength(4);
  expect(team).toContain("Sedusa");

  const enemy = enemies[0];
  const chip = page.getByRole("button", { name: new RegExp(`^${enemy}: \\d+ \\+1 Stone token`) });
  const threeHeld = `${enemy}: 3 +1 Stone tokens. Show controls`;

  // Three in one open of the picker, which stays open; the row is disabled
  // at the third.
  await page.getByRole("button", { name: `Add a token to ${enemy}` }).click();
  const enemyPicker = page.getByRole("group", { name: `Add a token to ${enemy}` });
  const addStone = enemyPicker.getByRole("button", { name: "Add +1 Stone" });
  for (let i = 0; i < 3; i++) {
    await addStone.click();
  }
  await expect(addStone).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(chip).toHaveAccessibleName(threeHeld);
  await expect(page.getByRole("button", { name: /\+1 Stone token/ })).toHaveCount(1);
  // Reaching 3 doesn't defeat the hero.
  await expect(page.getByLabel(`${enemy} HP`, { exact: true })).not.toHaveValue("0");

  // The Map shows it read-only in the team status panel.
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("3 +1 Stone tokens", { exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "Board" }).click();
  await expect(chip).toHaveAccessibleName(threeHeld);

  await page.reload();
  await expect(chip).toHaveAccessibleName(threeHeld);

  // Neither the stoned hero's defeat nor Sedusa's clears it.
  for (const hero of [enemy, "Sedusa"]) {
    const decreaseHp = page.getByRole("button", { name: `Decrease ${hero} HP` });
    while (await decreaseHp.isEnabled()) {
      await decreaseHp.click();
    }
    await expect(page.getByLabel(`${hero} HP`, { exact: true })).toHaveValue("0");
  }
  await expect(chip).toHaveAccessibleName(threeHeld);

  // Stepping to 0 removes the chip once its stepper closes, on both screens.
  await chip.click();
  await expect(page.getByRole("button", { name: `Add +1 Stone token to ${enemy}` })).toBeDisabled();
  const remove = page.getByRole("button", { name: `Remove +1 Stone token from ${enemy}` });
  for (let i = 0; i < 3; i++) {
    await remove.click();
  }
  await page.keyboard.press("Escape");
  await expect(chip).toHaveCount(0);
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel(/\+1 Stone token/)).toHaveCount(0);
});
