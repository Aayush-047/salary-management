import { expect, test, type Page } from "@playwright/test";

/*
 * Smoke test of the employee list against the deterministic seed (seed 42, 10,000 people),
 * so exact numbers can be asserted.
 */

const summary = (page: Page) => page.getByText(/^Showing .* employees$/);
const rows = (page: Page) => page.locator("table tbody tr");
const firstRowCode = (page: Page) => rows(page).first().locator("td").first();

/**
 * Picks values in one of the filter modal's multi-selects the way a user does: open the list
 * once, click each value (the list stays open between picks), then close it with Escape.
 */
async function pick(page: Page, label: string, values: string[]) {
  const dialog = page.getByRole("dialog", { name: "Filter employees" });
  const box = dialog.getByRole("combobox", { name: label });
  await box.click();
  for (const value of values) {
    await page.getByRole("option", { name: value }).click();
  }
  await box.press("Escape");
  await expect(dialog).toBeVisible(); // Escape closed the list, not the modal
}

test.beforeEach(async ({ page }) => {
  await page.goto("/employees");
  await expect(summary(page)).toHaveText("Showing 1–25 of 9,436 employees");
});

test("shows the first page of active employees by default", async ({ page }) => {
  await expect(rows(page)).toHaveCount(25);
  await expect(page.getByLabel(/filters applied/)).toHaveCount(0);
});

test("searches by name with a spinner, and keeps the search in the URL", async ({ page }) => {
  const search = page.getByLabel("Search employees");
  await search.pressSequentially("schmi");

  await expect(page.getByLabel("Searching")).toBeVisible();
  await expect(summary(page)).toHaveText("Showing 1–25 of 72 employees");
  await expect(page.getByLabel("Searching")).toBeHidden();
  await expect(page).toHaveURL(/search=schmi/);
});

test("applies filters from the modal and resets them", async ({ page }) => {
  await page.getByRole("button", { name: /Filters/ }).click();
  const dialog = page.getByRole("dialog", { name: "Filter employees" });

  await pick(page, "Country", ["Germany", "United Kingdom"]);
  await pick(page, "Level", ["L5", "L6"]);
  await dialog.getByRole("button", { name: "Apply" }).click();

  await expect(dialog).toBeHidden();
  await expect(summary(page)).toHaveText("Showing 1–25 of 375 employees");
  await expect(page.getByLabel("4 filters applied")).toBeVisible();
  await expect(page).toHaveURL(/country=DE&country=GB&level=5&level=6/);

  await page.getByRole("button", { name: /Filters/ }).click();
  await dialog.getByRole("button", { name: "Reset" }).click();
  await dialog.getByRole("button", { name: "Apply" }).click();

  await expect(summary(page)).toHaveText("Showing 1–25 of 9,436 employees");
  await expect(page).toHaveURL(/\/employees$/);
});

test("sorts by total cash, highest first", async ({ page }) => {
  await page.getByRole("button", { name: /Sort by Total cash/ }).click(); // ascending
  await page.getByRole("button", { name: /Sort by Total cash/ }).click(); // descending

  await expect(page).toHaveURL(/sortBy=totalCash&sortDir=desc/);
  await expect(firstRowCode(page)).toHaveText("E05244");
});

test("pages forward and back with the browser history", async ({ page }) => {
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(summary(page)).toHaveText("Showing 26–50 of 9,436 employees");
  await expect(page).toHaveURL(/page=2/);

  await page.goBack();
  await expect(summary(page)).toHaveText("Showing 1–25 of 9,436 employees");
});

test("reproduces a shared link exactly", async ({ page }) => {
  await page.goto("/employees?country=DE&country=GB&level=5&level=6&sortBy=totalCash&sortDir=desc");

  await expect(summary(page)).toHaveText("Showing 1–25 of 375 employees");
  await expect(page.getByLabel("4 filters applied")).toBeVisible();
  await expect(page.getByRole("button", { name: /Sort by Total cash/ })).toContainText("▼");
});
