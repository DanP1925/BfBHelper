import { test, expect } from "@playwright/test";

// The 13.3" laptop baseline (CLAUDE.md's Testing section).
test.use({ viewport: { width: 1280, height: 800 } });

test("the token row shows only held tokens and a '+' picker that stays open, inside the viewport, and survives a Board/Map switch and reload", async ({
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

  // A fresh battle: every card shows just its "+", no chips.
  const addButtons = page.getByRole("button", { name: /^Add a token to / });
  await expect(addButtons).toHaveCount(8);
  await expect(page.getByRole("button", { name: /\+1 Attack tokens?\. / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^(Confuse token|Immobilized) on / })).toHaveCount(
    0,
  );

  // Every picker opens fully inside the viewport, flipping above the "+" on
  // the bottom-row cards, and never scrolls the page or the Board.
  for (let i = 0; i < 8; i++) {
    const label = (await addButtons.nth(i).getAttribute("aria-label"))!;
    await addButtons.nth(i).click();
    const box = await page.getByRole("group", { name: label }).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1280);
    expect(box!.y + box!.height).toBeLessThanOrEqual(800);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("group", { name: label })).toHaveCount(0);
  }
  const scrolled = await page.evaluate(() =>
    [document.scrollingElement!, ...document.querySelectorAll("*")].some(
      (element) => element.scrollTop > 0,
    ),
  );
  expect(scrolled).toBe(false);

  const hero = (await addButtons.first().getAttribute("aria-label"))!.slice(
    "Add a token to ".length,
  );
  const attackChip = page.getByRole("button", { name: new RegExp(`^${hero}: \\d`) });
  const confuseChip = page.getByRole("button", { name: `Confuse token on ${hero}` });
  const immobilizeChip = page.getByRole("button", { name: `Immobilized on ${hero}` });

  // Three +1 Attack, Confuse and Immobilize, all in one open of the picker.
  await page.getByRole("button", { name: `Add a token to ${hero}` }).click();
  const picker = page.getByRole("group", { name: `Add a token to ${hero}` });
  for (let i = 0; i < 3; i++) {
    await picker.getByRole("button", { name: /^Add \+1 Attack/ }).click();
  }
  await picker.getByRole("button", { name: "Add Confuse" }).click();
  await picker.getByRole("button", { name: "Add Immobilize" }).click();
  // Held on/off tokens drop out; +1 Attack stays, with no count (intent/11).
  // Not a row count: these 8 heroes include Cyrus, and the coin flip decides
  // whether this hero is on his team and also keeps "+1 Shield".
  await expect(picker.getByRole("button", { name: "Add Confuse" })).toHaveCount(0);
  await expect(picker.getByRole("button", { name: "Add Immobilize" })).toHaveCount(0);
  await expect(picker.getByRole("button", { name: "Add +1 Attack" })).toBeVisible();
  await expect(picker).not.toContainText("×");

  // A tap outside closes it.
  await page.getByText("Structures").first().click();
  await expect(picker).toHaveCount(0);
  await expect(attackChip).toHaveText("×3");
  await expect(confuseChip).toBeVisible();
  await expect(immobilizeChip).toBeVisible();

  // The row survives a Board/Map switch and a reload.
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Board" }).click();
  await expect(attackChip).toHaveText("×3");
  await page.reload();
  await expect(attackChip).toHaveText("×3");
  await expect(confuseChip).toBeVisible();
  await expect(immobilizeChip).toBeVisible();

  // One tap removes an on/off chip; it's back in the picker.
  await confuseChip.click();
  await expect(confuseChip).toHaveCount(0);
  await page.getByRole("button", { name: `Add a token to ${hero}` }).click();
  await expect(picker.getByRole("button", { name: "Add Confuse" })).toBeVisible();
});
