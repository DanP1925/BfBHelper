import { test, expect, type Page } from "@playwright/test";

function roleOption(page: Page, label: string) {
  return page
    .getByRole("group", { name: "Filter heroes by role" })
    .getByRole("button", { name: new RegExp(`^${label} \\d+$`) });
}

async function expectActiveRole(page: Page, label: string) {
  await expect(roleOption(page, label)).toHaveAttribute("aria-pressed", "true");
}

test("the role filter narrows the draft pool and goes back to All when the turn passes (intent/23)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start Draft" }).click();

  const subtitle = await page.getByText(/^Initiative: Player [12]$/).textContent();
  const first = subtitle?.endsWith("1") ? "Player 1" : "Player 2";
  const second = first === "Player 1" ? "Player 2" : "Player 1";
  const poolCards = page.getByRole("button", { name: /^Pick / });

  // The draft starts on All, with every role's count.
  await expectActiveRole(page, "All");
  await expect(roleOption(page, "All")).toHaveAccessibleName("All 19");
  await expect(roleOption(page, "Damage")).toHaveAccessibleName("Damage 8");
  await expect(roleOption(page, "Utility")).toHaveAccessibleName("Utility 8");
  await expect(roleOption(page, "Support")).toHaveAccessibleName("Support 3");
  await expect(poolCards).toHaveCount(19);

  // The initiative player picks Caligar.
  await page.getByRole("button", { name: "Pick Caligar, Cleric" }).click();
  await expect(page.getByText(`${second} — pick 2 more heroes`)).toBeVisible();

  // The other player filters Support: only Baldwin and Cyrus are left.
  await roleOption(page, "Support").click();
  await expectActiveRole(page, "Support");
  await expect(poolCards).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Pick Baldwin, Bard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pick Cyrus, Paladin" })).toBeVisible();

  // They pick Cyrus; the filter stays on Support for their second pick.
  await page.getByRole("button", { name: "Pick Cyrus, Paladin" }).click();
  await expectActiveRole(page, "Support");
  await expect(poolCards).toHaveCount(1);

  // Then Damage, and Sterling.
  await roleOption(page, "Damage").click();
  await expect(poolCards).toHaveCount(8);
  await page.getByRole("button", { name: "Pick Sterling, Archer" }).click();

  // The turn passes back, so the filter is on All again.
  await expect(page.getByText(`${first} — pick 2 more heroes`)).toBeVisible();
  await expectActiveRole(page, "All");
  await expect(roleOption(page, "Support")).toHaveAccessibleName("Support 1");
  await expect(roleOption(page, "Damage")).toHaveAccessibleName("Damage 7");
  await expect(poolCards).toHaveCount(16);

  // A chosen filter isn't saved: a reload resumes the draft on All.
  await roleOption(page, "Utility").click();
  await expect(poolCards).toHaveCount(8);
  await page.reload();
  await expect(page.getByText(`${first} — pick 2 more heroes`)).toBeVisible();
  await expectActiveRole(page, "All");
  await expect(poolCards).toHaveCount(16);

  // Once Baldwin is drafted, Support has none left and can't be chosen.
  await page.getByRole("button", { name: "Pick Baldwin, Bard" }).click();
  await expect(roleOption(page, "Support")).toHaveAccessibleName("Support 0");
  await expect(roleOption(page, "Support")).toBeDisabled();
});
