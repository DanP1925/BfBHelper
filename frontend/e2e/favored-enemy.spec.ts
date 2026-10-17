import { test, expect } from "@playwright/test";

test("Favored Enemy is offered only on Boreas's enemies, on one at a time, and survives a Board/Map switch, reload and either hero's defeat", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start Draft" }).click();

  // Boreas first, then the same deterministic completion as
  // draft-to-battle.spec.ts. The coin flip decides his side, so his enemies
  // are found below rather than assumed.
  await page.getByRole("button", { name: "Pick Boreas, Hunter" }).click();
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 7; i++) {
    await pickButton.first().click();
  }
  await expect(page.getByText("Draft Complete")).toBeVisible();
  await page.getByRole("button", { name: "Start Battle →" }).click();

  const addButtons = page.getByRole("button", { name: /^Add a token to / });
  await expect(addButtons).toHaveCount(8);

  /** Every hero whose "+" picker lists Favored Enemy right now. */
  async function heroesOffered(): Promise<string[]> {
    const offered: string[] = [];
    for (let i = 0; i < 8; i++) {
      const label = (await addButtons.nth(i).getAttribute("aria-label"))!;
      await addButtons.nth(i).click();
      const picker = page.getByRole("group", { name: label });
      await expect(picker.getByRole("button", { name: "Add +1 Attack" })).toBeVisible();
      if ((await picker.getByRole("button", { name: "Add Favored Enemy" }).count()) === 1) {
        offered.push(label.slice("Add a token to ".length));
      }
      await page.keyboard.press("Escape");
    }
    return offered;
  }

  // Exactly the 4 heroes on the other team are offered it; Boreas's own
  // team, Boreas included, isn't.
  const enemies = await heroesOffered();
  expect(enemies).toHaveLength(4);
  expect(enemies).not.toContain("Boreas");

  const [enemy, otherEnemy] = enemies;
  const chip = page.getByRole("button", { name: `Favored Enemy token on ${enemy}` });

  await page.getByRole("button", { name: `Add a token to ${enemy}` }).click();
  await page
    .getByRole("group", { name: `Add a token to ${enemy}` })
    .getByRole("button", { name: "Add Favored Enemy" })
    .click();
  await page.keyboard.press("Escape");
  await expect(chip).toHaveAttribute("aria-pressed", "true");

  // Held by one enemy, so no picker offers it any more.
  expect(await heroesOffered()).toEqual([]);

  // The Map shows it read-only in the team status panel.
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Favored Enemy", { exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "Board" }).click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(chip).toHaveAttribute("aria-pressed", "true");

  // Neither the marked hero's defeat nor Boreas's clears it.
  for (const hero of [enemy, "Boreas"]) {
    const decreaseHp = page.getByRole("button", { name: `Decrease ${hero} HP` });
    while (await decreaseHp.isEnabled()) {
      await decreaseHp.click();
    }
    await expect(page.getByLabel(`${hero} HP`, { exact: true })).toHaveValue("0");
  }
  await expect(chip).toHaveAttribute("aria-pressed", "true");

  // A tap removes it, on both screens, and then any enemy can take it.
  await chip.click();
  await expect(chip).toHaveCount(0);
  expect(await heroesOffered()).toEqual(enemies);
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Favored Enemy", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Board" }).click();
  await page.getByRole("button", { name: `Add a token to ${otherEnemy}` }).click();
  await page
    .getByRole("group", { name: `Add a token to ${otherEnemy}` })
    .getByRole("button", { name: "Add Favored Enemy" })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: `Favored Enemy token on ${otherEnemy}` }),
  ).toHaveAttribute("aria-pressed", "true");
});
