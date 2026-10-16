import { test, expect } from "@playwright/test";

test("+1 Shield is offered only on Cyrus's team, and survives a Board/Map switch, reload and either hero's defeat", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();

  // Cyrus first, then the same deterministic completion as
  // draft-to-battle.spec.ts. The coin flip decides his side, so his team is
  // found below rather than assumed.
  await page.getByRole("button", { name: "Pick Cyrus, Paladin" }).click();
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 7; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();

  // Exactly the 4 heroes on Cyrus's team, Cyrus included, are offered it.
  const addButtons = page.getByRole("button", { name: /^Add a token to / });
  await expect(addButtons).toHaveCount(8);
  const team: string[] = [];
  const enemies: string[] = [];
  for (let i = 0; i < 8; i++) {
    const label = (await addButtons.nth(i).getAttribute("aria-label"))!;
    const name = label.slice("Add a token to ".length);
    await addButtons.nth(i).click();
    const picker = page.getByRole("group", { name: label });
    await expect(picker.getByRole("button", { name: "Add +1 Attack" })).toBeVisible();
    const offered = await picker.getByRole("button", { name: "Add +1 Shield" }).count();
    (offered === 1 ? team : enemies).push(name);
    await page.keyboard.press("Escape");
  }
  expect(team).toHaveLength(4);
  expect(team).toContain("Cyrus");
  expect(enemies).toHaveLength(4);

  const ally = team.find((name) => name !== "Cyrus")!;
  const chip = page.getByRole("button", { name: new RegExp(`^${ally}: \\d+ \\+1 Shield token`) });

  // Three in one open of the picker, which stays open.
  await page.getByRole("button", { name: `Add a token to ${ally}` }).click();
  const allyPicker = page.getByRole("group", { name: `Add a token to ${ally}` });
  for (let i = 0; i < 3; i++) {
    await allyPicker.getByRole("button", { name: "Add +1 Shield" }).click();
  }
  await page.keyboard.press("Escape");
  await expect(chip).toHaveAccessibleName(`${ally}: 3 +1 Shield tokens. Show controls`);
  await expect(page.getByRole("button", { name: /\+1 Shield token/ })).toHaveCount(1);

  // The Map shows it read-only in the team status panel.
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("3 +1 Shield tokens", { exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "Board" }).click();
  await expect(chip).toHaveAccessibleName(`${ally}: 3 +1 Shield tokens. Show controls`);

  await page.reload();
  await expect(chip).toHaveAccessibleName(`${ally}: 3 +1 Shield tokens. Show controls`);

  // Neither the shielded hero's defeat nor Cyrus's clears it.
  for (const hero of [ally, "Cyrus"]) {
    const decreaseHp = page.getByRole("button", { name: `Decrease ${hero} HP` });
    while (await decreaseHp.isEnabled()) {
      await decreaseHp.click();
    }
    await expect(page.getByLabel(`${hero} HP`, { exact: true })).toHaveValue("0");
  }
  await expect(chip).toHaveAccessibleName(`${ally}: 3 +1 Shield tokens. Show controls`);

  // Stepping to 0 removes the chip once its stepper closes, on both screens.
  await chip.click();
  const remove = page.getByRole("button", { name: `Remove +1 Shield token from ${ally}` });
  for (let i = 0; i < 3; i++) {
    await remove.click();
  }
  await page.keyboard.press("Escape");
  await expect(chip).toHaveCount(0);
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel(/\+1 Shield token/)).toHaveCount(0);
});
