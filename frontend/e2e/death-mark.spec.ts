import { test, expect } from "@playwright/test";

test("Death Mark is offered only on Kunoichi's enemies, and survives a Board/Map switch, reload and either hero's defeat", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();

  // Kunoichi first, then the same deterministic completion as
  // draft-to-battle.spec.ts. The coin flip decides her side, so her enemies
  // are found below rather than assumed.
  await page.getByRole("button", { name: "Pick Kunoichi, Assassin" }).click();
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 7; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();

  // Exactly the 4 heroes on the other team are offered Death Mark;
  // Kunoichi and her allies aren't.
  const addButtons = page.getByRole("button", { name: /^Add a token to / });
  await expect(addButtons).toHaveCount(8);
  const enemies: string[] = [];
  const allies: string[] = [];
  for (let i = 0; i < 8; i++) {
    const label = (await addButtons.nth(i).getAttribute("aria-label"))!;
    const name = label.slice("Add a token to ".length);
    await addButtons.nth(i).click();
    const picker = page.getByRole("group", { name: label });
    await expect(picker.getByRole("button", { name: /^Add \+1 Attack/ })).toBeVisible();
    const offered = await picker.getByRole("button", { name: "Add Death Mark" }).count();
    (offered === 1 ? enemies : allies).push(name);
    await page.keyboard.press("Escape");
  }
  expect(enemies).toHaveLength(4);
  expect(allies).toContain("Kunoichi");
  expect(allies).toHaveLength(4);

  const enemy = enemies[0];
  const mark = page.getByRole("button", { name: `Death Mark token on ${enemy}` });

  // Marked through the "+" picker, and only that hero.
  await page.getByRole("button", { name: `Add a token to ${enemy}` }).click();
  await page
    .getByRole("group", { name: `Add a token to ${enemy}` })
    .getByRole("button", { name: "Add Death Mark" })
    .click();
  await page.keyboard.press("Escape");
  await expect(mark).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^Death Mark token on / })).toHaveCount(1);

  // The Map shows it read-only in the team status panel.
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Death Mark", { exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "Board" }).click();
  await expect(mark).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(mark).toHaveAttribute("aria-pressed", "true");

  // Neither the marked hero's defeat nor Kunoichi's clears it.
  for (const hero of [enemy, "Kunoichi"]) {
    const decreaseHp = page.getByRole("button", { name: `Decrease ${hero} HP` });
    while (await decreaseHp.isEnabled()) {
      await decreaseHp.click();
    }
    await expect(page.getByLabel(`${hero} HP`, { exact: true })).toHaveValue("0");
  }
  await expect(mark).toHaveAttribute("aria-pressed", "true");

  // A tap on the chip removes it, on both screens.
  await mark.click();
  await expect(mark).toHaveCount(0);
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Death Mark", { exact: true })).toHaveCount(0);
});
