import { test, expect, type Page } from "@playwright/test";

/** Starts a draft and makes all 8 picks, taking the first card each time. */
async function draftEightHeroes(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start Draft" }).click();
  const pickButton = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 8; i++) {
    await pickButton.first().click();
  }
}

/** Draft Results' title. Exact, since the Draft Board's banner reads "Draft
 * complete" and getByText ignores case by default. */
function draftResultsTitle(page: Page) {
  return page.getByText("Draft Complete", { exact: true });
}

test("the draft ends on a versus entrance that a tap skips, and a reload doesn't replay it", async ({
  page,
}) => {
  await draftEightHeroes(page);

  // The last hero lands on the Draft Board, then Draft Results plays its entrance.
  await expect(draftResultsTitle(page)).toBeVisible();
  const skip = page.getByRole("button", { name: "Skip intro" });
  await expect(skip).toBeVisible();
  await expect(page.getByText("VS", { exact: true })).toBeVisible();

  await skip.click();
  await expect(skip).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start Battle →" })).toBeFocused();

  await page.reload();
  await expect(draftResultsTitle(page)).toBeVisible();
  await expect(page.getByText("VS", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip intro" })).toHaveCount(0);

  await page.getByRole("button", { name: "Start Battle →" }).click();
  await expect(page.getByText("Structures")).toHaveCount(2);
});

test.describe("with the OS reduce motion setting on", () => {
  test.use({ reducedMotion: "reduce" });

  test("the draft ends straight on a settled Draft Results", async ({ page }) => {
    await draftEightHeroes(page);

    await expect(draftResultsTitle(page)).toBeVisible();
    await expect(page.getByText("VS", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Skip intro" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Start Battle →" })).toBeVisible();
  });
});
