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

  // Every hero card has a collapsed chip at 0. Read the first two heroes'
  // names off their toggles rather than hardcoding the draft order.
  const toggles = page.getByRole("button", { name: /: \d \+1 Attack tokens?\. / });
  await expect(toggles).toHaveCount(8);
  const nameOf = async (index: number) => {
    const label = await toggles.nth(index).getAttribute("aria-label");
    return label!.slice(0, label!.indexOf(":"));
  };
  const hero = await nameOf(0);
  const other = await nameOf(1);

  const heroToggle = page.getByRole("button", { name: new RegExp(`^${hero}: \\d`) });
  const otherToggle = page.getByRole("button", { name: new RegExp(`^${other}: \\d`) });
  await expect(heroToggle).toHaveAccessibleName(`${hero}: 0 +1 Attack tokens. Show controls`);

  // Three taps on +, one on −, without the chip closing in between.
  await heroToggle.click();
  await expect(heroToggle).toHaveAttribute("aria-expanded", "true");
  const add = page.getByRole("button", { name: `Add +1 Attack token to ${hero}` });
  for (let i = 0; i < 3; i++) {
    await add.click();
  }
  await page.getByRole("button", { name: `Remove +1 Attack token from ${hero}` }).click();
  await expect(heroToggle).toHaveAccessibleName(`${hero}: 2 +1 Attack tokens. Hide controls`);
  await expect(heroToggle).toHaveText("×2");

  // Opening another hero's chip closes the first, in one tap.
  await otherToggle.click();
  await expect(otherToggle).toHaveAttribute("aria-expanded", "true");
  await expect(heroToggle).toHaveAttribute("aria-expanded", "false");

  // Escape closes it.
  await page.keyboard.press("Escape");
  await expect(otherToggle).toHaveAttribute("aria-expanded", "false");

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
