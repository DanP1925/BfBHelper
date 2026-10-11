import { test, expect } from "@playwright/test";

test("Confuse toggles on and off, and survives a Board/Map switch, reload and defeat", async ({
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

  // Every hero card has a Confuse toggle, off. Read the first hero's name
  // off its label rather than hardcoding the draft order.
  const toggles = page.getByRole("button", { name: /^Confuse token on / });
  await expect(toggles).toHaveCount(8);
  for (let i = 0; i < 8; i++) {
    await expect(toggles.nth(i)).toHaveAttribute("aria-pressed", "false");
  }
  const label = await toggles.first().getAttribute("aria-label");
  const hero = label!.slice("Confuse token on ".length);
  const heroToggle = page.getByRole("button", { name: `Confuse token on ${hero}` });

  // One tap turns it on, and only for that hero.
  await heroToggle.click();
  await expect(heroToggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggles.nth(1)).toHaveAttribute("aria-pressed", "false");

  // The Map shows it read-only in the team status panel.
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Confused")).toHaveCount(1);

  await page.getByRole("button", { name: "Board" }).click();
  await expect(heroToggle).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(heroToggle).toHaveAttribute("aria-pressed", "true");

  // Defeat (HP to 0) doesn't clear it.
  const decreaseHp = page.getByRole("button", { name: `Decrease ${hero} HP` });
  while (await decreaseHp.isEnabled()) {
    await decreaseHp.click();
  }
  await expect(page.getByLabel(`${hero} HP`, { exact: true })).toHaveValue("0");
  await expect(heroToggle).toHaveAttribute("aria-pressed", "true");

  // Another tap turns it off, on both screens.
  await heroToggle.click();
  await expect(heroToggle).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Confused")).toHaveCount(0);
});
