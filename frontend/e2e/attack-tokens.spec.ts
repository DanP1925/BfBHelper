import { test, expect } from "@playwright/test";

test("+1 Attack tokens count up and down, stay one-open, and survive a Board/Map switch, reload and defeat", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();

  // Same deterministic 8-pick completion as draft-to-battle.spec.ts.
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 8; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();

  // Every hero card has a "+" and no chip yet. Read the first two heroes'
  // names off their "+" rather than hardcoding the draft order.
  const addButtons = page.getByRole("button", { name: /^Add a token to / });
  await expect(addButtons).toHaveCount(8);
  const nameOf = async (index: number) => {
    const label = await addButtons.nth(index).getAttribute("aria-label");
    return label!.slice("Add a token to ".length);
  };
  const hero = await nameOf(0);
  const other = await nameOf(1);

  const heroToggle = page.getByRole("button", { name: new RegExp(`^${hero}: \\d`) });
  await expect(heroToggle).toHaveCount(0);

  // Three tokens in one open of the picker (intent/09), which stays open.
  await page.getByRole("button", { name: `Add a token to ${hero}` }).click();
  const heroPicker = page.getByRole("group", { name: `Add a token to ${hero}` });
  for (let i = 0; i < 3; i++) {
    await heroPicker.getByRole("button", { name: /^Add \+1 Attack/ }).click();
  }
  await expect(heroPicker.getByRole("button", { name: "Add +1 Attack, 3 held" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(heroPicker).toHaveCount(0);

  // One tap on − in the chip's stepper.
  await heroToggle.click();
  await expect(heroToggle).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: `Remove +1 Attack token from ${hero}` }).click();
  await expect(heroToggle).toHaveAccessibleName(`${hero}: 2 +1 Attack tokens. Hide controls`);
  await expect(heroToggle).toHaveText("×2");

  // Opening another hero's picker closes the chip, in one tap.
  await page.getByRole("button", { name: `Add a token to ${other}` }).click();
  const otherPicker = page.getByRole("group", { name: `Add a token to ${other}` });
  await expect(otherPicker).toBeVisible();
  await expect(heroToggle).toHaveAttribute("aria-expanded", "false");

  // Escape closes it.
  await page.keyboard.press("Escape");
  await expect(otherPicker).toHaveCount(0);

  // The Map shows the count read-only in the team status panel.
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("2 +1 Attack tokens")).toBeVisible();

  await page.getByRole("button", { name: "Board" }).click();
  await expect(heroToggle).toHaveAccessibleName(`${hero}: 2 +1 Attack tokens. Show controls`);

  await page.reload();
  await expect(heroToggle).toHaveAccessibleName(`${hero}: 2 +1 Attack tokens. Show controls`);

  // Defeat (HP to 0) doesn't clear tokens.
  const decreaseHp = page.getByRole("button", { name: `Decrease ${hero} HP` });
  while (await decreaseHp.isEnabled()) {
    await decreaseHp.click();
  }
  await expect(page.getByLabel(`${hero} HP`, { exact: true })).toHaveValue("0");
  await expect(heroToggle).toHaveAccessibleName(`${hero}: 2 +1 Attack tokens. Show controls`);
});
