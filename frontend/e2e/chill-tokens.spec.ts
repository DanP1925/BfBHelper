import { test, expect } from "@playwright/test";

test("+1 Chill is offered only on Dazeem's enemies, stops at 5, stays apart from +1 Attack, and survives a Board/Map switch, reload and either hero's defeat", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();

  // Dazeem first, then the same deterministic completion as
  // draft-to-battle.spec.ts. The coin flip decides his side, so his enemies
  // are found below rather than assumed.
  await page.getByRole("button", { name: "Pick Dazeem, Ice Mage" }).click();
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 7; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();

  // Exactly the 4 heroes on the other team are offered it; Dazeem's own
  // team, Dazeem included, isn't.
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
    const offered = await picker.getByRole("button", { name: "Add +1 Chill" }).count();
    (offered === 1 ? enemies : team).push(name);
    await page.keyboard.press("Escape");
  }
  expect(enemies).toHaveLength(4);
  expect(team).toHaveLength(4);
  expect(team).toContain("Dazeem");

  const enemy = enemies[0];
  const chip = page.getByRole("button", { name: new RegExp(`^${enemy}: \\d+ \\+1 Chill token`) });
  const fiveHeld = `${enemy}: 5 +1 Chill tokens. Show controls`;
  const attackChip = page.getByRole("button", {
    name: new RegExp(`^${enemy}: \\d+ \\+1 Attack token`),
  });

  // Five in one open of the picker, which stays open; the row is disabled
  // at the fifth. A +1 Attack added after leaves the Chill count alone.
  await page.getByRole("button", { name: `Add a token to ${enemy}` }).click();
  const enemyPicker = page.getByRole("group", { name: `Add a token to ${enemy}` });
  const addChill = enemyPicker.getByRole("button", { name: "Add +1 Chill" });
  for (let i = 0; i < 5; i++) {
    await addChill.click();
  }
  await expect(addChill).toBeDisabled();
  await enemyPicker.getByRole("button", { name: "Add +1 Attack" }).click();
  await page.keyboard.press("Escape");
  await expect(chip).toHaveAccessibleName(fiveHeld);
  await expect(attackChip).toHaveAccessibleName(`${enemy}: 1 +1 Attack token. Show controls`);
  await expect(page.getByRole("button", { name: /\+1 Chill token/ })).toHaveCount(1);

  // The Map shows it read-only in the team status panel.
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("5 +1 Chill tokens", { exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "Board" }).click();
  await expect(chip).toHaveAccessibleName(fiveHeld);

  await page.reload();
  await expect(chip).toHaveAccessibleName(fiveHeld);

  // Neither the chilled hero's defeat nor Dazeem's clears it.
  for (const hero of [enemy, "Dazeem"]) {
    const decreaseHp = page.getByRole("button", { name: `Decrease ${hero} HP` });
    while (await decreaseHp.isEnabled()) {
      await decreaseHp.click();
    }
    await expect(page.getByLabel(`${hero} HP`, { exact: true })).toHaveValue("0");
  }
  await expect(chip).toHaveAccessibleName(fiveHeld);

  // Stepping to 0 removes the chip once its stepper closes, on both screens,
  // and leaves +1 Attack where it was.
  await chip.click();
  await expect(page.getByRole("button", { name: `Add +1 Chill token to ${enemy}` })).toBeDisabled();
  const remove = page.getByRole("button", { name: `Remove +1 Chill token from ${enemy}` });
  for (let i = 0; i < 5; i++) {
    await remove.click();
  }
  await page.keyboard.press("Escape");
  await expect(chip).toHaveCount(0);
  await expect(attackChip).toHaveAccessibleName(`${enemy}: 1 +1 Attack token. Show controls`);
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel(/\+1 Chill token/)).toHaveCount(0);
});
