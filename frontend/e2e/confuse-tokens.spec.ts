import { test, expect } from "@playwright/test";

test("Confuse is added and removed, and survives a Board/Map switch, reload and defeat", async ({
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

  // No hero holds Confuse yet. Read the first hero's name off its "+"
  // rather than hardcoding the draft order.
  const toggles = page.getByRole("button", { name: /^Confuse token on / });
  await expect(toggles).toHaveCount(0);
  const label = await page
    .getByRole("button", { name: /^Add a token to / })
    .first()
    .getAttribute("aria-label");
  const hero = label!.slice("Add a token to ".length);
  const heroToggle = page.getByRole("button", { name: `Confuse token on ${hero}` });

  // Added through the "+" picker (intent/09), and only for that hero.
  await page.getByRole("button", { name: `Add a token to ${hero}` }).click();
  await page
    .getByRole("group", { name: `Add a token to ${hero}` })
    .getByRole("button", { name: "Add Confuse" })
    .click();
  await page.keyboard.press("Escape");
  await expect(heroToggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggles).toHaveCount(1);

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

  // A tap on the chip removes it, on both screens.
  await heroToggle.click();
  await expect(heroToggle).toHaveCount(0);
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Confused")).toHaveCount(0);
});
